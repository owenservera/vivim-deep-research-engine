/**
 * VIVIM Deep-Research Engine — Orchestrator Core (v3.0.0)
 *
 * ── WHY THIS FILE EXISTS (read before touching budget/checkpoint logic) ──
 *
 * v2 modeled "budget" as a spend ledger against a ceiling: accumulate
 * percent-spent, refuse to go over 100%, lock the session. That is the
 * wrong model for this system. It was built for a different problem
 * (bounding total cost) than the one this engine actually has to solve
 * (surviving context compaction in a long-running coding agent).
 *
 * THE REAL PROBLEM:
 * A coding agent's context window is a volatile, bounded resource. At some
 * point — unpredictably, from the engine's point of view — the agent's
 * context gets compacted or reset. Everything not written to durable state
 * is gone. The agent that resumes afterward has no memory of what the
 * previous instance was thinking, only what got persisted.
 *
 * This means "budget" is not a spend limit with a finish line. There is no
 * finish line — the objective is done when it's done, however many
 * compactions that takes. Budget is instead a SURVIVABILITY CONTRACT:
 *   1. Track how much context pressure has accumulated since the last
 *      durable checkpoint (token-based, not percent-of-a-total-budget).
 *   2. Force a checkpoint BEFORE that pressure reaches the danger zone
 *      where an uncontrolled compaction could lose in-flight work.
 *   3. Make every checkpoint SELF-SUFFICIENT: a fresh agent instance with
 *      zero conversational history must be able to read one checkpoint
 *      and correctly resume — not replay the whole session log.
 *
 * WHAT WAS REMOVED FROM v2:
 *   - hard_stop_percent / BudgetExceededError / session locking on spend.
 *     There is no longer a ceiling that stops work. Work stops when the
 *     objective is met, full stop.
 *   - "budget checkpoints" as warning thresholds that just print. Replaced
 *     by mandatory checkpoint writes that are part of the control flow,
 *     not a side observation of it.
 *
 * WHAT'S NEW:
 *   - TokenPressureTracker: estimates context consumption per unit of work
 *     and answers "are we in the compaction danger zone right now."
 *   - Checkpoint: a complete, resumable snapshot — not just a state dump,
 *     but a purpose-built "resume brief" a cold agent can act on directly.
 *   - CheckpointStore: append-only checkpoint history + "give me the
 *     latest resumable checkpoint" retrieval, so resumption is a read, not
 *     a reconstruction.
 *
 * WHAT'S UNCHANGED FROM v2 (these were never the problem):
 *   - Phase state machine (framing -> generation -> validation -> synthesis
 *     -> output) and its exit criteria.
 *   - Verification-criterion enforcement on candidates.
 *   - The verified-fix gate (must have a passing repro to reach "verified").
 *   - Evidence chain validation.
 *   - Deadend collision detection.
 *   - Structured hazard registry.
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
  /**
   * Replaces the old `budget` block entirely. There is no total/ceiling —
   * this configures HOW checkpointing behaves, not how much work is allowed.
   */
  survivability: {
    /**
     * Estimated tokens of context consumed before we consider ourselves in
     * the "danger zone" for uncontrolled compaction, i.e. the threshold at
     * which a checkpoint becomes mandatory rather than optional.
     * This is a per-runtime tuning knob — set it below your actual
     * coding-agent context window with real margin (see
     * checkpoint_margin_ratio), because token estimation is inherently
     * approximate (see TokenPressureTracker doc comment).
     */
    danger_zone_tokens: number;
    /**
     * Safety margin applied to danger_zone_tokens. A checkpoint is forced
     * at danger_zone_tokens * checkpoint_margin_ratio, not at
     * danger_zone_tokens itself — because the estimator is approximate and
     * we'd rather checkpoint a little early than a little late.
     * Recommended: 0.7–0.85.
     */
    checkpoint_margin_ratio: number;
    /**
     * Absolute floor: force a checkpoint at least this often regardless of
     * token pressure, so a badly-calibrated estimator can't let pressure
     * run unbounded between checkpoints. Measured in "units of work" —
     * one unit = one completed agent invocation (proposeCandidate,
     * recordRepro, etc.), not tokens.
     */
    max_actions_between_checkpoints: number;
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
  verificationCriterion: string;
  filePath: string;
  status: "proposed" | "validated" | "refuted" | "verified" | "synthesized";
  evidenceLinks: string[];
}

