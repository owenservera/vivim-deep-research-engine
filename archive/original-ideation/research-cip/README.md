# research-cip — Focused Research System for CIP

Dedicated deep-research harness for `C:\0-BlackBoxProject-0\index` (Code Intelligence Platform v2.1), built from the `ideation` runbook (Riemann-zeta-style fleet: literature synthesis + parallel subagents + adversarial verification).

## What this is

- **Not a clone of `project/`.** `project/` studies `vivim-final` (10 targets, H1-H15, 14 FIXES). `research-cip` studies **CIP itself** — 10 new targets, fresh `FRAMING.md`, hazards seeded from H1-H15 but translated to CIP's Python/index domain.
- **A self-contained `project/`-shape workspace** that happens to target a sibling repo. It lives at `C:\0-BlackBoxProject-0\ideation\research-cip` so you can run `opencode`/`bun` from here while the code under test stays in `C:\0-BlackBoxProject-0\index`.

## How it works (5 phases + outer loop)

See `AGENTS.md` (lead orientation) and the three runbook docs at `ideation/01-03-*.md`.

- **Phase 0 Framing** — `FRAMING.md`: exact question + verification criterion ("how we know it's correct" = executed Python harness) + scope + budget + `Codebase / how to run checks`.
- **Phase 1 Broad exploration** — `generator` fleet (dozens), ~90% expected to fail, every failure → `deadends.md` with `<family>` tag.
- **Phase 2 Deep fan-out** — `extender` deepens promising `candidates/`; `validator` adversarially attacks `READY FOR VALIDATION` by **writing + running a real `repros/cip-*.py` harness** against `C:\0-BlackBoxProject-0\index\lib\cipkg`.
- **Phase 3 Gate** — counterexample search, independent re-derivation (a second harness from scratch), edge-case checks, executed stress (`scripts/numerical_check.py` / `repros/*.py`). Verdict: REJECT / NEEDS WORK / SURVIVED VALIDATION.
- **Phase 3.5 Blind spot** — fleet bias check (one model, correlated misses).
- **Phase 4 Human review** — `verified/*.md` → human expert. `SURVIVED VALIDATION ≠ verified.`

**Outer loop** repeats Phases 0-4 across the 10 CIP targets queued in `state/targets.json`. Cross-loop memory (`HAZARDS.md`, `INDEX.md`, `deadends.md`) makes iteration N smarter than N-1.

## Context Budget — 120K Safe (default) vs 1M MAX (600K Real)

CIP upstream fires autocompact at ~120K and erases reasoning. This harness defaults to 120K **but adds an opt-in MAX mode (1M advertised / 600K real for Muse Spark)** to maximize usable window.

| mode | ceiling | effective safe | toggle |
|---|---|---|---|
| `standard` | 120K | 120K | `pwsh scripts/set-context-budget.ps1 standard` (default) |
| `max` | 1M | **600K** | `pwsh scripts/set-context-budget.ps1 max` + `scripts/check_budget.ps1 -ShowContext` |

Rules (both modes — ceiling = active):
- Never grow beyond active ceiling; 600K in `max` is the hard stop just like 120K in `standard`.
- Persist to files continuously; mandatory checkpoint at **80%** (96K standard / 480K max).
- Complete one bounded unit per session, then drop large code from context.
- If a task doesn't fit in active ceiling, split into persisted sub-tasks.
- See `CONTEXT-BUDGET.md` for threshold tables, fan-out sizing (standard 6-8 generators, max 14-20), and when to use `max` (T2-T9 deep reads).

## The 10 CIP targets (priority order, total budget 120)

