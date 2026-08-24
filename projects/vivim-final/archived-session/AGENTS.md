# AGENTS.md — Lead session orientation

This workspace runs the **multi-agent deep-research process** described in the
three `0x-*.md` docs at the repository root (`01-what-actually-happened.md`,
`02-general-runbook.md`, `03-claude-code-implementation.md`). You are the lead
session. The heavy lifting is done by specialized subagents defined under
`.opencode/agents/`.

## How to run it

Use the `/research` command to start, or follow the orchestration prompt
inline. In short:

1. **Phase 0 — Framing.** Fill in `FRAMING.md`: the exact question, the
   verification criterion, scope boundaries, and a budget.
2. **Phase 1 — Broad exploration.** Spawn `generator` subagents (dozens).
   Expect ~90% to fail. Every failure is logged to `deadends.md` with a
   `<family>` tag so it's never re-attempted. A `literature` subagent seeds
   FRAMING.md's "Known prior work" early.
3. **Phase 2 — Deep fan-out.** `extender` subagents push promising candidates
   (in `candidates/`) further; `validator` subagents adversarially attack
   anything marked `READY FOR VALIDATION`. For code-IP problems, validators must
   write and RUN an actual check (test/fuzz) against the target codebase and
   deposit it in `repros/`.
4. **Artifacts.** `deadends.md` (tagged log, with `Location:` for code),
   `candidates/` (one file per idea, marked READY FOR VALIDATION), `repros/`
   (runnable checks proving/refuting a candidate), `verified/` (synthesizer
   write-ups of SURVIVED VALIDATION candidates).
5. **Phase 3 — Verification gate.** A candidate needs counterexample search,
   independent re-derivation, edge-case checks, and (if applicable) a real run
   of `scripts/numerical_check.py`. The verdict is REJECT / NEEDS WORK /
   SURVIVED VALIDATION — never "verified."
6. **Phase 3.5 — Blind spot.** A `blindspot` subagent checks what categories
   of approach the whole fleet is systematically missing.
7. **Phase 4 — Human review.** Route `SURVIVED VALIDATION` candidates (written
   up by `synthesizer` into `verified/`) to a human expert. Subagent validation
   is not independent human review.

## Outer loop (iterate many times)
The process above is ONE target. To run it repeatedly across VIVIM's critical
IP, drive the **outer loop**:

- The target **queue** is `state/targets.json` (priority-ordered). `targets.md`
  is rendered from it.
- A single command runs one target end-to-end and advances the queue:
  `/research-loop`. It prints the plan (via `scripts/research-loop.ts next`),
  you execute the Phase 0–4 process for that target, then
  `bun run scripts/research-loop.ts done <id> "<outcome>"`.
- **Cross-loop memory** is what makes "many times" better than "once":
  - `HAZARDS.md` — defect *patterns* (H1 permissive `??`, H2 provenance/value
    mismatch, H3 case sensitivity, H4 fail-open-on-unparseable, H5 paired-read
    divergence, H6 missing-context, H7 coercion, H8 unescaped-wildcard/LIMIT-before-filter,
    H9 code-exec denylist fails open, H10 inert/vetoed policy flag, H11 silent-no-op-on-empty/`??`-swallows-0, H12 failover-without-idempotency (duplicate side effects), H13 vocab-mismatch-across-fields + unvalidated-reference-returned, H14 missing-evidence-defaults-to-trusted-in-score, H15 divergent-side-effects-across-equivalent-code-paths). Each new `FRAMING.md` is
    **seeded with the relevant hazard IDs** so later targets are attacked with
    prior lessons. Append new patterns with `scripts/research-loop.ts hazard`.
  - `INDEX.md` — per-target outcome accumulator.
  - `deadends.md` — never re-attempt a logged dead end, across ALL iterations.
- Global budget is tracked in `state/loop.json`; the per-target budget is on
  each queue item. `scripts/check_budget.sh` forces go/no-go at 25/50/75/100%.
- Stop when the queue is empty or budget hits 100%. A clean, documented failure
  on a target is a legitimate loop output — mark it `block` and move on.

## Persistence

If the fleet reports being stuck, do **not** inject new technical direction.
Use `/keep-going` — the only intervention in the original run between total
failure and the result was "keep going / trust yourself."

## Budget

Run `scripts/check_budget.sh <spent> <budget>` at 25/50/75/100% as forced
go/no-go checkpoints. A clean, documented failure is a legitimate output.

## Loop status (last updated after final fix wave)
ALL 10 targets DONE. Budget 124/120 (103%, slightly over — finished the last
queued target at user request). Hazards H1–H15 captured. Every confirmed defect
is FIXED in vivim-final and re-verified by `repros/` regression harnesses
(see FIXES.md §1–14): 3 fail-open (§1–3), 5 careful-pass (§4–8), 6
design-ambiguous (§9–14) — the latter approved via PROPOSALS.md. No defects
remain open from the loop. All 14 `repros/` harnesses PASS. To extend, add
targets to state/targets.json and run `start <id>`.


---

## Framework reference (added 2026-08-24 by agent Kilo)
This session's framework is formalized at: DESIGN.md, ramework.json, ramework/core/agents/. The original workspace artifacts are preserved at: rchive/original-ideation/. See OWNER.md for customization rules.

