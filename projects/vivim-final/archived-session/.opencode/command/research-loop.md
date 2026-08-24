---
description: Drive ONE iteration of the outer research loop against the next queued target, then advance. Repeat to iterate "many times" over VIVIM critical IP.
argument-hint: <target-id optional>
---

You are running the **outer loop** for the multi-agent deep-research process.
This command does ONE target end-to-end, then advances the queue. To iterate
"many times", run it again (or chain it) until the queue is empty or the budget
hits 100%.

## Step 0 — pick / confirm the target
Run:
```
bun run scripts/research-loop.ts next
```
This prints the next `pending` target (by priority), its rationale, the
relevant HAZARDS ids to seed the framing, and the budget checkpoint. If an
explicit `<target-id>` was passed to this command, operate on that target
instead and mark it `start`.

Mark it in-progress:
```
bun run scripts/research-loop.ts start <id>
```

## Step 1 — run the full single-target process
For THIS target, execute the deep-research loop as `/research` would:
1. **Phase 0 Framing** — write `FRAMING.md`: exact question, verification
   criterion, scope, budget, and a **"Codebase / how to run checks"** section
   pointing at the target path. Seed `Invariants to test` from the HAZARDS ids
   printed by `next` (e.g. H1 permissive `??`, H2 provenance/value mismatch).
2. **Phase 1 Generator fan-out** — dozens of generator passes. ~90% fail; each
   failure is logged to `deadends.md` with a `<family>` tag. For code-IP
   targets, generators READ the target code and write executed checks.
3. **Phase 2 Extender + Validator** — extend promising candidates; validators
   WRITE and RUN an actual check (bun/pytest) against the target and deposit it
   in `repros/`. Mark candidates `READY FOR VALIDATION`.
4. **Phase 3 Verification gate** — counterexample / independent re-derivation /
   edge-case / executed stress. Verdict: REJECT / NEEDS WORK / SURVIVED
   VALIDATION.
5. **Phase 3.5 Blindspot** — what category of approach is the fleet missing?
6. **Phase 4 Synthesizer** — write `verified/<name>.md` for SURVIVED VALIDATION
   candidates. Remember: SURVIVED VALIDATION ≠ confirmed (no human review yet).

If the fleet is stuck, do NOT inject new technical direction — emit
`/keep-going` (trust the process). After one stuck-cycle, if still stuck, mark
the target `block` with the reason.

## Step 2 — close the iteration + cross-loop learning
When the target is exhausted (defects found, or proven clean):
```
bun run scripts/research-loop.ts done <id> "<one-line outcome + artifacts>"
```
This marks it `done`, increments the iteration counter, and appends a summary
to `INDEX.md`.

Then, for EVERY new defect pattern discovered, record it so future iterations
are sharper:
```
bun run scripts/research-loop.ts hazard "<short pattern description>" <id>
```
(Also update the candidate's `## Validation` with a `Suggested fix:` line.)

## Step 3 — loop
Re-run this command (`/research-loop`) for the next target. The loop stops when:
- `next` reports the queue empty, or
- the budget checkpoint reaches 100% (`scripts/check_budget.sh` forces a go/no-go
  at 25/50/75/100%).

## Notes
- The target queue lives in `state/targets.json`; `render` writes `targets.md`.
- Cross-loop memory lives in `HAZARDS.md` (patterns) and `INDEX.md` (per-target
  outcomes) and `deadends.md` (never re-attempt logged dead ends).
- A single target done well is worth more than many shallow ones. Budget is per
  target; a clean, documented failure is a legitimate output.
