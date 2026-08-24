/**
 * VIVIM Deep-Research Engine — Fleet Dispatcher (v3.0.0)
 *
 * Rewritten alongside engine.ts's budget -> survivability redesign. The
 * dispatcher no longer "spends budget" per agent call — it records context
 * pressure per call, and when the engine reports a checkpoint is required,
 * the dispatcher STOPS DISPATCHING NEW WORK, drains in-flight tasks, and
 * writes a checkpoint before resuming. This is the actual mechanism that
 * lets a fleet run indefinitely across compactions: no task is ever
 * in-flight across a checkpoint boundary, so a checkpoint is always a
 * clean cut, never a snapshot of half-done work.
 */

import {
  ResearchEngine,
  AgentRole,
  Candidate,
  ReproResult,
  FrameworkConfig,
  Checkpoint,
} from "./engine";

export interface AgentTask {
  role: AgentRole;
  prompt: string;
  masterPromptPath: string;
}

export interface AgentInvocation {
  (task: AgentTask): Promise<AgentResult>;
}

export interface AgentResult {
  role: AgentRole;
  raw: string;
  candidate?: Omit<Candidate, "id" | "createdAt" | "status">;
  repro?: ReproResult;
  /**
   * Exact token usage if the transport can report it (e.g. Anthropic API
   * usage.input_tokens + usage.output_tokens). Falls back to an estimate
   * from `raw`'s length if omitted — see TokenPressureTracker.
   */
  tokensUsed?: number;
}

export interface FleetComposition {
  role: AgentRole;
  count: number;
}

const MAX_CONCURRENCY = 6;

export interface FleetOptions {
  totalAgents: number;
  concurrency?: number;
  phase: "generation" | "validation" | "synthesis";
  /**
   * Builds the resume brief when a checkpoint fires mid-fleet. Given the
   * results gathered so far in THIS dispatch and the checkpoint reason,
   * return the plain-language brief a cold agent should read next. Callers
   * should summarize what's in flight and what's left in the queue, not
   * just restate counts.
   */
  buildResumeBrief: (progress: {
    reason: Checkpoint["reason"];
    completedThisRun: AgentResult[];
    remainingQueueSize: number;
    phase: FleetOptions["phase"];
  }) => string;
}

/** Largest-remainder allocation — unchanged from v2, this logic was correct. */
export function computeFleetComposition(config: FrameworkConfig, totalAgents: number): FleetComposition[] {
  const roles = Object.entries(config.agent_roles) as [AgentRole, { count_ratio: number }][];
  const raw = roles.map(([role, cfg]) => ({ role, exact: cfg.count_ratio * totalAgents }));
  const floored = raw.map((r) => ({ role: r.role, count: Math.floor(r.exact), remainder: r.exact - Math.floor(r.exact) }));
  const allocated = floored.reduce((s, r) => s + r.count, 0);
  const deficit = totalAgents - allocated;
  const byRemainder = [...floored].sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < deficit; i++) byRemainder[i % byRemainder.length].count += 1;
  return floored.map(({ role, count }) => ({ role, count }));
}

export interface FleetRunOutcome {
  succeeded: AgentResult[];
  failed: { task: AgentTask; error: string }[];
  /** True if a checkpoint fired and the queue still has undispatched work. */
  checkpointedWithRemainingWork: boolean;
  checkpoint: Checkpoint | null;
}

/**
 * Runs a bounded-concurrency pool. Unlike v2's runFleet (which stopped
 * dispatching once the engine LOCKED on budget), this version:
 *   1. Dispatches tasks normally, recording pressure via engine.recordAction
 *      after every completed call.
 *   2. The moment ANY completed call reports checkpointRequired: true, the
 *      dispatcher stops handing out new tasks from the queue.
 *   3. Waits for already-in-flight tasks (started before the checkpoint
 *      trigger) to finish — never truncates a task mid-flight.
 *   4. Writes one checkpoint summarizing this run's progress + what's left
 *      in the queue, so a fresh dispatch (same queue, same session root)
 *      picks up exactly where this one stopped.
 *
 * Callers are expected to re-invoke runFleet with the same session root
 * after a checkpoint — the ResearchEngine constructor resumes from the
 * latest checkpoint automatically, so a fresh process, fresh context, and
 * fresh runFleet() call is all that's needed to continue.
 */
export async function runFleet(
  engine: ResearchEngine,
  config: FrameworkConfig,
  invoke: AgentInvocation,
  options: FleetOptions,
  buildPrompt: (role: AgentRole) => string,
): Promise<FleetRunOutcome> {
  const composition = computeFleetComposition(config, options.totalAgents);
  const concurrency = options.concurrency ?? MAX_CONCURRENCY;

  const queue: AgentTask[] = composition.flatMap(({ role, count }) =>
    Array.from({ length: count }, () => ({
      role,
      prompt: buildPrompt(role),
      masterPromptPath: config.agent_roles[role].master_path,
    })),
  );

  const succeeded: AgentResult[] = [];
  const failed: { task: AgentTask; error: string }[] = [];
  let checkpointTriggered: Checkpoint["reason"] | null = null;

  async function worker() {
    while (queue.length > 0) {
      if (checkpointTriggered) return; // stop pulling new work once triggered
      const task = queue.shift();
      if (!task) return;
      try {
        const result = await invoke(task);
        const tokens = result.tokensUsed ?? Math.ceil(result.raw.length / 4) * 1.1;

        const { checkpointRequired, reason } = engine.recordAction(
          options.phase,
          task.role,
          tokens,
          `fleet dispatch: ${task.role}`,
        );

        if (result.candidate) engine.proposeCandidate(result.candidate);
        if (result.repro) engine.recordRepro(result.repro);
        succeeded.push(result);

        if (checkpointRequired && !checkpointTriggered) {
          checkpointTriggered = reason;
        }
      } catch (err) {
        failed.push({ task, error: err instanceof Error ? err.message : String(err) });
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, () => worker());
  await Promise.all(workers);

  let checkpoint: Checkpoint | null = null;
  if (checkpointTriggered) {
    const brief = options.buildResumeBrief({
      reason: checkpointTriggered,
      completedThisRun: succeeded,
      remainingQueueSize: queue.length,
      phase: options.phase,
    });
    checkpoint = engine.writeCheckpoint(checkpointTriggered, brief);
  }

  return {
    succeeded,
    failed,
    checkpointedWithRemainingWork: checkpointTriggered !== null && queue.length > 0,
    checkpoint,
  };
}
