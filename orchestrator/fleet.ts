import { AgentRole, Candidate, FrameworkConfig, ReproResult, ResearchEngine } from "./engine";
export interface AgentTask { role: AgentRole; prompt: string; masterPromptPath: string; }
export interface AgentInvocation { (task: AgentTask): Promise<AgentResult>; }
export interface AgentResult { role: AgentRole; raw: string; candidate?: Omit<Candidate, "id" | "createdAt" | "status">; repro?: ReproResult; estimatedTokens?: number; }
export interface FleetComposition { role: AgentRole; count: number; }
export interface FleetOptions { totalAgents: number; concurrency?: number; phase: "generation" | "validation" | "synthesis"; checkpointBrief?: string; }
export function computeFleetComposition(config: FrameworkConfig, totalAgents: number): FleetComposition[] {
  if (!Number.isInteger(totalAgents) || totalAgents < 1) throw new RangeError("totalAgents must be a positive integer");
  const roles = Object.entries(config.agent_roles) as [AgentRole, { count_ratio: number }][];
  const ratioSum = roles.reduce((n, [, r]) => n + r.count_ratio, 0); if (ratioSum <= 0) throw new RangeError("agent role ratios must contain a positive total");
  const base = roles.map(([role, r]) => { const exact = (r.count_ratio / ratioSum) * totalAgents; return { role, count: Math.floor(exact), remainder: exact - Math.floor(exact) }; });
  let remaining = totalAgents - base.reduce((n, r) => n + r.count, 0);
  [...base].sort((a, b) => b.remainder - a.remainder).forEach(r => { if (remaining > 0) { r.count++; remaining--; } });
  return base.map(({ role, count }) => ({ role, count }));
}
export async function runFleet(engine: ResearchEngine, config: FrameworkConfig, invoke: AgentInvocation, options: FleetOptions, buildPrompt: (role: AgentRole) => string) {
  const composition = computeFleetComposition(config, options.totalAgents); const queue: AgentTask[] = composition.flatMap(({ role, count }) => Array.from({ length: count }, () => ({ role, prompt: buildPrompt(role), masterPromptPath: config.agent_roles[role].master_path })));
  const concurrency = Math.max(1, Math.min(options.concurrency ?? 6, queue.length)); const succeeded: AgentResult[] = []; const failed: { task: AgentTask; error: string }[] = []; let stopDispatch = false;
  async function worker() { while (!stopDispatch) { const task = queue.shift(); if (!task) return; try { const result = await invoke(task); await engine.serialize(async () => { const pressure = engine.recordAction(result.estimatedTokens ?? 0); if (result.candidate) engine.proposeCandidate(result.candidate); if (result.repro) engine.recordRepro(result.repro); if (pressure.checkpointRequired) stopDispatch = true; }); succeeded.push(result); } catch (err) { failed.push({ task, error: err instanceof Error ? err.message : String(err) }); } } }
  await Promise.all(Array.from({ length: concurrency }, worker));
  let checkpoint: ReturnType<ResearchEngine["writeCheckpoint"]> | undefined;
  if (stopDispatch && options.checkpointBrief) checkpoint = engine.writeCheckpoint(options.checkpointBrief);
  return { succeeded, failed, checkpoint, remainingTasks: queue.length, checkpointRequired: stopDispatch };
}
