/**
 * VIVIM Deep-Research Engine — Fleet Dispatcher (v2.0.0)
 *
 * v1 had agent_roles.count_ratio in framework.json (generator 0.20, extender
 * 0.20, validator 0.20, literature 0.15, synthesizer 0.05, blindspot 0.05)
 * but NOTHING that reads those ratios and actually spawns agents in that
 * mix. It was documentation of an intent, not a mechanism.
 *
 * This dispatcher:
 *   1. Computes a concrete fleet composition from a target agent count.
 *   2. Runs agents concurrently with a concurrency cap (avoids the
 *      unbounded-fanout failure mode that burns budget fast).
 *   3. Feeds each agent's result back through ResearchEngine so the state
 *      machine's invariants (verification criteria, evidence chain,
 *      budget) apply uniformly whether a human or a subagent produced it.
 *   4. Is transport-agnostic: `invoke` is injected, so this same dispatcher
 *      works against the Anthropic API directly, Claude Code subagents, or
 *      a mocked function in tests.
 */

import { ResearchEngine, AgentRole, Candidate, ReproResult, FrameworkConfig } from "./engine";

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
  // Structured extraction — a real implementation parses `raw` (e.g. via a
  // JSON-mode completion, see anthropic_api_in_artifacts structured-output
  // pattern) into one of these shapes depending on role.
  candidate?: Omit<Candidate, "id" | "createdAt" | "status">;
  repro?: ReproResult;
  budgetPercentUsed: number;
}

export interface FleetComposition {
  role: AgentRole;
  count: number;
}

const MAX_CONCURRENCY = 6; // conservative default; override via FleetOptions

export interface FleetOptions {
  totalAgents: number;
  concurrency?: number;
  phase: "generation" | "validation" | "synthesis";
}

/**
 * Turns framework.json's agent_roles ratios into a concrete integer
 * headcount for this run, guaranteeing the counts sum to totalAgents
 * (largest-remainder method — avoids the classic bug where naive rounding
 * of ratios like 0.20/0.20/0.20/0.15/0.05/0.05 drops or duplicates agents).
 */
export function computeFleetComposition(
  config: FrameworkConfig,
  totalAgents: number,
): FleetComposition[] {
  const roles = Object.entries(config.agent_roles) as [AgentRole, { count_ratio: number }][];
  const raw = roles.map(([role, cfg]) => ({
    role,
    exact: cfg.count_ratio * totalAgents,
  }));
  const floored = raw.map((r) => ({ role: r.role, count: Math.floor(r.exact), remainder: r.exact - Math.floor(r.exact) }));
  let allocated = floored.reduce((s, r) => s + r.count, 0);
  let deficit = totalAgents - allocated;

  // Distribute leftover seats to the roles with the largest fractional remainder
  const byRemainder = [...floored].sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < deficit; i++) {
    byRemainder[i % byRemainder.length].count += 1;
  }

  return floored.map(({ role, count }) => ({ role, count }));
}

/**
 * Runs a bounded-concurrency pool of agent invocations, feeding every result
 * through the ResearchEngine so budget/verification/evidence invariants are
 * enforced identically to manual mode. If the engine locks (budget hard
 * stop) mid-fleet, in-flight tasks finish but no new tasks are dispatched.
 */
export async function runFleet(
  engine: ResearchEngine,
  config: FrameworkConfig,
  invoke: AgentInvocation,
  options: FleetOptions,
  buildPrompt: (role: AgentRole) => string,
): Promise<{ succeeded: AgentResult[]; failed: { task: AgentTask; error: string }[]; locked: boolean }> {
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
  let locked = false;

  async function worker() {
    while (queue.length > 0) {
      if (engine.getBudgetStatus().locked) {
        locked = true;
        return;
      }
      const task = queue.shift();
      if (!task) return;
      try {
        const result = await invoke(task);

        // Budget is spent regardless of whether the result was usable —
        // the API call happened and cost tokens either way.
        engine.spendBudget(
          options.phase,
          task.role,
          result.budgetPercentUsed,
          `fleet dispatch: ${task.role}`,
        );

        if (result.candidate) {
          engine.proposeCandidate(result.candidate);
        }
        if (result.repro) {
          engine.recordRepro(result.repro);
        }
        succeeded.push(result);
      } catch (err) {
        failed.push({ task, error: err instanceof Error ? err.message : String(err) });
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, () => worker());
  await Promise.all(workers);

  return { succeeded, failed, locked };
}
