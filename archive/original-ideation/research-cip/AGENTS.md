# AGENTS.md — Lead session orientation (research-cip)

This workspace runs the **multi-agent deep-research process** described in the
three `01-03-*.md` docs at the repository root (`01-what-actually-happened.md`,
`02-general-runbook.md`, `03-claude-code-implementation.md`). You are the lead
session. Heavy lifting is done by specialized subagents defined under
`.opencode/agents/`.

**Target codebase:** `C:\0-BlackBoxProject-0\index` (CIP — Code Intelligence Platform v2.1, Python + TS).  
**This workspace:** `C:\0-BlackBoxProject-0\ideation\research-cip` — a focused research harness dedicated to CIP.

## Context Budget — 120K Safe (default) and 1M MAX (600K Real)

CIP upstream (`C:\0-BlackBoxProject-0\index\AGENTS.md`) mandates 120K hard ceiling — autocompact above that erases reasoning. This harness **defaults to that 120K rule** but adds an opt-in **MAX mode (1M advertised / 600K real)** for Muse Spark-class models where the true safe window is ~600K.

- **Default `standard`**: ceiling 120K — treat as hard ceiling. Safest, follows CIP canonical rule.
- **Opt-in `max`**: ceiling 1M advertised, **600K effective** — lets you maximize the real ~600K window this model exposes. Same anti-erasure rules, just fewer splits per session.

**Rules (both modes, ceiling = $CEIL):**

1. Never grow beyond the **active ceiling** (`standard=120K` | `max=600K effective`) — treat as hard ceiling. In `max`, exceeding 600K triggers the same loss as exceeding 120K in `standard`.
2. Persist intelligence continuously to files in this workspace (`candidates/`, `HAZARDS.md`, `INDEX.md`, checkpoints) and to `.cip/` memory stores.
3. Complete one bounded unit of work before accumulating more context.
4. Summarize & checkpoint at logical milestones — **mandatory at 80% of active ceiling** (96K in standard, 480K in max).
5. `Read -> Act -> Persist -> Drop` — do not hold large code in context.
6. If a task cannot fit in active ceiling, split into sub-tasks with persisted state.

