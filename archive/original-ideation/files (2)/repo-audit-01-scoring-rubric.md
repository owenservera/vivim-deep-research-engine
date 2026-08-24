# Scoring Rubric: What Counts As a Core Enhancement

This is the piece that didn't exist in the math version and has to exist here.
"Prove the Riemann bound" has an unambiguous verification criterion. "Find the
5 best enhancements to a codebase" does not, by default — it's just opinion
unless you force it through a rubric. This document is that rubric. Every
candidate enhancement gets scored against it before it's allowed to compete for
one of the final 5 slots.

## The fit test (before scoring anything)

Same spirit as the math runbook's fit test — check these before running the
full process:

1. **Is the repo in a state where static analysis actually works?**
   (Builds, has a dependency manifest, isn't a half-migrated mess with two
   competing package managers.) If not, "fix the build" is probably enhancement
   #1 by default and the rest of the process runs after that's true.
2. **Do you have or can you generate a way to measure impact?**
   (Test suite for correctness claims, benchmarks for performance claims,
   dependency audit tooling for security claims.) An enhancement claim with no
   way to check it did what it claimed doesn't get to be in the top 5 — it gets
   flagged as "plausible but unverifiable, deprioritized."
3. **Is this a repo where "enhancement" means something bounded?**
   If the honest answer to "what's wrong with this repo" is "it needs a
   rewrite," the process should surface that as a finding, not force 5
   incremental items to paper over an architectural problem.

## The five scoring dimensions

Every candidate enhancement gets scored 1-5 on each dimension. No dimension is
optional and no candidate skips straight to a total score — the breakdown is
the point, because it's what lets you and your AI sanity-check the ranking
instead of trusting a single number.

### 1. Evidence strength (1-5)
How solid is the claim that this is actually a problem, not a hunch?
- **5** — Reproducible: a failing test, a benchmark number, a CVE match, a
  static analysis finding with a concrete file:line, a profiler trace
- **3** — Strong circumstantial evidence: a clear code smell pattern repeated
  many times, a dependency with a known-bad track record, a pattern that
  contradicts the project's own conventions elsewhere in the repo
- **1** — Stylistic opinion or "best practice" asserted without repo-specific
  evidence it matters here

### 2. Impact if fixed (1-5)
What actually changes if this is addressed?
- **5** — Prevents a real class of bugs/incidents, closes a security hole,
  or removes a measured performance bottleneck on a hot path
- **3** — Meaningfully improves maintainability, test coverage of a
  currently-risky area, or developer velocity
- **1** — Cosmetic; no behavioral, security, or velocity change

### 3. Blast radius / risk of the fix itself (1-5, scored as risk — lower is better, then inverted for ranking)
How dangerous is making this change?
- **5 (low risk)** — Isolated, well-tested area, easy to revert
- **3** — Touches a moderately-used path; needs real test coverage before/after
- **1 (high risk)** — Touches core/shared logic, poorly tested, high blast
  radius if wrong

### 4. Effort to implement (1-5, scored as ease — lower effort scores higher)
- **5 (low effort)** — Hours, mechanical, low judgment required
- **3** — Days, some design judgment, moderate scope
- **1 (high effort)** — Weeks, architectural, requires design discussion

### 5. Confidence this isn't already known/intentional (1-5)
Mirrors the math runbook's prior-art deduplication — is this actually new
information, or something the team already knows and has a reason for?
- **5** — No comment, ADR, issue, or TODO references this; genuinely appears
  unaddressed
- **3** — Some ambiguous signal (an old TODO, a closed issue that seems related)
- **1** — There's a clear comment, ADR, or design doc explaining this is
  intentional — if you land here, the candidate should almost always be
  dropped, not just scored low, unless there's strong evidence the original
  reasoning no longer holds

## Composite score and ranking

```
composite = evidence(1-5) + impact(1-5) + (6 - blast_radius_risk) + effort_ease + confidence_novel(1-5)
```

Range: 5 (worthless) to 25 (extremely strong). This is a **ranking aid, not a
verdict** — always present the breakdown, never just the number, because two
candidates can hit the same composite for very different reasons (a low-risk
cosmetic fix vs. a high-impact risky one), and that difference should be a
visible tradeoff you and your AI decide on, not one collapsed into a tie.

## Hard disqualifiers (auto-exclude regardless of score)

- Confidence-novel score of 1 with no evidence the original reasoning is stale
- No verification path exists at all (fails fit test #2) and the claim can't
  be made falsifiable even in principle
- The "fix" requires a breaking change to a public API/contract without that
  being flagged loudly and separately — never silently bundle this into a
  "top 5 enhancements" list as if it's routine

## What "5" actually means

Don't pad to 5 and don't force-fit. If the adversarial verification stage
(see the runbook) only leaves 3 candidates that survive, report 3 and say why,
the same way the math process was willing to report "produced nothing usable"
as a legitimate outcome. A 4th and 5th item scored just to hit a round number
is a worse output than an honest 3.
