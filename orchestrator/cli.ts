#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { FrameworkConfig, ResearchEngine } from "./engine";
function loadConfig(root: string): FrameworkConfig { const path = join(root, "..", "framework.json"); const raw = JSON.parse(readFileSync(path, "utf8")); if (raw.budget && !raw.survivability) throw new Error("Legacy budget config detected. Replace budget with survivability in framework.json."); return raw as FrameworkConfig; }
function usage(): never { console.error("Usage: node orchestrator/cli.ts <init|status|pressure|resume|checkpoint|complete|advance|verify-evidence> <session-root> [text]"); process.exit(1); }
async function main() { const [, , command, root, ...rest] = process.argv; if (!command || !root) usage(); const engine = new ResearchEngine(root, loadConfig(root));
 switch (command) {
  case "init": console.log(`Session initialized at ${root}; phase=${engine.getState().phase}`); break;
  case "status": { const s = engine.getState(); console.log(JSON.stringify({ sessionId:s.sessionId, phase:s.phase, candidates:Object.keys(s.candidates).length, repros:Object.keys(s.repros).length, hazards:s.hazards.length, completed:s.completed, pressure:engine.getPressureStatus() }, null, 2)); break; }
  case "pressure": { const p=engine.getPressureStatus(); console.log(JSON.stringify(p,null,2)); if(p.checkpointRequired) process.exitCode=2; break; }
  case "resume": { const b=engine.getResumeBrief(); if(b) console.log(b); else console.log("No checkpoint exists for this session."); break; }
  case "checkpoint": { const brief=rest.join(" ").trim(); if(!brief) { console.error("checkpoint requires a resume brief"); process.exit(1); } console.log(JSON.stringify(engine.writeCheckpoint(brief),null,2)); break; }
  case "complete": { const note=rest.join(" ").trim(); if(!note) { console.error("complete requires a note"); process.exit(1); } engine.declareObjectiveComplete(note); console.log("Objective marked complete."); break; }
  case "advance": console.log(`Advanced to phase: ${engine.advancePhase()}`); break;
  case "verify-evidence": { const chain=engine.validateEvidenceChain(); const integrity=engine.verifyEvidenceIntegrity(); if(chain.ok && integrity.ok) console.log("Evidence chain and integrity OK."); else { console.error(JSON.stringify({ chain, integrity }, null, 2)); process.exitCode=1; } break; }
  default: usage();
 }
}
main().catch(err => { console.error(err instanceof Error ? err.message : err); process.exit(1); });
