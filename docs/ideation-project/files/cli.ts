#!/usr/bin/env node
/**
 * VIVIM Deep-Research Engine — CLI (v2.0.0)
 *
 * Replaces:
 *   - framework/scripts/check_budget.sh (bash + `bc`, breaks on machines
 *     without bc, silently no-ops on Windows despite the .ps1 twin existing
 *     as a separate file that can drift out of sync)
 *   - the implied `bun run scripts/research-loop.ts next` from
 *     docs/05-usage-guide.md, which was referenced but not present in the
 *     repo (framework/scripts/ only ever contained the two budget scripts)
 *
 * Single Node/TS entry point. No bash/powershell fork needed — this runs
 * identically on Linux, macOS, Windows (via `node` or `bun`).
 *
 * Usage:
 *   node cli.ts init <session-root>
 *   node cli.ts status <session-root>
 *   node cli.ts budget <session-root>
 *   node cli.ts advance <session-root>
 *   node cli.ts verify-evidence <session-root>
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ResearchEngine, FrameworkConfig } from "./engine";

function loadConfig(sessionRoot: string): FrameworkConfig {
  const configPath = join(sessionRoot, "..", "framework.json");
  const raw = JSON.parse(readFileSync(configPath, "utf-8"));
  // Back-compat: v1 framework.json has no hard_stop_percent. Default it to
  // total_budget_percent so old configs don't silently get an unbounded budget.
  if (raw.budget && raw.budget.hard_stop_percent === undefined) {
    raw.budget.hard_stop_percent = raw.budget.total_budget_percent;
  }
  return raw as FrameworkConfig;
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

async function main() {
  const [, , command, sessionRoot] = process.argv;

  if (!command || !sessionRoot) {
    console.log(
      "Usage: node cli.ts <init|status|budget|advance|verify-evidence> <session-root>",
    );
    process.exit(1);
  }

  const config = loadConfig(sessionRoot);
  const engine = new ResearchEngine(sessionRoot, config);

  switch (command) {
    case "init": {
      console.log(`Session initialized at ${sessionRoot}`);
      console.log(`Phase: ${engine.getState().phase}`);
      break;
    }

    case "status": {
      const state = engine.getState();
      const budget = engine.getBudgetStatus();
      console.log(`Session: ${state.sessionId}`);
      console.log(`Phase: ${state.phase}`);
      console.log(`Candidates: ${Object.keys(state.candidates).length}`);
      console.log(`Repros: ${Object.keys(state.repros).length}`);
      console.log(`Hazards logged: ${state.hazards.length}`);
      console.log(`Deadends logged: ${state.deadends.length}`);
      console.log(
        `Budget: ${fmtPct(budget.spent)} spent / ${fmtPct(budget.hardStop)} hard stop ` +
          `(${fmtPct(budget.remaining)} remaining)`,
      );
      console.log(`Locked: ${budget.locked}`);
      break;
    }

    case "budget": {
      const budget = engine.getBudgetStatus();
      const bar = renderBudgetBar(budget.spent, budget.hardStop);
      console.log(bar);
      if (budget.locked) {
        console.log("STATUS: LOCKED — hard stop reached. Requires engine.unlockWithSignoff().");
        process.exitCode = 2;
      } else if (budget.remaining < budget.hardStop * 0.1) {
        console.log(`STATUS: WARNING — under 10% budget remaining (${fmtPct(budget.remaining)}).`);
        process.exitCode = 1;
      } else {
        console.log(`STATUS: OK (${fmtPct(budget.remaining)} remaining)`);
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
        for (const b of result.breaks) {
          console.error(`  candidate ${b.candidateId} -> missing ${b.missingPath}`);
        }
        process.exitCode = 1;
      }
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

function renderBudgetBar(spent: number, hardStop: number, width = 40): string {
  const ratio = Math.min(spent / hardStop, 1);
  const filled = Math.round(ratio * width);
  const bar = "█".repeat(filled) + "░".repeat(width - filled);
  const color = ratio >= 1 ? "\x1b[31m" : ratio >= 0.75 ? "\x1b[33m" : "\x1b[32m";
  return `${color}[${bar}]\x1b[0m ${fmtPct(spent)} / ${fmtPct(hardStop)}`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
