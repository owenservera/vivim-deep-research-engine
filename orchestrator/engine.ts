import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export type Phase = "framing" | "generation" | "validation" | "synthesis" | "output";
export type AgentRole = "generator" | "extender" | "validator" | "literature" | "synthesizer" | "blindspot";

export interface FrameworkConfig {
  framework_version: string; target_repo_path: string; session_id: string;
  survivability: { danger_zone_tokens: number; checkpoint_margin_ratio: number; max_actions_between_checkpoints: number };
  agent_roles: Record<AgentRole, { count_ratio: number; master_path: string }>;
  hazard_seed_ids: string[];
}
export interface Candidate {
  id: string; createdAt: string; phase: Phase; agentRole: AgentRole; question: string; approach: string;
  verificationCriterion: string; filePath: string;
  status: "proposed" | "validated" | "refuted" | "verified" | "synthesized"; evidenceLinks: string[];
}
export interface ReproResult { candidateId: string; method: "counterexample" | "re-derivation" | "numerical-stress-test"; passed: boolean; filePath: string; log: string; }
export interface HazardEntry { id: string; family: string; description: string; discoveredIn: string; severity: "low" | "medium" | "high" | "critical"; }
export interface FailedTaskRecord { role: AgentRole; prompt: string; masterPromptPath: string; error: string; recordedAt: string; }
export interface FleetProgress {
  completedByRole: Partial<Record<AgentRole, number>>;
  failedTasks: FailedTaskRecord[];
}
export interface PressureEvent { timestamp: string; phase: Phase; agentRole: AgentRole; estimatedTokens: number; note: string; }
export interface Checkpoint {
  id: string; createdAt: string; reason: "danger-zone" | "action-limit" | "phase-transition" | "manual"; phase: Phase;
  stateSnapshot: {
    candidates: Record<string, Candidate>; repros: Record<string, ReproResult>; hazards: HazardEntry[]; deadends: string[];
    objectiveComplete: boolean; objectiveCompletionNote: string | null; fleetProgress: FleetProgress;
  };
  resumeBrief: string; pressureAtCheckpoint: number;
}
export interface SessionState {
  sessionId: string; phase: Phase; candidates: Record<string, Candidate>; repros: Record<string, ReproResult>;
  hazards: HazardEntry[]; deadends: string[]; objectiveComplete: boolean; objectiveCompletionNote: string | null;
  fleetProgress: FleetProgress;
}

export class MissingVerificationCriterionError extends Error { constructor(id: string) { super(`Candidate ${id} has no verification criterion.`); this.name = "MissingVerificationCriterionError"; } }
export class BrokenEvidenceChainError extends Error { constructor(path: string, ref: string) { super(`Evidence chain broken: ${path} references ${ref}, which does not exist.`); this.name = "BrokenEvidenceChainError"; } }
export class PrematurePhaseTransitionError extends Error { constructor(from: Phase, to: Phase, reason: string) { super(`Cannot transition ${from} -> ${to}: ${reason}`); this.name = "PrematurePhaseTransitionError"; } }
export class ObjectiveAlreadyCompleteError extends Error { constructor() { super("Objective is marked complete. No further work actions accepted on this session."); this.name = "ObjectiveAlreadyCompleteError"; } }

export class TokenPressureTracker {
  private events: PressureEvent[] = []; private cumulativeSinceCheckpoint = 0; private actionsSinceCheckpoint = 0;
  static estimateFromText(text: string): number { return Math.ceil((text.length / 4) * 1.1); }
  recordExact(phase: Phase, agentRole: AgentRole, tokens: number, note: string): void {
    this.events.push({ timestamp: new Date().toISOString(), phase, agentRole, estimatedTokens: tokens, note });
    this.cumulativeSinceCheckpoint += tokens; this.actionsSinceCheckpoint++;
  }
  recordFromText(phase: Phase, agentRole: AgentRole, text: string, note: string): void { this.recordExact(phase, agentRole, TokenPressureTracker.estimateFromText(text), note); }
  getCurrentPressure(): number { return this.cumulativeSinceCheckpoint; }
  getActionsSinceCheckpoint(): number { return this.actionsSinceCheckpoint; }
  getAllEvents(): readonly PressureEvent[] { return this.events; }
  resetAfterCheckpoint(): void { this.cumulativeSinceCheckpoint = 0; this.actionsSinceCheckpoint = 0; }
  inDangerZone(tokens: number, ratio: number): boolean { return this.cumulativeSinceCheckpoint >= tokens * ratio; }
  hitActionFloor(max: number): boolean { return this.actionsSinceCheckpoint >= max; }
}

