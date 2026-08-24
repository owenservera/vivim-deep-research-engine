/**
 * VIVIM Deep-Research Engine — Engine invariant tests (v3.0.0)
 *
 * Rewritten for the survivability/checkpoint model. The v2 budget-lockout
 * tests (BudgetExceededError, hard stop, the 124/120 regression) are
 * removed because that mechanism no longer exists by design — replaced
 * with tests proving the NEW mechanism: pressure tracking triggers
 * checkpoint requirements, checkpoints are resumable, and a fresh engine
 * instance pointed at the same session root picks up exactly where a
 * "crashed" instance left off (simulating a context compaction).
 */

import { test, expect, beforeEach } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ResearchEngine,
  FrameworkConfig,
  MissingVerificationCriterionError,
  PrematurePhaseTransitionError,
  ObjectiveAlreadyCompleteError,
  TokenPressureTracker,
} from "./engine";

function makeConfig(overrides: Partial<FrameworkConfig["survivability"]> = {}): FrameworkConfig {
  return {
    framework_version: "3.0.0-test",
    target_repo_path: "project/",
    session_id: "test-session",
    survivability: {
      danger_zone_tokens: 1000,
      checkpoint_margin_ratio: 0.8,
      max_actions_between_checkpoints: 5,
      ...overrides,
    },
    agent_roles: {
      generator: { count_ratio: 0.2, master_path: "framework/core/agents/generator.md" },
      extender: { count_ratio: 0.2, master_path: "framework/core/agents/extender.md" },
      validator: { count_ratio: 0.2, master_path: "framework/core/agents/validator.md" },
      literature: { count_ratio: 0.15, master_path: "framework/core/agents/literature.md" },
      synthesizer: { count_ratio: 0.05, master_path: "framework/core/agents/synthesizer.md" },
      blindspot: { count_ratio: 0.05, master_path: "framework/core/agents/blindspot.md" },
    },
    hazard_seed_ids: ["H1", "H2"],
  };
}

let sessionRoot: string;

beforeEach(() => {
  sessionRoot = mkdtempSync(join(tmpdir(), "vivim-v3-test-"));
});

// ---------------------------------------------------------------------------
// Token pressure estimation
// ---------------------------------------------------------------------------

test("TokenPressureTracker: estimates conservatively (overestimates, not underestimates)", () => {
  // 400 chars -> naive estimate would be 100 tokens; conservative estimate
  // pads 10%, so we expect >= 110.
  const text = "x".repeat(400);
  const estimate = TokenPressureTracker.estimateFromText(text);
  expect(estimate >= 110).toBe(true);
});

test("TokenPressureTracker: accumulates across multiple actions and resets on checkpoint", () => {
  const tracker = new TokenPressureTracker();
  tracker.recordExact("generation", "generator", 100, "a");
  tracker.recordExact("generation", "generator", 150, "b");
  expect(tracker.getCurrentPressure()).toBe(250);
  expect(tracker.getActionsSinceCheckpoint()).toBe(2);
  tracker.resetAfterCheckpoint();
  expect(tracker.getCurrentPressure()).toBe(0);
  expect(tracker.getActionsSinceCheckpoint()).toBe(0);
});

// ---------------------------------------------------------------------------
// Danger-zone / checkpoint triggering — replaces the old budget hard-stop
// tests. No lockout, no rejected spend — just a signal that a checkpoint
// is now required, which the caller acts on.
// ---------------------------------------------------------------------------

test("recordAction: does not require checkpoint while under the margined danger zone", () => {
  const engine = new ResearchEngine(sessionRoot, makeConfig({ danger_zone_tokens: 1000, checkpoint_margin_ratio: 0.8 }));
  const { checkpointRequired } = engine.recordAction("generation", "generator", 500, "well under threshold (800)");
  expect(checkpointRequired).toBe(false);
});

test("recordAction: requires checkpoint once cumulative pressure crosses the margined threshold", () => {
  const engine = new ResearchEngine(sessionRoot, makeConfig({ danger_zone_tokens: 1000, checkpoint_margin_ratio: 0.8 }));
  engine.recordAction("generation", "generator", 500, "first chunk");
  const { checkpointRequired, reason } = engine.recordAction("generation", "generator", 400, "second chunk -> 900 >= 800 threshold");
  expect(checkpointRequired).toBe(true);
  expect(reason).toBe("danger-zone");
});

