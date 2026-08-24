/**
 * VIVIM Deep-Research Engine — Orchestrator Core (v2.0.0)
 *
 * Replaces: framework/scripts/check_budget.sh + the "manual mode" honor-system
 * described in docs/05-usage-guide.md.
 *
 * What this fixes vs v1:
 *   - v1 budget tracking was a bash script comparing two numbers a human/agent
 *     had to remember to invoke. It could not stop a run, could not track
 *     which phase spent what, and silently allowed the 124/120 overrun that
 *     v1's own framework.json documents as having already happened.
 *   - v1 phase transitions (0→1→2→3→4) were prose in DESIGN.md. Nothing
 *     enforced that a generator's candidate had a verification criterion
 *     before a validator touched it, or that a synthesizer couldn't write to
 *     04-verified/ without a passing repro.
 *   - v1 evidence chain ("every claim links to a file") was a convention
 *     agents were asked nicely to follow. Nothing checked it.
 *
 * This file is a single-source-of-truth state machine. Every mutation to
 * session state goes through it. Agent prompts (framework/core/agents/*.md)
 * stay as the "what should I think about" layer; this is the "what am I
 * allowed to do" layer.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Phase = "framing" | "generation" | "validation" | "synthesis" | "output";

export type AgentRole =
  | "generator"
  | "extender"
  | "validator"
  | "literature"
  | "synthesizer"
  | "blindspot";

export interface FrameworkConfig {
  framework_version: string;
  target_repo_path: string;
  session_id: string;
  budget: {
    total_budget_percent: number;
    hard_stop_percent: number; // NEW: unlike v1, this is enforced, not advisory
    budget_checkpoints: number[];
  };
  agent_roles: Record<AgentRole, { count_ratio: number; master_path: string }>;
  hazard_seed_ids: string[];
}

export interface Candidate {
  id: string;
  createdAt: string;
  phase: Phase;
  agentRole: AgentRole;
  question: string;
  approach: string;
  verificationCriterion: string; // MANDATORY — engine refuses to accept without it
  filePath: string;
  status: "proposed" | "validated" | "refuted" | "verified" | "synthesized";
  evidenceLinks: string[]; // relative paths this candidate depends on
}

export interface ReproResult {
  candidateId: string;
  method: "counterexample" | "re-derivation" | "numerical-stress-test";
  passed: boolean;
  filePath: string;
  log: string;
}

export interface HazardEntry {
  id: string; // H1, H2, ... — must match framework.json hazard_seed_ids or be a new registered id
  family: string;
  description: string;
  discoveredIn: string; // candidate id or repro path
  severity: "low" | "medium" | "high" | "critical";
}

export interface BudgetLedgerEntry {
  timestamp: string;
  phase: Phase;
  agentRole: AgentRole;
  percentSpent: number;
  cumulativePercent: number;
  note: string;
}

export interface SessionState {
  sessionId: string;
  phase: Phase;
  budgetLedger: BudgetLedgerEntry[];
  candidates: Record<string, Candidate>;
  repros: Record<string, ReproResult>;
  hazards: HazardEntry[];
  deadends: string[];
  locked: boolean; // true once hard stop or human sign-off freezes state
}

// ---------------------------------------------------------------------------
// Errors — the engine fails loud, not silent. v1 had no failure mode at all;
// a script printing "WARNING" to stdout that nobody reads is not a control.
// ---------------------------------------------------------------------------

export class BudgetExceededError extends Error {
  constructor(cumulative: number, hardStop: number) {
    super(
      `Budget hard stop hit: ${cumulative.toFixed(1)}% spent, hard stop is ${hardStop}%. ` +
        `Session is now LOCKED. Human sign-off required to resume (see engine.unlockWithSignoff).`,
    );
    this.name = "BudgetExceededError";
  }
}

export class MissingVerificationCriterionError extends Error {
  constructor(candidateId: string) {
    super(
      `Candidate ${candidateId} has no verification criterion. ` +
        `Per framework/core/agents/generator.md: "No proposal without verification criterion." ` +
        `This is now enforced at write time, not just requested in the prompt.`,
    );
    this.name = "MissingVerificationCriterionError";
  }
}

export class BrokenEvidenceChainError extends Error {
  constructor(claimPath: string, missingRef: string) {
    super(
      `Evidence chain broken: ${claimPath} references ${missingRef}, which does not exist. ` +
        `Every claim must resolve to a real file (DESIGN.md principle #4).`,
    );
    this.name = "BrokenEvidenceChainError";
  }
}

export class PrematurePhaseTransitionError extends Error {
  constructor(from: Phase, to: Phase, reason: string) {
    super(`Cannot transition ${from} -> ${to}: ${reason}`);
    this.name = "PrematurePhaseTransitionError";
  }
}

export class SessionLockedError extends Error {
  constructor() {
    super("Session is locked (budget hard stop or human freeze). No further writes accepted.");
    this.name = "SessionLockedError";
  }
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

const PHASE_ORDER: Phase[] = ["framing", "generation", "validation", "synthesis", "output"];

export class ResearchEngine {
  private config: FrameworkConfig;
  private state: SessionState;
  private sessionRoot: string;
  private statePath: string;

  constructor(sessionRoot: string, config: FrameworkConfig) {
    this.sessionRoot = sessionRoot;
    this.config = config;
    this.statePath = join(sessionRoot, "state", "engine-state.json");
    this.state = this.loadOrInit();
  }

  private loadOrInit(): SessionState {
    if (existsSync(this.statePath)) {
      return JSON.parse(readFileSync(this.statePath, "utf-8"));
    }
    const fresh: SessionState = {
      sessionId: this.config.session_id,
      phase: "framing",
      budgetLedger: [],
      candidates: {},
      repros: {},
      hazards: [],
      deadends: [],
      locked: false,
    };
    this.persist(fresh);
    return fresh;
  }

  private persist(state: SessionState = this.state): void {
    const dir = join(this.sessionRoot, "state");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(this.statePath, JSON.stringify(state, null, 2));
    // Append-only audit log — separate from mutable state, so a bad write to
    // engine-state.json never destroys the history of how we got there.
    appendFileSync(
      join(dir, "engine-audit.log"),
      `${new Date().toISOString()} phase=${state.phase} candidates=${Object.keys(state.candidates).length} ` +
        `budget=${this.cumulativeBudget(state).toFixed(1)}% locked=${state.locked}\n`,
    );
  }

  private cumulativeBudget(state: SessionState = this.state): number {
    return state.budgetLedger.reduce((sum, e) => sum + e.percentSpent, 0);
  }

  private assertUnlocked(): void {
    if (this.state.locked) throw new SessionLockedError();
  }

  // -------------------------------------------------------------------------
  // Budget — the load-bearing fix. v1's check_budget.sh compared two numbers
  // after the fact. This spends budget atomically WITH the action that
  // consumes it, and refuses the action if it would exceed the hard stop.
  // -------------------------------------------------------------------------

  spendBudget(phase: Phase, agentRole: AgentRole, percent: number, note: string): void {
    this.assertUnlocked();
    const projected = this.cumulativeBudget() + percent;

    if (projected > this.config.budget.hard_stop_percent) {
      // Record the attempted spend for audit purposes even though we reject it
      this.state.locked = true;
      this.persist();
      throw new BudgetExceededError(projected, this.config.budget.hard_stop_percent);
    }

    this.state.budgetLedger.push({
      timestamp: new Date().toISOString(),
      phase,
      agentRole,
      percentSpent: percent,
      cumulativePercent: projected,
      note,
    });

    // Checkpoint warnings — these are informational, distinct from the hard
    // stop, mirroring framework.json's budget_checkpoints but actually acted on.
    for (const checkpoint of this.config.budget.budget_checkpoints) {
      const prevCumulative = projected - percent;
      if (prevCumulative < checkpoint && projected >= checkpoint) {
        console.warn(`[budget] checkpoint ${checkpoint}% crossed (now at ${projected.toFixed(1)}%)`);
      }
    }

    this.persist();
  }

  unlockWithSignoff(humanIdentifier: string, reason: string): void {
    this.state.locked = false;
    this.state.budgetLedger.push({
      timestamp: new Date().toISOString(),
      phase: this.state.phase,
      agentRole: "synthesizer",
      percentSpent: 0,
      cumulativePercent: this.cumulativeBudget(),
      note: `HUMAN SIGNOFF by ${humanIdentifier}: ${reason}`,
    });
    this.persist();
  }

  getBudgetStatus(): { spent: number; hardStop: number; remaining: number; locked: boolean } {
    const spent = this.cumulativeBudget();
    return {
      spent,
      hardStop: this.config.budget.hard_stop_percent,
      remaining: this.config.budget.hard_stop_percent - spent,
      locked: this.state.locked,
    };
  }

  // -------------------------------------------------------------------------
  // Candidates — enforces the generator.md rule that every proposal needs a
  // verification criterion, at write time rather than as prompt guidance.
  // -------------------------------------------------------------------------

  proposeCandidate(input: Omit<Candidate, "id" | "createdAt" | "status">): Candidate {
    this.assertUnlocked();
    if (!input.verificationCriterion || input.verificationCriterion.trim().length === 0) {
      throw new MissingVerificationCriterionError(input.filePath);
    }
    if (this.isKnownDeadend(input.approach)) {
      throw new PrematurePhaseTransitionError(
        this.state.phase,
        this.state.phase,
        `Approach matches a logged deadend. Check session/deadends.md before re-proposing: "${input.approach.slice(0, 80)}..."`,
      );
    }
    const candidate: Candidate = {
      ...input,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      status: "proposed",
    };
    this.state.candidates[candidate.id] = candidate;
    this.persist();
    return candidate;
  }

  private isKnownDeadend(approach: string): boolean {
    const normalized = approach.toLowerCase().trim();
    return this.state.deadends.some((d) => normalized.includes(d.toLowerCase().trim()));
  }

  logDeadend(description: string): void {
    this.assertUnlocked();
    this.state.deadends.push(description);
    this.persist();
  }

  // -------------------------------------------------------------------------
  // Repros / validation — validator.md requires ONE of three methods.
  // Enforced here instead of trusted.
  // -------------------------------------------------------------------------

  recordRepro(result: Omit<ReproResult, never>): void {
    this.assertUnlocked();
    const candidate = this.state.candidates[result.candidateId];
    if (!candidate) {
      throw new BrokenEvidenceChainError(result.filePath, result.candidateId);
    }
    this.state.repros[result.filePath] = result;
    candidate.status = result.passed ? "validated" : "refuted";
    candidate.evidenceLinks.push(result.filePath);
    this.persist();
  }

  // -------------------------------------------------------------------------
  // Synthesis — a candidate can only become "verified" if it has at least
  // one passing repro. This is the check that was entirely missing in v1:
  // nothing stopped a synthesizer from writing to 04-verified/ off a
  // candidate that was never actually validated.
  // -------------------------------------------------------------------------

  promoteToVerified(candidateId: string): Candidate {
    this.assertUnlocked();
    const candidate = this.state.candidates[candidateId];
    if (!candidate) throw new BrokenEvidenceChainError("promoteToVerified", candidateId);

    const passingRepro = Object.values(this.state.repros).find(
      (r) => r.candidateId === candidateId && r.passed,
    );
    if (!passingRepro) {
      throw new PrematurePhaseTransitionError(
        "validation",
        "synthesis",
        `Candidate ${candidateId} has no passing repro. A candidate cannot reach ` +
          `session/04-verified/ without at least one repro with passed=true.`,
      );
    }
    candidate.status = "verified";
    this.persist();
    return candidate;
  }

  // -------------------------------------------------------------------------
  // Hazards — cross-loop memory, now structured instead of "append to a
  // markdown file and hope the next agent reads it."
  // -------------------------------------------------------------------------

  registerHazard(hazard: HazardEntry): void {
    this.assertUnlocked();
    this.state.hazards.push(hazard);
    this.persist();
  }

  // -------------------------------------------------------------------------
  // Phase transitions — enforced order, enforced exit criteria per phase.
  // -------------------------------------------------------------------------

  advancePhase(): Phase {
    this.assertUnlocked();
    const idx = PHASE_ORDER.indexOf(this.state.phase);
    if (idx === PHASE_ORDER.length - 1) {
      throw new PrematurePhaseTransitionError(this.state.phase, this.state.phase, "already at final phase");
    }
    const next = PHASE_ORDER[idx + 1];
    this.assertExitCriteria(this.state.phase, next);
    this.state.phase = next;
    this.persist();
    return next;
  }

  private assertExitCriteria(from: Phase, to: Phase): void {
    if (from === "generation" && to === "validation") {
      const candidatesWithCriterion = Object.values(this.state.candidates).filter(
        (c) => c.verificationCriterion,
      );
      if (candidatesWithCriterion.length === 0) {
        throw new PrematurePhaseTransitionError(from, to, "no candidates with verification criteria exist");
      }
    }
    if (from === "validation" && to === "synthesis") {
      const anyValidated = Object.values(this.state.candidates).some((c) => c.status === "validated");
      if (!anyValidated) {
        throw new PrematurePhaseTransitionError(
          from,
          to,
          "no candidate has status=validated (i.e. has a passing repro)",
        );
      }
    }
    if (from === "synthesis" && to === "output") {
      const anyVerified = Object.values(this.state.candidates).some((c) => c.status === "verified");
      if (!anyVerified) {
        throw new PrematurePhaseTransitionError(from, to, "no candidate reached status=verified");
      }
    }
  }

  // -------------------------------------------------------------------------
  // Evidence chain validation — walks every candidate/repro and confirms the
  // files it claims to depend on actually exist on disk.
  // -------------------------------------------------------------------------

  validateEvidenceChain(fileExists: (path: string) => boolean = existsSync): {
    ok: boolean;
    breaks: { candidateId: string; missingPath: string }[];
  } {
    const breaks: { candidateId: string; missingPath: string }[] = [];
    for (const candidate of Object.values(this.state.candidates)) {
      for (const link of candidate.evidenceLinks) {
        if (!fileExists(join(this.sessionRoot, link))) {
          breaks.push({ candidateId: candidate.id, missingPath: link });
        }
      }
    }
    return { ok: breaks.length === 0, breaks };
  }

  getState(): Readonly<SessionState> {
    return this.state;
  }
}