export class CheckpointStore {
  private dir: string;
  constructor(root: string) { this.dir = join(root, "state", "checkpoints"); if (!existsSync(this.dir)) mkdirSync(this.dir, { recursive: true }); }
  write(cp: Checkpoint): void {
    const path = join(this.dir, `${cp.createdAt.replace(/[:.]/g, "-")}-${cp.id}.json`);
    writeFileSync(path, JSON.stringify(cp, null, 2)); writeFileSync(join(this.dir, "LATEST.json"), JSON.stringify({ path }, null, 2));
  }
  readLatest(): Checkpoint | null {
    const pointer = join(this.dir, "LATEST.json"); if (!existsSync(pointer)) return null;
    const { path } = JSON.parse(readFileSync(pointer, "utf8")); if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf8"));
  }
}

const PHASE_ORDER: Phase[] = ["framing", "generation", "validation", "synthesis", "output"];
const emptyFleet = (): FleetProgress => ({ completedByRole: {}, failedTasks: [] });

export class ResearchEngine {
  private config: FrameworkConfig; private state: SessionState; private sessionRoot: string; private statePath: string;
  public readonly pressure: TokenPressureTracker; public readonly checkpoints: CheckpointStore;
  constructor(sessionRoot: string, config: FrameworkConfig) {
    this.sessionRoot = sessionRoot; this.config = config; this.statePath = join(sessionRoot, "state", "engine-state.json");
    this.pressure = new TokenPressureTracker(); this.checkpoints = new CheckpointStore(sessionRoot); this.state = this.loadOrResume();
  }
  private loadOrResume(): SessionState {
    const latest = this.checkpoints.readLatest();
    if (latest) return {
      sessionId: this.config.session_id, phase: latest.phase, candidates: latest.stateSnapshot.candidates,
      repros: latest.stateSnapshot.repros, hazards: latest.stateSnapshot.hazards, deadends: latest.stateSnapshot.deadends,
      objectiveComplete: latest.stateSnapshot.objectiveComplete ?? false,
      objectiveCompletionNote: latest.stateSnapshot.objectiveCompletionNote ?? null,
      fleetProgress: latest.stateSnapshot.fleetProgress ?? emptyFleet(),
    };
    if (existsSync(this.statePath)) {
      const state = JSON.parse(readFileSync(this.statePath, "utf8")); state.fleetProgress ??= emptyFleet(); return state;
    }
    const fresh: SessionState = { sessionId: this.config.session_id, phase: "framing", candidates: {}, repros: {}, hazards: [], deadends: [], objectiveComplete: false, objectiveCompletionNote: null, fleetProgress: emptyFleet() };
    this.persist(fresh); return fresh;
  }
  private persist(state: SessionState = this.state): void {
    const dir = join(this.sessionRoot, "state"); if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(this.statePath, JSON.stringify(state, null, 2));
    appendFileSync(join(dir, "engine-audit.log"), `${new Date().toISOString()} phase=${state.phase} candidates=${Object.keys(state.candidates).length} objectiveComplete=${state.objectiveComplete}\n`);
  }
  private assertObjectiveNotComplete(): void { if (this.state.objectiveComplete) throw new ObjectiveAlreadyCompleteError(); }

  recordAction(phase: Phase, role: AgentRole, tokens: number, note: string): { checkpointRequired: boolean; reason: Checkpoint["reason"] | null } {
    this.assertObjectiveNotComplete(); this.pressure.recordExact(phase, role, tokens, note);
    const s = this.config.survivability;
    if (this.pressure.inDangerZone(s.danger_zone_tokens, s.checkpoint_margin_ratio)) return { checkpointRequired: true, reason: "danger-zone" };
    if (this.pressure.hitActionFloor(s.max_actions_between_checkpoints)) return { checkpointRequired: true, reason: "action-limit" };
    return { checkpointRequired: false, reason: null };
  }
  writeCheckpoint(reason: Checkpoint["reason"], resumeBrief: string): Checkpoint {
    const cp: Checkpoint = { id: randomUUID(), createdAt: new Date().toISOString(), reason, phase: this.state.phase,
      stateSnapshot: { candidates: this.state.candidates, repros: this.state.repros, hazards: this.state.hazards, deadends: this.state.deadends,
        objectiveComplete: this.state.objectiveComplete, objectiveCompletionNote: this.state.objectiveCompletionNote,
        fleetProgress: this.state.fleetProgress }, resumeBrief, pressureAtCheckpoint: this.pressure.getCurrentPressure() };
    this.checkpoints.write(cp); this.pressure.resetAfterCheckpoint(); this.persist(); return cp;
  }
  getResumeBrief(): string | null { return this.checkpoints.readLatest()?.resumeBrief ?? null; }
  declareObjectiveComplete(note: string): void {
    this.assertObjectiveNotComplete();
    if (!Object.values(this.state.candidates).some(c => c.status === "verified")) throw new PrematurePhaseTransitionError(this.state.phase, this.state.phase, "cannot declare objective complete with zero verified candidates");
    this.state.objectiveComplete = true; this.state.objectiveCompletionNote = note; this.writeCheckpoint("manual", `OBJECTIVE COMPLETE: ${note}`);
  }
  isObjectiveComplete(): boolean { return this.state.objectiveComplete; }

