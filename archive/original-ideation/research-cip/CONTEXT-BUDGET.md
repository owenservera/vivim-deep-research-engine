# Context Budget — 120K Safe vs 1M MAX (600K Real)

This harness supports **two context-budget modes**. Both obey the same anti-erasure rules (persist to files, `Read -> Act -> Persist -> Drop`), but with different ceilings.

## Modes

| mode | ceiling advertised | real usable (Muse Spark) | default | use when |
|---|---|---|---|---|
| `standard` | 120K tokens | ~110K safe | **YES — default** | Follows `C:\0-BlackBoxProject-0\index\AGENTS.md` canonical 120K rule; safest for long fleets where autocompact must never fire. |
| `max` (1M) | 1M tokens | **~600K real** | opt-in | You have a Muse Spark-class model that actually exposes ~600K before compaction. Maximizes single-session depth: fewer splits, larger `candidates/`/`repros/` batches, deeper cross-file reads. |

> **Why "600K real" for a 1M option?** The provider advertises 1M, but effective safe window before autocompact / KV eviction is ~600K in practice. This harness targets 600K as the hard ceiling in `max` mode and advertises 1M as the envelope. Exceeding ~600K triggers the same loss as exceeding 120K in standard mode.

## What changes in MAX mode

- **Ceiling only** — all persistence rules stay identical. You still must `persist continuously`, checkpoint at milestones, and `Read -> Act -> Persist -> Drop`. A larger ceiling means fewer splits, not no splits.
- **Checkpoint thresholds scale:**

| % of ceiling | standard (120K) | max (600K) | action |
|---|---|---|---|
| 40% | 48K | 240K | soft reminder: consider checkpoint |
| 60% | 72K | 360K | persist `candidates/` + `deadends.md` rollup |
| 80% | 96K | 480K | **mandatory checkpoint** — write `state/checkpoint-<id>.md`, drop non-essential context |
| 95% | 114K | 570K | **hard stop** — finish current unit, persist, split to next sub-task |
| 100% | 120K | 600K | autocompact risk — must not continue |

- **Per-target budget units scale too.** The `state/targets.json` budget (120 total) is a *token/session budget* for the outer loop, not the context window. In MAX mode you can allocate larger per-generator payloads (e.g. read 3-4 CIP modules at once vs 1 at a time in standard) without compaction. The budget checkpoint (`scripts/check_budget.*`) now prints BOTH: `spent/total` and `context used / ceiling`.

## How to switch

```powershell
# From research-cip dir:

# Show current mode + effective ceiling
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check_budget.ps1 -ShowContext

# Switch to MAX (1M advertised, 600K real)
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/set-context-budget.ps1 max
# -> updates state/loop.json: context_mode=max, context_ceiling=1000000, context_effective=600000

# Switch back to STANDARD (120K)
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/set-context-budget.ps1 standard

# One-off override without persisting (env var wins for this process only):
$env:CIP_RESEARCH_CONTEXT = "max"   # or "standard" or "600k" or "120k"
$env:CIP_RESEARCH_CONTEXT_CEILING = "600000"
bun run scripts/research-loop.ts next   # will report mode
```

`scripts/research-loop.ts` also accepts:
```powershell
bun run scripts/research-loop.ts status --context max   # force display in max scale
```

## Agent rules by mode

- **Lead session** reads `state/loop.json:context_mode` (or env override) at start of each iteration and announces the active ceiling in the Phase 0 FRAMING.md header.
- **Generator / Extender / Validator** must still obey "complete one bounded unit before accumulating more context" — the unit is just larger in MAX. Before spawning subagents, estimate token cost: `~750 tokens per 100 lines of Python + 500 per candidate write + 300 per deadends entry`. Scale fan-out accordingly: standard ≈ 6-8 parallel generators; max ≈ 14-20.
- **Persistence cadence:** In MAX mode, checkpoint after every 2-3 generator completions instead of every 4-6 in standard. The risk is not gone — it's delayed, so late-stage loss would be larger if you don't checkpoint.

## Reconciliation with CIP's own 120K rule

`C:\0-BlackBoxProject-0\index\AGENTS.md` enforces 120K for agents working *inside* CIP's own repo (indexing, memory, etc.). This harness lives **outside** that repo (`ideation/research-cip`) and tests it. Its lead session MAY run in MAX mode, but any harnesses that *import* CIP modules and write to `.cip/` must still respect CIP's own storage invariants (they don't change with context). In other words: a larger research window lets the fleet reason deeper, but does not relax CIP's own 120K-session rule for agents that run inside `C:\0-BlackBoxProject-0\index`.

## Recommendation

- Start in `standard` for T0-T1 to validate the harness wiring.
- Switch to `max` for T2-T9 where deep cross-file reads (indexer+store+retrieve+embed jointly) benefit from larger packs.
- Always keep `check_budget` running — its context bar is the early warning.