export interface ReproResult {
  candidateId: string;
  method: "counterexample" | "re-derivation" | "numerical-stress-test";
  passed: boolean;
  filePath: string;
  log: string;
}

export interface HazardEntry {
  id: string;
  family: string;
  description: string;
  discoveredIn: string;
  severity: "low" | "medium" | "high" | "critical";
}

/**
 * A single unit of tracked context pressure. Every action that consumes
 * agent context (an LLM call, a tool call, a large file read) should be
 * recorded so the tracker can estimate cumulative pressure since the last
 * checkpoint. Token counts here are ESTIMATES — see TokenPressureTracker.
 */
export interface PressureEvent {
  timestamp: string;
  phase: Phase;
  agentRole: AgentRole;
  estimatedTokens: number;
  note: string;
}

/**
 * The unit of survivability. A Checkpoint is not just "state at time T" —
 * it is written to be independently readable by an agent with NO prior
 * context. `resumeBrief` is the field that matters most: it's a compact,
 * human-and-agent-readable summary of exactly what to do next, so resuming
 * doesn't require replaying the full candidate/repro history.
 */
export interface Checkpoint {
  id: string;
  createdAt: string;
  reason: "danger-zone" | "action-limit" | "phase-transition" | "manual";
  phase: Phase;
  /** Everything needed to reconstruct working state without replay. */
  stateSnapshot: {
    candidates: Record<string, Candidate>;
    repros: Record<string, ReproResult>;
    hazards: HazardEntry[];
    deadends: string[];
  };
  /**
   * The resume brief. Written in plain language a fresh agent turn can act
   * on directly: what phase we're in, what's in flight, what the next
   * action should be, and what NOT to redo. This is the actual
   * survivability mechanism — the snapshot data above is the ground truth,
   * this is the "onboarding doc" a cold agent reads first.
   */
  resumeBrief: string;
  /** Estimated tokens consumed in the interval this checkpoint closes out. */
  pressureAtCheckpoint: number;
}

export interface SessionState {
  sessionId: string;
  phase: Phase;
  candidates: Record<string, Candidate>;
  repros: Record<string, ReproResult>;
  hazards: HazardEntry[];
  deadends: string[];
  /** Objective completion is explicit and agent-declared, not budget-derived. */
  objectiveComplete: boolean;
  objectiveCompletionNote: string | null;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class MissingVerificationCriterionError extends Error {
  constructor(candidateId: string) {
    super(
      `Candidate ${candidateId} has no verification criterion. ` +
        `Per framework/core/agents/generator.md: "No proposal without verification criterion."`,
    );
    this.name = "MissingVerificationCriterionError";
  }
}

export class BrokenEvidenceChainError extends Error {
  constructor(claimPath: string, missingRef: string) {
    super(`Evidence chain broken: ${claimPath} references ${missingRef}, which does not exist.`);
    this.name = "BrokenEvidenceChainError";
  }
}

export class PrematurePhaseTransitionError extends Error {
  constructor(from: Phase, to: Phase, reason: string) {
    super(`Cannot transition ${from} -> ${to}: ${reason}`);
    this.name = "PrematurePhaseTransitionError";
  }
}

export class ObjectiveAlreadyCompleteError extends Error {
  constructor() {
    super("Objective is marked complete. No further work actions accepted on this session.");
    this.name = "ObjectiveAlreadyCompleteError";
  }
}

// ---------------------------------------------------------------------------
// TokenPressureTracker
//
// Token counting for LLM context is inherently approximate from outside the
// runtime that actually manages the context window (we don't have access
// to the coding agent's real tokenizer state, only what we can estimate
// from the size of what we asked it to read/write). This tracker is
// deliberately conservative: it OVERESTIMATES pressure slightly, because
// the cost of checkpointing a bit early is small (a few extra writes) and
// the cost of checkpointing too late is losing unrecoverable work.
//
// Estimation heuristic: ~4 characters per token (a standard rough English/
// code approximation), applied to anything the tracker is told about
// (prompt size, tool result size, file content size). Callers that have a
// better estimate (e.g. an actual usage report from the API response)
// should pass that number directly via `recordExact` instead of relying on
// `estimateFromText`.
// ---------------------------------------------------------------------------

export class TokenPressureTracker {
  private events: PressureEvent[] = [];
  private cumulativeSinceCheckpoint = 0;
  private actionsSinceCheckpoint = 0;