**Active mode is `state/loop.json:context_mode`** (`standard`|`max`) — overridable for one run by env `CIP_RESEARCH_CONTEXT` (`max`/`standard`/`600k`/`120k`) or `CIP_RESEARCH_CONTEXT_CEILING` (int). Toggle persisted mode:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/set-context-budget.ps1 max        # -> 1M/600K
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/set-context-budget.ps1 standard   # -> 120K
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/set-context-budget.ps1 status
```

This rule wins over any other instruction. See `CONTEXT-BUDGET.md` for threshold tables and when to use `max` (T2-T9 deep cross-file reads) vs `standard` (T0-T1 harness validation).

## How to run it

Use `/research` to start a single target, or `/research-loop` for the outer loop.

1. **Phase 0 — Framing.** Fill `FRAMING.md`: exact question, verification criterion, scope, budget, `Codebase / how to run checks` (must point at the CIP file + the Python harness command).
2. **Phase 1 — Broad exploration.** Spawn `generator` subagents (dozens). Expect ~90% to fail. Every failure → `deadends.md` with `<family>` tag + `Location:` file:line. A `literature` subagent seeds `FRAMING.md` "Known prior work" early (read `docs/`, `ontology.json`, `AGENTS.md` in CIP).
3. **Phase 2 — Deep fan-out.** `extender` deepens promising `candidates/`; `validator` adversarially attacks anything `READY FOR VALIDATION`. For CIP, validators **must WRITE+RUN an executed Python check** (`python repros/<name>.py` or `pytest`) against the real CIP code under `C:\0-BlackBoxProject-0\index` and deposit it in `repros/`.
4. **Artifacts.** `deadends.md` (tagged, greppable), `candidates/` (one file per idea, marked READY), `repros/` (runnable Python harnesses proving/refuting), `verified/` (synthesizer write-ups of SURVIVED VALIDATION).
5. **Phase 3 — Verification gate.** Counterexample search, independent re-derivation, edge-case checks, executed stress (`scripts/numerical_check.py` or repo tests). Verdict: REJECT / NEEDS WORK (with exact gap) / SURVIVED VALIDATION — never "verified."
6. **Phase 3.5 — Blind spot.** `blindspot` agent finds what the fleet is systematically missing.
7. **Phase 4 — Human review.** Route `verified/` to a CIP domain expert. Subagent validation is not human review.

## Outer loop (iterate many times)

- Queue: `state/targets.json` (priority-ordered). `targets.md` rendered from it.
- One target end-to-end: `/research-loop` prints plan via `scripts/research-loop.ts next`; you execute Phases 0-4; then `bun run scripts/research-loop.ts done <id> "<outcome>"` (or `pwsh` equivalent).
- **Cross-loop memory:**
  - `HAZARDS.md` — defect patterns H1-H15 seeded from the vivim-final loop + new CIP-specific ones. Every new `FRAMING.md` is seeded with relevant hazard IDs.
  - `INDEX.md` — per-target outcome accumulator.
  - `deadends.md` — never re-attempt a logged dead end, across ALL iterations.
- Budget: `state/loop.json` global (120). Per-target budget on each queue item. `scripts/check_budget.ps1` at 25/50/75/100% **plus context checkpoints at 40/60/80/95/100% of active ceiling** — run with `-ShowContext` to see context bar.
- Context mode: `state/loop.json:context_mode` (read at iteration start; see `CONTEXT-BUDGET.md`). Default `standard` (120K); `max` = 1M advertised / 600K real. Lead must announce active ceiling in Phase 0.
- PowerShell is the shell (`pwsh`). Use `python -m pytest`, `python repros/...py`, not `bun` (bun harnesses are vivim-final legacy; CIP harnesses are Python).

## Persistence

If fleet reports stuck, do NOT inject technical direction. Use `/keep-going` — original run's only intervention between total failure and result was "keep going / trust yourself."

## Budget

Run `check_budget` at 25/50/75/100% as forced go/no-go. A clean, documented failure is legitimate — mark `block`.
In MAX mode also watch the **context budget** (`pwsh scripts/check_budget.ps1 -ShowContext`): mandatory checkpoint at 80% (480K), hard stop at 100% (600K). See `CONTEXT-BUDGET.md`.

## Current loop status

**NEW HARNESS — 10 CIP targets queued, 0 done. Budget 0/120 (0%).** Ready for Phase 0 on `cip-indexer-incremental` (priority 0). See `state/targets.json` + `targets.md`.

## CIP-specific run notes

- **Context mode before fleet:** read `state/loop.json:context_mode` or `$env:CIP_RESEARCH_CONTEXT` at the very start of `/research` and `/research-loop`; print the active ceiling (120K vs 600K) so every subagent sizes its fan-out correctly (standard ~6-8 generators in parallel, max ~14-20 — see `CONTEXT-BUDGET.md`).
- **Workspace vs target separation:** This harness lives in `ideation/research-cip` but tests code in `index`. Every repro must import via absolute path or `sys.path` insertion (`C:\0-BlackBoxProject-0\index\lib`) — see `repros/README.md` for the pattern. Do NOT copy CIP source into this workspace.
- **Verification = executed Python.** Narrative claims without a `python repros/*.py` run that prints PASS/FAIL over concrete invariants are not evidence. Use `store.connect(tmpdir)` with a temp `.cip/` to avoid polluting the real index.
- **Hazard seeding:** Each new FRAMING.md must copy relevant H1-H15 IDs from HAZARDS.md into an `Invariants to test` / `Hazards to exercise` field so later targets attack with prior lessons.
- **Windows paths:** Use backslashes in shell (`C:\...`) and forward slashes inside Python imports. Quote paths with spaces.

