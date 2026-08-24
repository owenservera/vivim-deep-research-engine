#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ResearchEngine, FrameworkConfig, AgentRole } from "./engine";

function loadConfig(sessionRoot: string): FrameworkConfig {
  const raw = JSON.parse(readFileSync(join(sessionRoot, "..", "framework.json"), "utf8"));
  if (!raw.survivability) {
    console.error("framework.json has no `survivability` block. v3 removed `budget`; add the survivability configuration."); process.exit(1);
  }
  const roles = Object.entries(raw.agent_roles ?? {}) as [AgentRole, { count_ratio: number }][];
  const sum = roles.reduce((n, [, r]) => n + Number(r.count_ratio), 0);
  if (roles.length !== 6 || Math.abs(sum - 1) > 1e-9) {
    console.error(`Invalid agent_roles configuration: count_ratio must sum to 1.0 ± 1e-9; got ${sum}.`); process.exit(1);
  }
  return raw as FrameworkConfig;
}

async function main() {
  const [, , command, sessionRoot, ...rest] = process.argv;
  if (!command || !sessionRoot) { console.log("Usage: node cli.ts <init|status|pressure|resume|checkpoint|complete|advance|verify-evidence> <session-root> [args]"); process.exit(1); }
  const config = loadConfig(sessionRoot); const engine = new ResearchEngine(sessionRoot, config);
  switch (command) {
    case "init": console.log(`Session initialized at ${sessionRoot}\nPhase: ${engine.getState().phase}`); if (engine.getResumeBrief()) console.log(`\n${engine.getResumeBrief()}`); break;
    case "status": { const s = engine.getState(); console.log(`Session: ${s.sessionId}\nPhase: ${s.phase}\nCandidates: ${Object.keys(s.candidates).length}\nRepros: ${Object.keys(s.repros).length}\nHazards logged: ${s.hazards.length}\nDeadends logged: ${s.deadends.length}\nObjective complete: ${s.objectiveComplete}${s.objectiveCompletionNote ? ` — ${s.objectiveCompletionNote}` : ""}\nFleet completed: ${Object.values(s.fleetProgress.completedByRole).reduce((a,b)=>a+(b??0),0)}\nFleet failed: ${s.fleetProgress.failedTasks.length}`); break; }
    case "pressure": { const s=config.survivability, cur=engine.pressure.getCurrentPressure(), actions=engine.pressure.getActionsSinceCheckpoint(), threshold=s.danger_zone_tokens*s.checkpoint_margin_ratio; console.log(`${cur}/${threshold.toFixed(0)} estimated tokens; ${actions}/${s.max_actions_between_checkpoints} actions`); if(cur>=threshold||actions>=s.max_actions_between_checkpoints){console.log("STATUS: CHECKPOINT REQUIRED");process.exitCode=2}else if(cur>=threshold*.75){console.log("STATUS: approaching danger zone");process.exitCode=1}else console.log("STATUS: OK"); break; }
    case "resume": console.log(engine.getResumeBrief() ?? "No checkpoint exists yet — this is a fresh session, nothing to resume."); break;
    case "checkpoint": { const brief=rest.join(" "); if(!brief){console.error("checkpoint requires a resume-brief argument");process.exit(1)} const cp=engine.writeCheckpoint("manual",brief); console.log(`Checkpoint written: ${cp.id} at ${cp.createdAt}`); break; }
    case "complete": { try { const note=rest.join(" ")||"objective complete"; engine.declareObjectiveComplete(note); console.log(`Objective marked complete: ${note}`); } catch(e){console.error(e instanceof Error?e.message:e);process.exitCode=1} break; }
    case "advance": { try{console.log(`Advanced to phase: ${engine.advancePhase()}`)}catch(e){console.error(e instanceof Error?e.message:e);process.exitCode=1} break; }
    case "verify-evidence": { const r=engine.validateEvidenceChain(); if(r.ok) console.log("Evidence chain OK."); else { console.error(`Evidence chain BROKEN — ${r.breaks.length} dangling reference(s):`); r.breaks.forEach(b=>console.error(`  ${b.candidateId} -> ${b.missingPath}`)); process.exitCode=1; } break; }
    default: console.error(`Unknown command: ${command}`); process.exit(1);
  }
}
main().catch(e=>{console.error(e);process.exit(1)});