| pri | id | path under test | budget | invariants seeded |
|---|---|---|---:|---|
| 0 | cip-indexer-incremental | `lib/cipkg/indexer.py + store.py` | 14 | H1,H3,H4,H5,H8,H11,H14,H15 |
| 1 | cip-store-vector-cache | `lib/cipkg/store.py + vecstore.py + lancedb_store.py` | 12 | H1,H5,H8,H11,H14,H15 |
| 2 | cip-retrieve-hybrid | `lib/cipkg/retrieve.py + rerank.py + vecstore.py` | 12 | H5,H8,H11,H14 |
| 3 | cip-embed-daemon | `lib/cipkg/embed.py + daemon.py` | 14 | H1,H4,H10,H12,H13 |
| 4 | cip-audit-precision | `lib/cipkg/stack/rules.py + audit.py` | 14 | H1,H3,H4,H8,H13 |
| 5 | cip-import-resolution | `lib/cipkg/indexer.py:resolve_import + tsconfig.py + parsers.py` | 12 | H3,H4,H13 |
| 6 | cip-gapfill-health | `lib/cipkg/gapfill.py + analysis.py` | 12 | H5,H11,H14,H15 |
| 7 | cip-watcher-sync | `lib/cipkg/watcher.py + watch.py + lock.py + indexer.sync` | 10 | H1,H11,H12,H15 |
| 8 | cip-memory-consolidation | `lib/cipkg/memory/* + learning_system.py + session.py` | 10 | H1,H4,H5,H11,H12,H14 |
| 9 | cip-server-mcp | `lib/cipkg/server.py + web_bridge.py + cli.py + base.py` | 10 | H1,H3,H4,H8,H10,H13 |

Full rationale + invariant text per target: `state/targets.json` (and rendered `targets.md`).

## Quick start (Windows PowerShell)

```powershell
# 1. Sanity-check layout + see queue + budget + context mode
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/run_fleet.ps1
bun run scripts/research-loop.ts status   # alt: shows same queue
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check_budget.ps1 -ShowContext
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/set-context-budget.ps1 status
# To maximize window (1M/600K real for Muse Spark):
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/set-context-budget.ps1 max

# 2. Drive one target end-to-end (outer loop)
bun run scripts/research-loop.ts next     # plan the next pending target (shows active context mode)
bun run scripts/research-loop.ts start cip-indexer-incremental

# 3. In an opencode lead session from this dir, run:
#    /research            # or paste the orchestration prompt from AGENTS.md
#    — generators log to deadends.md, validators drop repros/cip-*.py, synthesizer writes verified/

# 4. Close the iteration + learn a new hazard
bun run scripts/research-loop.ts done cip-indexer-incremental "Two defects: dirty miss on mtime-held file (H1), orphan vectors after delete (H15) — candidates/cip-dirty-miss.md repros/cip-indexer-incremental.py verified/cip-dirty-miss.md"
bun run scripts/research-loop.ts hazard "mtime-only fast-path can miss a byte-change when mtime held (CIP indexer)" cip-indexer-incremental

# Repeat until queue empty or budget 100% — then review FIXES.md / PROPOSALS.md.
```

## Harness convention (Python, not bun)

Every validator must produce an **executed Python check**:

```powershell
python repros/cip-indexer-incremental.py
# harness pattern: sys.path.insert(0, "C:/0-BlackBoxProject-0/index/lib"), tempfile.TemporaryDirectory, store.connect(tmp)
```

See `repros/README.md` for the full template + per-target table. `repros/cip-indexer-incremental.py` is a runnable template skeleton so the pipeline is wired before first generator runs.

## When stuck

Do NOT inject new technical hints. Use `/keep-going` — the only intervention between total failure and the result in the original Riemann run.

## Where things go

- `FRAMING.md` — active question (overwritten per target; seeded with hazard IDs)
- `candidates/<short>.md` — promising idea, marked `READY FOR VALIDATION` when deepened
- `repros/cip-*.py` — runnable proof/refutation importting real CIP code
- `verified/<short>.md` — synthesizer write-up of SURVIVED VALIDATION (pending human review)
- `HAZARDS.md` — cross-loop pattern library (H1-H15 seeded; H16+ appended as new patterns found)
- `INDEX.md` — per-target outcome log (appended by `research-loop.ts done`)
- `FIXES.md` — accepted fixes applied to `C:\0-BlackBoxProject-0\index` (with repro regression)
- `PROPOSALS.md` — design-ambiguous defects awaiting a decision
- `deadends.md` — tagged failure log (grep `<family>` before adding)

## Relationship to the three docs

- `01-what-actually-happened.md` — honest history of the Riemann result (650 failed ideas, persistence-only follow-up, 60 subagents with emergent roles, adversarial self-verification, external Lean formalization).
- `02-general-runbook.md` — five-phase process + fit test + budget checkpoints + blind-spot hedge.
- `03-claude-code-implementation.md` — concrete subagent file shapes, deadends tagging, budget-forcing script, persistence follow-up verbatim.

This workspace is the CIP instantiation of that implementation.