test("recordAction: requires checkpoint at the action-count floor even with low token pressure", () => {
  const engine = new ResearchEngine(sessionRoot, makeConfig({ danger_zone_tokens: 1_000_000, max_actions_between_checkpoints: 3 }));
  engine.recordAction("generation", "generator", 1, "a1");
  engine.recordAction("generation", "generator", 1, "a2");
  const { checkpointRequired, reason } = engine.recordAction("generation", "generator", 1, "a3 -> hits floor");
  expect(checkpointRequired).toBe(true);
  expect(reason).toBe("action-limit");
});

test("recordAction: works AND survives an unbounded number of actions — no ceiling anywhere", () => {
  // The point of the redesign: there is no total budget to run out of.
  // Verify we can record far more actions than any v2 hard_stop_percent
  // would have allowed, as long as we checkpoint along the way.
  const engine = new ResearchEngine(sessionRoot, makeConfig({ danger_zone_tokens: 500, max_actions_between_checkpoints: 10 }));
  let checkpointsFired = 0;
  for (let i = 0; i < 500; i++) {
    const { checkpointRequired } = engine.recordAction("generation", "generator", 50, `action ${i}`);
    if (checkpointRequired) {
      engine.writeCheckpoint("danger-zone", `checkpoint after action ${i}`);
      checkpointsFired++;
    }
  }
  expect(checkpointsFired > 0).toBe(true);
  // No error was thrown across 500 actions — nothing like BudgetExceededError exists anymore.
});

// ---------------------------------------------------------------------------
// Checkpoint durability + resumption — the core new guarantee.
// ---------------------------------------------------------------------------

test("writeCheckpoint: resets pressure tracker after writing", () => {
  const engine = new ResearchEngine(sessionRoot, makeConfig());
  engine.recordAction("generation", "generator", 900, "big chunk");
  expect(engine.pressure.getCurrentPressure()).toBe(900);
  engine.writeCheckpoint("manual", "test checkpoint");
  expect(engine.pressure.getCurrentPressure()).toBe(0);
});

test("checkpoint resumption: a FRESH engine instance on the same session root resumes from the latest checkpoint", () => {
  // This simulates a context compaction: engine1 represents the agent
  // instance before compaction, engine2 represents a brand new agent
  // instance (zero conversational history) constructed fresh afterward.
  const config = makeConfig();
  const engine1 = new ResearchEngine(sessionRoot, config);
  engine1.advancePhase(); // -> generation
  const candidate = engine1.proposeCandidate({
    phase: "generation",
    agentRole: "generator",
    question: "does X work",
    approach: "approach A",
    verificationCriterion: "numerical stress test",
    filePath: "session/02-candidates/a.md",
    evidenceLinks: [],
  });
  engine1.writeCheckpoint("manual", "In generation phase. Candidate A proposed, not yet validated. Next: run repro for candidate A, do not re-propose.");

  // "Compaction happens" — engine1 is discarded, nothing in-process carries over.
  const engine2 = new ResearchEngine(sessionRoot, config);

  expect(engine2.getState().phase).toBe("generation");
  expect(Object.keys(engine2.getState().candidates).length).toBe(1);
  expect(engine2.getState().candidates[candidate.id].approach).toBe("approach A");
  expect(engine2.getResumeBrief()).toBe(
    "In generation phase. Candidate A proposed, not yet validated. Next: run repro for candidate A, do not re-propose.",
  );
});

