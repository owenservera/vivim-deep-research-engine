/**
 * VIVIM Deep-Research Engine — Engine invariant tests (v2.0.0)
 *
 * v1 had zero tests anywhere in the repository. Every claim in DESIGN.md
 * ("no proposal without verification criterion", "evidence chain is
 * unbreakable") was an assertion about agent behavior, never checked in
 * code. These tests pin down the invariants the engine now enforces
 * mechanically, so a future refactor can't silently regress them.
 *
 * Run with: bun test engine.test.ts   (or `node --test` with ts-node loader)
 */

import { test, expect, beforeEach } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ResearchEngine,
  FrameworkConfig,
  BudgetExceededError,
  MissingVerificationCriterionError,
  PrematurePhaseTransitionError,
  SessionLockedError,
} from "./engine";

function makeConfig(overrides: Partial<FrameworkConfig["budget"]> = {}): FrameworkConfig {
  return {
    framework_version: "2.0.0-test",
    target_repo_path: "project/",
    session_id: "test-session",
    budget: {
      total_budget_percent: 100,
      hard_stop_percent: 100,
      budget_checkpoints: [25, 50, 75, 100],
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
  sessionRoot = mkdtempSync(join(tmpdir(), "vivim-test-"));
});

test("budget: allows spend under hard stop", () => {
  const engine = new ResearchEngine(sessionRoot, makeConfig());
  engine.spendBudget("generation", "generator", 30, "test spend");
  expect(engine.getBudgetStatus().spent).toBe(30);
  expect(engine.getBudgetStatus().locked).toBe(false);
});

test("budget: hard stop rejects the overrunning spend and locks the session", () => {
  const engine = new ResearchEngine(sessionRoot, makeConfig({ hard_stop_percent: 100 }));
  engine.spendBudget("generation", "generator", 90, "first chunk");
  expect(() => engine.spendBudget("validation", "validator", 20, "would overrun")).toThrow(
    BudgetExceededError,
  );
  expect(engine.getBudgetStatus().locked).toBe(true);
});

test("budget: this is the exact v1 failure the engine now prevents — 124/120 overrun", () => {
  // framework.json in the actual repo documents: total_budget_percent: 120,
  // budget_spent_percent: 124 — i.e. the v1 system let itself go 4% over
  // its own stated limit. Reproduce that scenario and confirm v2 refuses it.
  const engine = new ResearchEngine(sessionRoot, makeConfig({ hard_stop_percent: 120 }));
  engine.spendBudget("generation", "generator", 60, "chunk 1");
  engine.spendBudget("validation", "validator", 60, "chunk 2"); // now at 120, exactly at limit
  expect(engine.getBudgetStatus().spent).toBe(120);
  expect(() => engine.spendBudget("synthesis", "synthesizer", 4, "the v1 overrun")).toThrow(
    BudgetExceededError,
  );
  expect(engine.getBudgetStatus().spent).toBe(120); // rejected spend did not apply
});

test("locked session rejects all further mutation until human signoff", () => {
  const engine = new ResearchEngine(sessionRoot, makeConfig({ hard_stop_percent: 10 }));
  expect(() => engine.spendBudget("generation", "generator", 15, "over")).toThrow(BudgetExceededError);

  expect(() =>
    engine.proposeCandidate({
      phase: "generation",
      agentRole: "generator",
      question: "q",
      approach: "a",
      verificationCriterion: "v",
      filePath: "session/02-candidates/x.md",
      evidenceLinks: [],
    }),
  ).toThrow(SessionLockedError);

  engine.unlockWithSignoff("test-human", "reviewed and approved overrun");
  expect(engine.getBudgetStatus().locked).toBe(false);
});

test("candidate: rejects proposal with empty verification criterion", () => {
  const engine = new ResearchEngine(sessionRoot, makeConfig());
  expect(() =>
    engine.proposeCandidate({
      phase: "generation",
      agentRole: "generator",
      question: "does X work",
      approach: "try Y",
      verificationCriterion: "",
      filePath: "session/02-candidates/y.md",
      evidenceLinks: [],
    }),
  ).toThrow(MissingVerificationCriterionError);
});

test("candidate: rejects re-proposal of a known deadend", () => {
  const engine = new ResearchEngine(sessionRoot, makeConfig());
  engine.logDeadend("permissive ?? operator masking null checks");
  expect(() =>
    engine.proposeCandidate({
      phase: "generation",
      agentRole: "generator",
      question: "q",
      approach: "use permissive ?? operator masking null checks everywhere",
      verificationCriterion: "unit test",
      filePath: "session/02-candidates/z.md",
      evidenceLinks: [],
    }),
  ).toThrow(PrematurePhaseTransitionError);
});

test("synthesis gate: cannot promote a candidate to verified without a passing repro", () => {
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

  engine.recordRepro({
    candidateId: candidate.id,
    method: "numerical-stress-test",
    passed: true,
    filePath: "session/03-repros/a-repro.ts",
    log: "1000 iterations, 0 failures",
  });

  const verified = engine.promoteToVerified(candidate.id);
  expect(verified.status).toBe("verified");
});

test("phase transitions: cannot skip to validation before any candidate has a verification criterion", () => {
  const engine = new ResearchEngine(sessionRoot, makeConfig());
  engine.advancePhase(); // framing -> generation, no exit criteria on this edge
  expect(() => engine.advancePhase()).toThrow(PrematurePhaseTransitionError); // generation -> validation
});

test("phase transitions: full happy path framing -> output", () => {
  const engine = new ResearchEngine(sessionRoot, makeConfig());
  engine.advancePhase(); // -> generation

  const candidate = engine.proposeCandidate({
    phase: "generation",
    agentRole: "generator",
    question: "q",
    approach: "a",
    verificationCriterion: "re-derivation",
    filePath: "session/02-candidates/a.md",
    evidenceLinks: [],
  });

  engine.advancePhase(); // -> validation
  engine.recordRepro({
    candidateId: candidate.id,
    method: "re-derivation",
    passed: true,
    filePath: "session/03-repros/a-repro.ts",
    log: "re-derived independently, matches",
  });

  engine.advancePhase(); // -> synthesis
  engine.promoteToVerified(candidate.id);
  engine.advancePhase(); // -> output

  expect(engine.getState().phase).toBe("output");
});

test("evidence chain: flags candidates whose linked files do not exist", () => {
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
  engine.recordRepro({
    candidateId: candidate.id,
    method: "counterexample",
    passed: false,
    filePath: "session/03-repros/does-not-exist.ts",
    log: "found a counterexample",
  });

  const result = engine.validateEvidenceChain((p) => false); // simulate nothing existing on disk
  expect(result.ok).toBe(false);
  expect(result.breaks.length).toBe(1);
  expect(result.breaks[0].missingPath).toBe("session/03-repros/does-not-exist.ts");
});

test("hazard registration is append-only and survives reload", () => {
  const engine1 = new ResearchEngine(sessionRoot, makeConfig());
  engine1.registerHazard({
    id: "H1",
    family: "permissive-null-check",
    description: "?? operator masks required null validation",
    discoveredIn: "session/03-repros/a-repro.ts",
    severity: "high",
  });

  const engine2 = new ResearchEngine(sessionRoot, makeConfig()); // reload from disk
  expect(engine2.getState().hazards.length).toBe(1);
  expect(engine2.getState().hazards[0].id).toBe("H1");
});