  static estimateFromText(text: string): number {
    return Math.ceil((text.length / 4) * 1.1);
  }

  recordExact(phase: Phase, agentRole: AgentRole, tokens: number, note: string): void {
    const event: PressureEvent = { timestamp: new Date().toISOString(), phase, agentRole, estimatedTokens: tokens, note };
    this.events.push(event);
    this.cumulativeSinceCheckpoint += tokens;
    this.actionsSinceCheckpoint += 1;
  }

  recordFromText(phase: Phase, agentRole: AgentRole, text: string, note: string): void {
    this.recordExact(phase, agentRole, TokenPressureTracker.estimateFromText(text), note);
  }

  getCurrentPressure(): number {
    return this.cumulativeSinceCheckpoint;
  }

  getActionsSinceCheckpoint(): number {
    return this.actionsSinceCheckpoint;
  }

  getAllEvents(): readonly PressureEvent[] {
    return this.events;
  }

  resetAfterCheckpoint(): void {
    this.cumulativeSinceCheckpoint = 0;
    this.actionsSinceCheckpoint = 0;
  }

  inDangerZone(dangerZoneTokens: number, marginRatio: number): boolean {
    return this.cumulativeSinceCheckpoint >= dangerZoneTokens * marginRatio;
  }

  hitActionFloor(maxActions: number): boolean {
    return this.actionsSinceCheckpoint >= maxActions;
  }
}

// ---------------------------------------------------------------------------
// CheckpointStore — append-only, durable, and the sole source of truth for
// "what should the next agent turn do." Loading a session means loading
// the latest checkpoint, not replaying every action ever taken.
// ---------------------------------------------------------------------------

export class CheckpointStore {
  private checkpointsDir: string;

  constructor(sessionRoot: string) {
    this.checkpointsDir = join(sessionRoot, "state", "checkpoints");
    if (!existsSync(this.checkpointsDir)) mkdirSync(this.checkpointsDir, { recursive: true });
  }

  write(checkpoint: Checkpoint): void {
    const path = join(this.checkpointsDir, `${checkpoint.createdAt.replace(/[:.]/g, "-")}-${checkpoint.id}.json`);
    writeFileSync(path, JSON.stringify(checkpoint, null, 2));
    writeFileSync(join(this.checkpointsDir, "LATEST.json"), JSON.stringify({ path }, null, 2));
  }

  readLatest(): Checkpoint | null {
    const pointerPath = join(this.checkpointsDir, "LATEST.json");
    if (!existsSync(pointerPath)) return null;
    const { path } = JSON.parse(readFileSync(pointerPath, "utf-8"));
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf-8"));
  }
}

// ---------------------------------------------------------------------------
// ResearchEngine
// ---------------------------------------------------------------------------

const PHASE_ORDER: Phase[] = ["framing", "generation", "validation", "synthesis", "output"];

export class ResearchEngine {
  private config: FrameworkConfig;
  private state: SessionState;
  private sessionRoot: string;
  private statePath: string;
  public readonly pressure: TokenPressureTracker;
  public readonly checkpoints: CheckpointStore;

