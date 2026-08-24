#!/usr/bin/env node
/**
 * VIVIM Deep-Research Engine — CLI (v3.0.0)
 *
 * `budget` command is gone (no ceiling exists to report against). Replaced
 * with `pressure` (how close to a forced checkpoint are we right now) and
 * `resume` (print the latest resume brief — this is what a fresh agent
 * turn should read FIRST after a compaction, before doing anything else).
 *
 * Usage:
 *   node cli.ts init <session-root>
 *   node cli.ts status <session-root>
 *   node cli.ts pressure <session-root>
 *   node cli.ts resume <session-root>
 *   node cli.ts checkpoint <session-root> "<resume brief text>"
 *   node cli.ts complete <session-root> "<completion note>"
 *   node cli.ts advance <session-root>
 *   node cli.ts verify-evidence <session-root>
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ResearchEngine, FrameworkConfig } from "./engine";

function loadConfig(sessionRoot: string): FrameworkConfig {
  const configPath = join(sessionRoot, "..", "framework.json");
  const raw = JSON.parse(readFileSync(configPath, "utf-8"));

  // Back-compat: v1/v2 framework.json has a `budget` block, not
  // `survivability`. Rather than silently ignoring the old shape (which
  // would leave danger_zone_tokens undefined and break pressure checks),
  // fail loud with a migration hint.
  if (!raw.survivability) {
    console.error(
      "framework.json has no `survivability` block. v3 removed `budget` entirely — " +
        'add: "survivability": { "danger_zone_tokens": 40000, "checkpoint_margin_ratio": 0.8, ' +
        '"max_actions_between_checkpoints": 25 } (tune danger_zone_tokens to your coding ' +
        "agent's actual context window, with real margin below it).",
    );
    process.exit(1);
  }
  return raw as FrameworkConfig;
}

async function main() {
  const [, , command, sessionRoot, ...rest] = process.argv;

  if (!command || !sessionRoot) {
    console.log(
      "Usage: node cli.ts <init|status|pressure|resume|checkpoint|complete|advance|verify-evidence> <session-root> [args]",
    );
    process.exit(1);
  }

  const config = loadConfig(sessionRoot);
  const engine = new ResearchEngine(sessionRoot, config);

  switch (command) {
    case "init": {
      console.log(`Session initialized at ${sessionRoot}`);
      console.log(`Phase: ${engine.getState().phase}`);
      const resume = engine.getResumeBrief();
      if (resume) {
        console.log(`\nThis session has prior checkpoints. Resume brief:\n${resume}`);
      }
      break;
    }

    case "status": {
      const state = engine.getState();
      console.log(`Session: ${state.sessionId}`);
      console.log(`Phase: ${state.phase}`);
      console.log(`Candidates: ${Object.keys(state.candidates).length}`);
      console.log(`Repros: ${Object.keys(state.repros).length}`);
      console.log(`Hazards logged: ${state.hazards.length}`);
      console.log(`Deadends logged: ${state.deadends.length}`);
      console.log(`Objective complete: ${state.objectiveComplete}${state.objectiveCompletionNote ? ` — ${state.objectiveCompletionNote}` : ""}`);
      console.log(`Context pressure since last checkpoint: ${engine.pressure.getCurrentPressure()} tokens (est.), ${engine.pressure.getActionsSinceCheckpoint()} actions`);
      break;
    }

    case "pressure": {
      const { danger_zone_tokens, checkpoint_margin_ratio, max_actions_between_checkpoints } = config.survivability;
      const current = engine.pressure.getCurrentPressure();
      const actions = engine.pressure.getActionsSinceCheckpoint();
      const threshold = danger_zone_tokens * checkpoint_margin_ratio;
      const ratio = Math.min(current / threshold, 1);
      const width = 40;
      const filled = Math.round(ratio * width);
      const bar = "█".repeat(filled) + "░".repeat(width - filled);
      const color = ratio >= 1 ? "\x1b[31m" : ratio >= 0.75 ? "\x1b[33m" : "\x1b[32m";
      console.log(`${color}[${bar}]\x1b[0m ${current} / ${threshold.toFixed(0)} tokens (danger-zone threshold)`);
      console.log(`Actions since checkpoint: ${actions} / ${max_actions_between_checkpoints} (action floor)`);
      if (ratio >= 1 || actions >= max_actions_between_checkpoints) {
        console.log("STATUS: CHECKPOINT REQUIRED before further context-consuming work.");
        process.exitCode = 2;
      } else if (ratio >= 0.75) {
        console.log("STATUS: approaching danger zone — checkpoint soon.");
        process.exitCode = 1;
      } else {
        console.log("STATUS: OK.");
      }
      break;
    }

    case "resume": {
      const brief = engine.getResumeBrief();
      if (!brief) {
        console.log("No checkpoint exists yet — this is a fresh session, nothing to resume.");
      } else {
        console.log(brief);
      }
      break;
    }

    case "checkpoint": {
      const brief = rest.join(" ");
      if (!brief) {
        console.error('checkpoint requires a resume-brief argument: node cli.ts checkpoint <root> "brief text"');
        process.exit(1);
      }
      const cp = engine.writeCheckpoint("manual", brief);
      console.log(`Checkpoint written: ${cp.id} at ${cp.createdAt}`);
      break;
    }

    case "complete": {
      const note = rest.join(" ") || "objective complete";
      try {
        engine.declareObjectiveComplete(note);
        console.log(`Objective marked complete: ${note}`);
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        process.exitCode = 1;
      }
      break;
    }

    case "advance": {
      try {
        const next = engine.advancePhase();
        console.log(`Advanced to phase: ${next}`);
      } catch (err) {
        console.error(`Cannot advance: ${err instanceof Error ? err.message : err}`);
        process.exitCode = 1;
      }
      break;
    }

    case "verify-evidence": {
      const result = engine.validateEvidenceChain();
      if (result.ok) {
        console.log("Evidence chain OK — every candidate's linked file exists on disk.");
      } else {
        console.error(`Evidence chain BROKEN — ${result.breaks.length} dangling reference(s):`);
        for (const b of result.breaks) console.error(`  candidate ${b.candidateId} -> missing ${b.missingPath}`);
        process.exitCode = 1;
      }
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