  proposeCandidate(input: Omit<Candidate, "id" | "createdAt" | "status">): Candidate {
    this.assertObjectiveNotComplete();
    if (!input.verificationCriterion?.trim()) throw new MissingVerificationCriterionError(input.filePath);
    if (this.isKnownDeadend(input.approach)) throw new PrematurePhaseTransitionError(this.state.phase, this.state.phase, `Approach matches a logged deadend: "${input.approach.slice(0, 80)}..."`);
    const candidate = { ...input, id: randomUUID(), createdAt: new Date().toISOString(), status: "proposed" as const };
    this.state.candidates[candidate.id] = candidate; this.persist(); return candidate;
  }
  private isKnownDeadend(approach: string): boolean { const n = approach.toLowerCase().trim(); return this.state.deadends.some(d => n.includes(d.toLowerCase().trim())); }
  logDeadend(description: string): void { this.assertObjectiveNotComplete(); this.state.deadends.push(description); this.persist(); }

  recordRepro(result: ReproResult): void {
    this.assertObjectiveNotComplete(); const c = this.state.candidates[result.candidateId]; if (!c) throw new BrokenEvidenceChainError(result.filePath, result.candidateId);
    this.state.repros[result.filePath] = result; c.status = result.passed ? "validated" : "refuted"; c.evidenceLinks.push(result.filePath); this.persist();
  }
  promoteToVerified(id: string): Candidate {
    this.assertObjectiveNotComplete(); const c = this.state.candidates[id]; if (!c) throw new BrokenEvidenceChainError("promoteToVerified", id);
    if (!Object.values(this.state.repros).some(r => r.candidateId === id && r.passed)) throw new PrematurePhaseTransitionError("validation", "synthesis", `Candidate ${id} has no passing repro.`);
    c.status = "verified"; this.persist(); return c;
  }
  registerHazard(h: HazardEntry): void { this.assertObjectiveNotComplete(); this.state.hazards.push(h); this.persist(); }

  advancePhase(): Phase {
    this.assertObjectiveNotComplete(); const i = PHASE_ORDER.indexOf(this.state.phase); if (i === PHASE_ORDER.length - 1) throw new PrematurePhaseTransitionError(this.state.phase, this.state.phase, "already at final phase");
    const next = PHASE_ORDER[i + 1];
    if (this.state.phase === "generation" && !Object.values(this.state.candidates).some(c => c.verificationCriterion)) throw new PrematurePhaseTransitionError(this.state.phase, next, "no candidates with verification criteria exist");
    if (this.state.phase === "validation" && !Object.values(this.state.candidates).some(c => c.status === "validated")) throw new PrematurePhaseTransitionError(this.state.phase, next, "no candidate has status=validated");
    if (this.state.phase === "synthesis" && !Object.values(this.state.candidates).some(c => c.status === "verified")) throw new PrematurePhaseTransitionError(this.state.phase, next, "no candidate reached status=verified");
    this.state.phase = next; this.persist(); return next;
  }

  validateEvidenceChain(fileExists: (path: string) => boolean = existsSync): { ok: boolean; breaks: { candidateId: string; missingPath: string }[] } {
    const breaks: { candidateId: string; missingPath: string }[] = [];
    for (const c of Object.values(this.state.candidates)) for (const link of c.evidenceLinks) if (!fileExists(join(this.sessionRoot, link))) breaks.push({ candidateId: c.id, missingPath: link });
    return { ok: breaks.length === 0, breaks };
  }
  getState(): Readonly<SessionState> { return this.state; }
}