  constructor(sessionRoot: string, config: FrameworkConfig) {
    this.sessionRoot = sessionRoot;
    this.config = config;
    this.statePath = join(sessionRoot, "state", "engine-state.json");
    this.pressure = new TokenPressureTracker();
    this.checkpoints = new CheckpointStore(sessionRoot);
    this.state = this.loadOrResume();
  }

  private loadOrResume(): SessionState {
    const latest = this.checkpoints.readLatest();
    if (latest) {
      return {
        sessionId: this.config.session_id,
        phase: latest.phase,
        candidates: latest.stateSnapshot.candidates,
        repros: latest.stateSnapshot.repros,
        hazards: latest.stateSnapshot.hazards,
        deadends: latest.stateSnapshot.deadends,
        objectiveComplete: false,
        objectiveCompletionNote: null,
      };
    }
    if (existsSync(this.statePath)) {
      return JSON.parse(readFileSync(this.statePath, "utf-8"));
    }
    const fresh: SessionState = {
      sessionId: this.config.session_id,
      phase: "framing",
      candidates: {},
      repros: {},
      hazards: [],
      deadends: [],
      objectiveComplete: false,
      objectiveCompletionNote: null,
    };
    this.persist(fresh);
    return fresh;
  }

  private persist(state: SessionState = this.state): void {
    const dir = join(this.sessionRoot, "state");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(this.statePath, JSON.stringify(state, null, 2));
    appendFileSync(
      join(dir, "engine-audit.log"),
      `${new Date().toISOString()} phase=${state.phase} candidates=${Object.keys(state.candidates).length} ` +
        `pressure=${this.pressure.getCurrentPressure()}tok actions=${this.pressure.getActionsSinceCheckpoint()} ` +
        `objectiveComplete=${state.objectiveComplete}\n`,
    );
  }

  private assertObjectiveNotComplete(): void {
    if (this.state.objectiveComplete) throw new ObjectiveAlreadyCompleteError();
  }

  // -------------------------------------------------------------------------
  // Survivability
  // -------------------------------------------------------------------------

  recordAction(
    phase: Phase,
    agentRole: AgentRole,
    estimatedTokens: number,
    note: string,
  ): { checkpointRequired: boolean; reason: Checkpoint["reason"] | null } {
    this.assertObjectiveNotComplete();
    this.pressure.recordExact(phase, agentRole, estimatedTokens, note);

    const { danger_zone_tokens, checkpoint_margin_ratio, max_actions_between_checkpoints } = this.config.survivability;

    if (this.pressure.inDangerZone(danger_zone_tokens, checkpoint_margin_ratio)) {
      return { checkpointRequired: true, reason: "danger-zone" };
    }
    if (this.pressure.hitActionFloor(max_actions_between_checkpoints)) {
      return { checkpointRequired: true, reason: "action-limit" };
    }
    return { checkpointRequired: false, reason: null };
  }

  writeCheckpoint(reason: Checkpoint["reason"], resumeBrief: string): Checkpoint {
    const checkpoint: Checkpoint = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      reason,
      phase: this.state.phase,
      stateSnapshot: {
        candidates: this.state.candidates,
        repros: this.state.repros,
        hazards: this.state.hazards,
        deadends: this.state.deadends,
      },
      resumeBrief,
      pressureAtCheckpoint: this.pressure.getCurrentPressure(),
    };
    this.checkpoints.write(checkpoint);
    this.pressure.resetAfterCheckpoint();
    this.persist();
    return checkpoint;
  }

  getResumeBrief(): string | null {
    return this.checkpoints.readLatest()?.resumeBrief ?? null;
  }

  // -------------------------------------------------------------------------
  // Objective completion
  // -------------------------------------------------------------------------

  declareObjectiveComplete(note: string): void {
    const anyVerified = Object.values(this.state.candidates).some((c) => c.status === "verified");
    if (!anyVerified) {
      throw new PrematurePhaseTransitionError(
        this.state.phase,
        this.state.phase,
        "cannot declare objective complete with zero verified candidates — that's an abandoned session, not a completed one",
      );
    }
    this.state.objectiveComplete = true;
    this.state.objectiveCompletionNote = note;
    this.writeCheckpoint("manual", `OBJECTIVE COMPLETE: ${note}`);
  }

