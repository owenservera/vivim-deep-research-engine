---
description: Drive ONE iteration of the outer research loop against the next queued CIP target, then advance. Repeat to iterate "many times" over CIP critical IP.
argument-hint: <target-id optional>
---

You are running the **outer loop** for the multi-agent deep-research process, targeting `C:\0-BlackBoxProject-0\index` (CIP).

This command does ONE target end-to-end, then advances the queue. To iterate "many times", run it again until the queue is empty or budget hits 100%.

## Step 0 — pick / confirm the target
Run (from `research-cip` dir):
```powershell
bun run scripts/research-loop.ts next
# or: pwsh scripts/check_budget.ps1  # wrapper that also prints budget
```
This prints the next `pending` target (by priority), its rationale, the relevant HAZARDS ids to seed the framing, and the budget checkpoint. If an explicit `<target-id>` was passed to this command, operate on that target instead and mark it `start`.

Mark it in-progress:
```powershell
bun run scripts/research-loop.ts start <id>
```

## Step 1 — run the full single-target process
For THIS target, execute the deep-research loop as `/research` would:
1. **Phase 0 Framing** — overwrite `FRAMING.md`: exact question, verification criterion, scope, budget, and a **"Codebase / how to run checks"** section pointing at the CIP file(s) under `C:\0-BlackBoxProject-0\index\lib\cipkg\`. Seed `Invariants to test` from the HAZARDS ids printed by `next`.
2. **Phase 1 Generator fan-out** — dozens of generator passes. ~90% fail; each failure logged to `deadends.md` with a `<family>` tag. Generators MUST READ the CIP target code and write executed Python checks (see `repros/README.md`).
3. **Phase 2 Extender + Validator** — extend promising candidates; validators WRITE and RUN an actual Python check (`python repros/cip-*.py`) against the real CIP code and deposit it in `repros/`. Mark candidates `READY FOR VALIDATION`.
4. **Phase 3 Verification gate** — counterexample / independent re-derivation / edge-case / executed stress. Verdict: REJECT / NEEDS WORK / SURVIVED VALIDATION.
5. **Phase 3.5 Blindspot** — what category of CIP approach is the fleet missing? (Windows path case, vector cache staleness, watcher race, audit FP family, etc.)
6. **Phase 4 Synthesizer** — write `verified/<name>.md` for SURVIVED VALIDATION. Remember: ≠ confirmed (no human review yet).

If the fleet is stuck, do NOT inject new technical direction — emit `/keep-going` (trust the process). After one stuck-cycle, if still stuck, mark the target `block` with the reason.

## Step 2 — close the iteration + cross-loop learning
When the target is exhausted (defects found, or proven clean):
```powershell
bun run scripts/research-loop.ts done <id> "one-line outcome + artifacts: candidates/..., repros/..., verified/..."
```
This marks it `done`, increments iteration, and appends a summary to `INDEX.md`.

Then, for EVERY new defect pattern discovered, record it so future iterations are sharper:
```powershell
bun run scripts/research-loop.ts hazard "short pattern description" <id>
```
(Also update the candidate's `## Validation` with a `Suggested fix:` line.)

## Step 3 — loop
Re-run this command (`/research-loop`) for the next CIP target. The loop stops when:
- `next` reports queue empty, or
- budget checkpoint reaches 100% (`scripts/check_budget.ps1` forces a go/no-go at 25/50/75/100%).

## Notes
- Queue lives in `state/targets.json`; `render` writes `targets.md`.
- Cross-loop memory lives in `HAZARDS.md` (patterns), `INDEX.md` (outcomes), `deadends.md` (never re-attempt).
- For CIP, verification harnesses are Python. Every validator must have a `python repros/cip-*.py` run that prints PASS/FAIL over concrete invariants — no harness, no verdict.
- A single target done well is worth more than many shallow ones. A clean, documented failure is a legitimate output.
- The CIP 120K context ceiling is mandatory — persist to files, don't hold the whole index in context.

