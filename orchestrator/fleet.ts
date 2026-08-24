import { ResearchEngine, AgentRole, Candidate, ReproResult, FrameworkConfig, Checkpoint } from "./engine";

export interface AgentTask { role: AgentRole; prompt: string; masterPromptPath: string; }
export interface AgentInvocation { (task: AgentTask): Promise<AgentResult>; }
export interface AgentResult { role: AgentRole; raw: string; candidate?: Omit<Candidate, "id" | "createdAt" | "status">; repro?: ReproResult; tokensUsed?: number; }
export interface FleetComposition { role: AgentRole; count: number; }
const MAX_CONCURRENCY = 6;
export interface FleetOptions { totalAgents: number; concurrency?: number; phase: "generation" | "validation" | "synthesis"; buildResumeBrief: (progress: { reason: Checkpoint["reason"]; completedThisRun: AgentResult[]; remainingQueueSize: number; phase: FleetOptions["phase"] }) => string; }

export function computeFleetComposition(config: FrameworkConfig, totalAgents: number): FleetComposition[] {
  if (!Number.isInteger(totalAgents) || totalAgents < 0) throw new Error("totalAgents must be a non-negative integer");
  const roles = Object.entries(config.agent_roles) as [AgentRole, { count_ratio: number }][];
  const sum = roles.reduce((n, [, r]) => n + r.count_ratio, 0);
  if (Math.abs(sum - 1) > 1e-9) throw new Error(`agent_roles ratios must sum to 1.0; got ${sum}`);
  const raw = roles.map(([role, cfg]) => ({ role, exact: cfg.count_ratio * totalAgents }));
  const allocated = raw.map(r => ({ role: r.role, count: Math.floor(r.exact), remainder: r.exact - Math.floor(r.exact) }));
  let deficit = totalAgents - allocated.reduce((n, r) => n + r.count, 0);
  [...allocated].sort((a, b) => b.remainder - a.remainder || roles.findIndex(([r]) => r === a.role) - roles.findIndex(([r]) => r === b.role)).forEach(r => { if (deficit > 0) { r.count++; deficit--; } });
  return allocated.map(({ role, count }) => ({ role, count }));
}

export interface FleetRunOutcome { succeeded: AgentResult[]; failed: { task: AgentTask; error: string }[]; checkpointedWithRemainingWork: boolean; checkpoint: Checkpoint | null; }

export async function runFleet(engine: ResearchEngine, config: FrameworkConfig, invoke: AgentInvocation, options: FleetOptions, buildPrompt: (role: AgentRole) => string): Promise<FleetRunOutcome> {
  const composition = computeFleetComposition(config, options.totalAgents);
  const progress = engine.getState().fleetProgress;
  const queue: AgentTask[] = [];
  for (const { role, count } of composition) {
    const completed = progress.completedByRole[role] ?? 0;
    const failed = progress.failedTasks.filter(t => t.role === role).length;
    const remaining = Math.max(0, count - completed - failed);
    for (let i = 0; i < remaining; i++) queue.push({ role, prompt: buildPrompt(role), masterPromptPath: config.agent_roles[role].master_path });
  }
  const succeeded: AgentResult[] = []; const failed: { task: AgentTask; error: string }[] = []; let checkpointTriggered: Checkpoint["reason"] | null = null;
  const concurrency = Math.max(1, Math.min(options.concurrency ?? MAX_CONCURRENCY, Math.max(1, queue.length)));
  async function worker() {
    while (queue.length && !checkpointTriggered) {
      const task = queue.shift(); if (!task) return;
      try {
        const result = await invoke(task); const tokens = result.tokensUsed ?? Math.ceil(result.raw.length / 4) * 1.1;
        const signal = engine.recordAction(options.phase, task.role, tokens, `fleet dispatch: ${task.role}`);
        if (result.candidate) engine.proposeCandidate(result.candidate); if (result.repro) engine.recordRepro(result.repro); succeeded.push(result);
        const role = result.role; engine.getState().fleetProgress.completedByRole[role] = (engine.getState().fleetProgress.completedByRole[role] ?? 0) + 1;
        if (signal.checkpointRequired && !checkpointTriggered) checkpointTriggered = signal.reason;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err); failed.push({ task, error: message });
        engine.getState().fleetProgress.failedTasks.push({ ...task, error: message, recordedAt: new Date().toISOString() });
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const reason = checkpointTriggered ?? "manual";
  const checkpoint = engine.writeCheckpoint(reason, options.buildResumeBrief({ reason, completedThisRun: succeeded, remainingQueueSize: queue.length, phase: options.phase }));
  return { succeeded, failed, checkpointedWithRemainingWork: checkpointTriggered !== null && queue.length > 0, checkpoint };
}
