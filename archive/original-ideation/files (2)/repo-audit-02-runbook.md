# Runbook: Repo Enhancement Audit (Adapted from the Deep-Research Process)

This maps every phase from the general research runbook onto "point this at a
repo, get 5 scored, evidence-backed enhancements." Same skeleton — broad
exploration, specialized fleet, mandatory adversarial verification, human
review — different content in each phase because the domain is code, not
open-ended math.

Read `01-scoring-rubric.md` first. Nothing in this process means anything
without it — the rubric is what stops this from being "AI opinion dressed up
as analysis."

## Phase 0 — Framing (you do this, or your AI does it as its first step)

Fill in `AUDIT_FRAMING.md` (template in the implementation doc):
- Repo path/URL, primary language(s)/stack
- What "enhancement" is in scope: security / performance / architecture /
  test coverage / dev experience / dependency health / all of the above
- What's explicitly out of scope (e.g. "don't propose framework migrations,"
  "don't touch the payments module," "ignore generated code directories")
- Available verification tooling: does the repo have tests? benchmarks? a
  linter config? CI? If any are missing, note that — it changes what evidence
  strength is achievable for candidates in that area
- Budget (time/token, same as before)

## Phase 1 — Broad scanning (expect most findings to not survive)

Instead of one lead session generating math ideas, this phase runs **parallel
scanner passes across dimensions**, each cheap and broad, not deep:

- Security scan (dependency vulnerabilities, obvious injection/auth patterns,
  secrets in code, unsafe deserialization, etc.)
- Performance scan (obvious N+1 patterns, unbounded loops over unbounded data,
  missing indices if there's a DB layer, synchronous I/O on hot paths)
- Architecture/maintainability scan (circular dependencies, god objects,
  duplicated logic, inconsistent patterns across similar modules)
- Test coverage scan (what's untested, especially in code that's changed
  recently or is architecturally central)
- Dependency health scan (outdated/abandoned packages, license issues, version
  conflicts)
- Dev experience scan (build time, flaky tests, unclear setup, missing docs
  for non-obvious things)

Each scan produces a **long, unfiltered candidate list** — dozens of findings,
each just a pointer (file/line + one-line description), no scoring yet. Expect
the overwhelming majority to be minor or already-known. That's fine, same as
the math process expecting 90%+ failure — the point of phase 1 is coverage,
not quality.

Log everything, including things immediately judged not worth pursuing, to
`triaged_out.md` with a one-line reason — this is the equivalent of
`deadends.md` and it matters for the same reason: so nothing gets re-surfaced
and re-investigated later by a different agent that didn't see it get triaged.

## Phase 2 — Deep investigation with specialized roles

Take the candidate list from Phase 1 and fan out. Roles, adapted from the math
version:

| Role | Job |
|---|---|
| **Investigators** | Take one candidate finding, dig into it properly: reproduce it, quantify it (benchmark, failing test, concrete exploit sketch), check how widespread the pattern is across the repo |
| **Context researchers** | The "literature" role, adapted: search the repo's own git history/blame, issues, PRs, comments, ADRs/docs for why the current code is the way it is — this is what feeds the rubric's "confidence this isn't already known/intentional" dimension |
| **Validators** | Adversarial, same as before: try to prove the finding is wrong, overstated, or already mitigated elsewhere; actually run the relevant tests/linters rather than reasoning about it |
| **Scorers** | Apply the rubric from doc 1 explicitly, dimension by dimension, to every candidate that survives investigation + validation |
| **Synthesizer** | Assembles the final ranked list in the fixed output format (doc 4) |

This is where "most candidates fail" plays out again: a long Phase 1 list
should collapse hard once investigators actually dig in and validators attack
what's left. If it doesn't collapse much, that's a signal your validators
aren't being adversarial enough — see the failure-mode notes at the end.

## Phase 3 — Mandatory verification gate (adapted)

Every candidate that wants a scored slot must pass:

1. **Reproduction, not assertion** — the finding must be demonstrated: a
   failing test written against the current bug, a benchmark run showing the
   actual number, an actual `npm audit`/`pip-audit`/equivalent hit, not "this
   looks slow." If it can't be reproduced, it caps at evidence score 2-3 and
   should be flagged as such, not hidden.
2. **Intentionality check** — context researcher confirms there's no ADR,
   comment, or design rationale explaining this is deliberate. If there is,
   default to dropping the candidate (see rubric's hard disqualifiers).
3. **Regression check on the proposed fix** — for anything with an actual
   proposed change (not just "this is a problem"), run the existing test
   suite against a draft fix. If there's no test suite, say so explicitly
   rather than silently skipping this step.
4. **Duplicate/overlap check** — make sure candidates aren't really the same
   underlying issue described 3 different ways (very common — an architecture
   issue and 4 of the "duplicated logic" findings are often one root cause).
   Merge these before scoring, don't score the same root cause 4 times to pad
   the list.

## Phase 3.5 — Blind-spot check (adapted)

Same idea as the math version: one pass explicitly asking "what category of
issue would a scan built this way be unlikely to surface?" For code audits,
common blind spots worth naming explicitly and checking for:
- Issues that only show up under production load/scale, not visible in repo
  inspection alone
- Organizational/process issues masquerading as code issues (e.g. the real
  problem is no code review on a certain module, not any single bug in it)
- Anything requiring domain knowledge the AI doesn't have (business logic
  correctness, regulatory requirements) — flag these as "needs domain expert
  input," don't guess

## Phase 4 — Human-in-the-loop review

Non-negotiable, same as the math version, for the same reason: a fleet built
from one model can share blind spots, and code review by the actual team
catches things a scoring rubric can't. The output format (doc 4) is designed
specifically to make this review fast — score breakdown visible, evidence
linked, so a human can sanity-check in minutes, not re-derive everything.

## Phase 5 — Output

Exactly the fixed template in `04-output-template.md`. Not a narrative report,
not markdown prose with varying structure between runs — same shape every
time, so you can diff two audits of the same repo over time and so your AI
can consume it programmatically if you want to pipe it into ticket creation
later.

## Reading the failure modes (adapted)

- **If Phase 1 produces almost nothing** — the repo may genuinely be in good
  shape, or your scan prompts are too narrow. Try widening scan dimensions
  before concluding the repo is clean.
- **If everything from Phase 1 survives to Phase 2 unchanged** — investigators
  aren't actually digging in, they're rubber-stamping. Tighten their
  instructions to require reproduction, not description.
- **If validators never disqualify anything** — same failure as the math
  process: they need to be told explicitly to attack, not review politely.
- **If you consistently get exactly 5 with suspiciously similar scores** —
  suspect padding to hit the round number. Check `triaged_out.md` — if it's
  short, the fleet probably isn't being selective enough upstream.
- **If most top candidates score low on "confidence this isn't already
  known"** — the context researchers aren't checking git history/issues
  thoroughly enough, or the team's documentation genuinely doesn't capture
  their own reasoning (which is itself worth surfacing as a finding).
