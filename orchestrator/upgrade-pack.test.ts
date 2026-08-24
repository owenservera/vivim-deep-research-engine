import { test, expect } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ResearchEngine, FrameworkConfig } from "./engine";
import { computeFleetComposition, runFleet } from "./fleet";

const config = (session_id: string, actions = 25): FrameworkConfig => ({
  framework_version: "3.1.0-test",
  target_repo_path: "project/",
  session_id,
  survivability: { danger_zone_tokens: 1_000_000, checkpoint_margin_ratio: 0.8, max_actions_between_checkpoints: actions },
  agent_roles: {
    generator: { count_ratio: 0.20, master_path: "g.md" },
    extender: { count_ratio: 0.20, master_path: "e.md" },
    validator: { count_ratio: 0.15, master_path: "v.md" },
    literature: { count_ratio: 0.15, master_path: "l.md" },
    synthesizer: { count_ratio: 0.15, master_path: "s.md" },
    blindspot: { count_ratio: 0.15, master_path: "b.md" },
  },
  hazard_seed_ids: [],
});

test("objective completion survives a cold checkpoint resume", () => {
  const root = mkdtempSync(join(tmpdir(), "vivim-complete-"));
  const cfg = config("complete-test");
  const e1 = new ResearchEngine(root, cfg);
  const c = e1.proposeCandidate({ phase: "framing", agentRole: "generator", question: "q", approach: "a", verificationCriterion: "v", filePath: "c.md", evidenceLinks: [] });
  e1.recordRepro({ candidateId: c.id, method: "counterexample", passed: true, filePath: "r.md", log: "ok" });
  e1.promoteToVerified(c.id);
  e1.declareObjectiveComplete("finished");
  const e2 = new ResearchEngine(root, cfg);
  expect(e2.isObjectiveComplete()).toBe(true);
  expect(e2.getState().objectiveCompletionNote).toBe("finished");
  expect(() => e2.logDeadend("must not run")).toThrow();
});

test("fleet resume dispatches only the remainder of the original composition", async () => {
  const root = mkdtempSync(join(tmpdir(), "vivim-fleet-"));
  const cfg = config("fleet-test", 2);
  const first = new ResearchEngine(root, cfg);
  const dispatched: string[] = [];
  const invoke = async (task: any) => { dispatched.push(task.role); return { role: task.role, raw: task.role }; };
  const opts = { totalAgents: 6, concurrency: 1, phase: "generation" as const, buildResumeBrief: () => "resume" };
  await runFleet(first, cfg, invoke, opts, role => role);
  const firstCount = dispatched.length;
  expect(firstCount).toBe(2);
  const second = new ResearchEngine(root, cfg);
  await runFleet(second, cfg, invoke, opts, role => role);
  expect(dispatched.length).toBe(6);
  expect(computeFleetComposition(cfg, 6).reduce((n, x) => n + x.count, 0)).toBe(6);
});

test("fleet failures are persisted rather than silently disappearing", async () => {
  const root = mkdtempSync(join(tmpdir(), "vivim-fleet-fail-"));
  const cfg = config("fleet-fail-test", 10);
  const engine = new ResearchEngine(root, cfg);
  const opts = { totalAgents: 1, concurrency: 1, phase: "generation" as const, buildResumeBrief: () => "resume" };
  const outcome = await runFleet(engine, cfg, async task => { throw new Error("transport failed"); }, opts, role => role);
  expect(outcome.failed.length).toBe(1);
  const resumed = new ResearchEngine(root, cfg);
  expect(resumed.getState().fleetProgress.failedTasks.length).toBe(1);
});