  isObjectiveComplete(): boolean {
    return this.state.objectiveComplete;
  }

  // -------------------------------------------------------------------------
  // Candidates
  // -------------------------------------------------------------------------

  proposeCandidate(input: Omit<Candidate, "id" | "createdAt" | "status">): Candidate {
    this.assertObjectiveNotComplete();
    if (!input.verificationCriterion || input.verificationCriterion.trim().length === 0) {
      throw new MissingVerificationCriterionError(input.filePath);
    }
    if (this.isKnownDeadend(input.approach)) {
      throw new PrematurePhaseTransitionError(
        this.state.phase,
        this.state.phase,
        `Approach matches a logged deadend: "${input.approach.slice(0, 80)}..."`,
      );
    }
    const candidate: Candidate = { ...input, id: randomUUID(), createdAt: new Date().toISOString(), status: "proposed" };
    this.state.candidates[candidate.id] = candidate;
    this.persist();
    return candidate;
  }

  private isKnownDeadend(approach: string): boolean {
    const normalized = approach.toLowerCase().trim();
    return this.state.deadends.some((d) => normalized.includes(d.toLowerCase().trim()));
  }

  logDeadend(description: string): void {
    this.assertObjectiveNotComplete();
    this.state.deadends.push(description);
    this.persist();
  }

  // -------------------------------------------------------------------------
  // Repros / validation
  // -------------------------------------------------------------------------

  recordRepro(result: ReproResult): void {
    this.assertObjectiveNotComplete();
    const candidate = this.state.candidates[result.candidateId];
    if (!candidate) throw new BrokenEvidenceChainError(result.filePath, result.candidateId);
    this.state.repros[result.filePath] = result;
    candidate.status = result.passed ? "validated" : "refuted";
    candidate.evidenceLinks.push(result.filePath);
    this.persist();
  }

  // -------------------------------------------------------------------------
  // Synthesis
  // -------------------------------------------------------------------------

  promoteToVerified(candidateId: string): Candidate {
    this.assertObjectiveNotComplete();
    const candidate = this.state.candidates[candidateId];
    if (!candidate) throw new BrokenEvidenceChainError("promoteToVerified", candidateId);

    const passingRepro = Object.values(this.state.repros).find((r) => r.candidateId === candidateId && r.passed);
    if (!passingRepro) {
      throw new PrematurePhaseTransitionError(
        "validation",
        "synthesis",
        `Candidate ${candidateId} has no passing repro. A candidate cannot reach verified without one.`,
      );
    }
    candidate.status = "verified";
    this.persist();
    return candidate;
  }

  // -------------------------------------------------------------------------
  // Hazards
  // -------------------------------------------------------------------------

  registerHazard(hazard: HazardEntry): void {
    this.assertObjectiveNotComplete();
    this.state.hazards.push(hazard);
    this.persist();
  }

  // -------------------------------------------------------------------------
  // Phase transitions
  // -------------------------------------------------------------------------

  advancePhase(): Phase {
    this.assertObjectiveNotComplete();
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
      const any = Object.values(this.state.candidates).some((c) => c.verificationCriterion);
      if (!any) throw new PrematurePhaseTransitionError(from, to, "no candidates with verification criteria exist");
    }
    if (from === "validation" && to === "synthesis") {
      const any = Object.values(this.state.candidates).some((c) => c.status === "validated");
      if (!any) throw new PrematurePhaseTransitionError(from, to, "no candidate has status=validated");
    }
    if (from === "synthesis" && to === "output") {
      const any = Object.values(this.state.candidates).some((c) => c.status === "verified");
      if (!any) throw new PrematurePhaseTransitionError(from, to, "no candidate reached status=verified");
    }
  }

  // -------------------------------------------------------------------------
  // Evidence chain validation
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