test("checkpoint resumption: resumed engine can continue work seamlessly (propose -> repro -> verify across the resume boundary)", () => {
  const config = makeConfig();
  const engine1 = new ResearchEngine(sessionRoot, config);
  engine1.advancePhase();
  const candidate = engine1.proposeCandidate({
    phase: "generation",
    agentRole: "generator",
    question: "q",
    approach: "a",
    verificationCriterion: "re-derivation",
    filePath: "session/02-candidates/a.md",
    evidenceLinks: [],
  });
  engine1.writeCheckpoint("danger-zone", "checkpoint before compaction");

  // Resume as a fresh instance and finish the work.
  const engine2 = new ResearchEngine(sessionRoot, config);
  engine2.advancePhase(); // -> validation
  engine2.recordRepro({
    candidateId: candidate.id,
    method: "re-derivation",
    passed: true,
    filePath: "session/03-repros/a.ts",
    log: "re-derived, matches",
  });
  engine2.advancePhase(); // -> synthesis
  const verified = engine2.promoteToVerified(candidate.id);
  expect(verified.status).toBe("verified");

  engine2.declareObjectiveComplete("candidate A verified and synthesized");
  expect(engine2.isObjectiveComplete()).toBe(true);
});

test("getResumeBrief: returns null for a fresh session with no checkpoints", () => {
  const engine = new ResearchEngine(sessionRoot, makeConfig());
  expect(engine.getResumeBrief()).toBe(null);
});

// ---------------------------------------------------------------------------
// Objective completion — replaces budget-derived stopping.
// ---------------------------------------------------------------------------

test("declareObjectiveComplete: refuses to complete with zero verified candidates", () => {
  const engine = new ResearchEngine(sessionRoot, makeConfig());
  expect(() => engine.declareObjectiveComplete("nothing done yet")).toThrow(PrematurePhaseTransitionError);
});

test("declareObjectiveComplete: locks out further work actions once complete", () => {
  const engine = new ResearchEngine(sessionRoot, makeConfig());
  const candidate = engine.proposeCandidate({
    phase: "framing",
    agentRole: "generator",
    question: "q",
    approach: "a",
    verificationCriterion: "v",
    filePath: "session/02-candidates/a.md",
    evidenceLinks: [],
  });
  engine.recordRepro({ candidateId: candidate.id, method: "counterexample", passed: true, filePath: "session/03-repros/a.ts", log: "ok" });
  engine.promoteToVerified(candidate.id);
  engine.declareObjectiveComplete("done");

  expect(() =>
    engine.proposeCandidate({
      phase: "framing",
      agentRole: "generator",
      question: "q2",
      approach: "a2",
      verificationCriterion: "v",
      filePath: "session/02-candidates/b.md",
      evidenceLinks: [],
    }),
  ).toThrow(ObjectiveAlreadyCompleteError);
});

// ---------------------------------------------------------------------------
// Unchanged invariants (verification criterion, deadends, evidence chain) —
// re-verified against v3 to confirm the redesign didn't regress them.
// ---------------------------------------------------------------------------

test("candidate: still rejects proposal with empty verification criterion", () => {
  const engine = new ResearchEngine(sessionRoot, makeConfig());
  expect(() =>
    engine.proposeCandidate({
      phase: "generation",
      agentRole: "generator",
      question: "q",
      approach: "a",
      verificationCriterion: "",
      filePath: "session/02-candidates/y.md",
      evidenceLinks: [],
    }),
  ).toThrow(MissingVerificationCriterionError);
});

test("synthesis gate: still cannot promote without a passing repro", () => {
  const engine = new ResearchEngine(sessionRoot, makeConfig());
  const candidate = engine.proposeCandidate({
    phase: "generation",
    agentRole: "generator",
    question: "q",
    approach: "a",
    verificationCriterion: "numerical stress test",
    filePath: "session/02-candidates/a.md",
    evidenceLinks: [],
  });
  expect(() => engine.promoteToVerified(candidate.id)).toThrow(PrematurePhaseTransitionError);
});

test("evidence chain: still flags missing linked files", () => {
  const engine = new ResearchEngine(sessionRoot, makeConfig());
  const candidate = engine.proposeCandidate({
    phase: "generation",
    agentRole: "generator",
    question: "q",
    approach: "a",
    verificationCriterion: "v",
    filePath: "session/02-candidates/a.md",
    evidenceLinks: [],
  });
  engine.recordRepro({ candidateId: candidate.id, method: "counterexample", passed: false, filePath: "session/03-repros/missing.ts", log: "found a break" });
  const result = engine.validateEvidenceChain((_p) => false);
  expect(result.ok).toBe(false);
  expect(result.breaks.length).toBe(1);
});
