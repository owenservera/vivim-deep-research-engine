# General Runbook: Multi-Agent Deep Research Process

Use this for any hard, open-ended, verifiable question — math, a gnarly bug,
security research, an optimization problem, a "does this actually work" empirical
question. It does NOT work well for questions without a way to check the answer
(pure opinion, taste, unfalsifiable claims) — the whole engine runs on the
verification loop, so if you can't verify, this process just produces confident
nonsense faster.

## Before you start: the fit test

Ask these three questions. If you answer "no" to any, reconsider.

1. **Is there a real, checkable notion of "this is correct"?**
   (Numerical check, test suite, formal proof, reproducible experiment, existing
   literature to compare against.) If the only check is "does this sound right,"
   don't run this process — you'll get an extremely confident wrong answer.
2. **Is the domain one where prior published work likely exists that could be
   combined in a new way?** Most real progress here is synthesis, not creation
   from nothing. If you suspect the answer requires a genuinely novel primitive
   (not a combination of existing ones), expect a much lower success rate.
3. **Can you afford ~90%+ of your compute to produce nothing directly usable?**
   That's the honest base rate. If you need a guaranteed answer in one shot, this
   isn't that tool.

## Phase 0 — Framing (you do this, 10 minutes)

Write down:
- The exact question, as narrowly and precisely as you can state it
- What would count as a valid answer (the verification criterion)
- What's explicitly out of scope (don't let the fleet wander into adjacent
  unbounded problems — Claude wandered into the zeta bound as a side effect of a
  much bigger ask; that's fine when it happens organically, but don't design for
  scope creep)
- A rough compute/time budget you're willing to spend before declaring failure

Then hand the framed question to Claude Code with an **open, non-prescriptive
prompt**. Do not pre-suggest a strategy. The value of the process comes partly
from the model exploring unconstrained; over-specifying the approach in your
first prompt is the most common way people neuter this.

## Phase 1 — Broad exploration (expect near-total failure)

Instruct the lead Claude Code session to:
1. Generate a wide spread of candidate approaches (aim for dozens, not three)
2. Attempt each one at "cheap" depth — enough to tell if it's dead, not enough
   to fully develop it
3. Kill approaches fast. Do not let sunk cost keep a bad approach alive.
4. Log every attempt and why it failed, even briefly — this log becomes context
   for phase 2, and prevents the fleet from re-trying dead ends

Expect this phase to produce nothing you can use directly. Its job is to map the
space and to build up the working context (partial results, known dead ends,
relevant sub-lemmas or code patterns) that phase 2 needs.

**If Claude reports it's stuck or that the problem seems intractable**, this is
expected and is not a signal to stop. Respond with persistence, not new
information:
> "Keep going. Try combining approaches you haven't paired yet. Trust the
> process even if it feels like it's not working."

This is not a platitude — it's functionally load-bearing. The model's trained
skepticism about "I probably can't solve an open problem" is itself an obstacle
independent of actual capability, and a plain instruction to keep trying appears
to measurably help it push past that.

## Phase 2 — Deep parallel fan-out with specialized roles

Once phase 1 has mapped the terrain (or you've decided to go deep on a subset of
promising leads), spin up a subagent fleet with **explicit, differentiated roles**.
Don't just clone the same generic agent N times — role specialization is what
made the real process work.

Minimum viable role set (scale counts to your budget):

| Role | Count (rough ratio) | Job |
|---|---|---|
| **Generators** | ~20% of fleet | Develop genuinely new candidate ideas/approaches from the phase-1 map. Most will fail. That's fine. |
| **Extenders** | ~20% | Take a generator's partial idea and push it further, rather than starting fresh |
| **Validators / referees** | ~20% | Adversarially attack other agents' claimed results: look for counterexamples, check edge cases, verify computations independently |
| **Literature / prior-art** | ~10-15% | Search existing sources to (a) find building blocks to combine and (b) check the result isn't already known/solved |
| **Synthesizers / writers** | ~5-10% | Once something survives validators, write it up clearly and check it's internally consistent |
| **Failed attempts (expected)** | ~30-50% | Agents that tried and didn't produce anything. Don't treat this as a process failure — it's the base rate. |

Each subagent needs:
- The Phase 0 framing (question, verification criterion, scope)
- The Phase 1 dead-end log (don't re-attempt known failures)
- A clear, narrow individual task, not "go solve the whole thing"
- Instructions to report back concisely: what it tried, what happened, confidence

**What happens to a candidate that's NEEDS WORK, not REJECT or SURVIVED.**
This is the common case in practice and it's the easiest one to leave undefined
until you're mid-run and stuck. Close the loop before you start:
- A NEEDS WORK verdict must specify exactly what's missing — not "unclear,"
  but the specific gap (an unchecked case, a step that needs more support, a
  computation that wasn't actually run).
- It goes back to an extender (not the original generator — fresh eyes on the
  same partial idea), tagged with that specific gap as its task.
- Cap the number of NEEDS WORK → extend → re-validate cycles per candidate
  (e.g. 2-3) before you retire it to deadends.md as "promising but stalled" —
  distinct from a clean REJECT, since it may be worth revisiting with a
  different approach later, but shouldn't consume indefinite budget now.

**Budget checkpoints, not just a stated budget.** A number written in
FRAMING.md is easy to blow through once a fleet is actually running — nobody
naturally stops to check it mid-flow. Force explicit checkpoints instead of
relying on remembering to look:
- At 25%, 50%, and 75% of your stated budget (tokens, wall-clock, or session
  count — whatever you're tracking), require an explicit go/no-go: summarize
  what's been tried, what's still promising, and consciously decide to
  continue, narrow scope, or stop.
- Treat hitting 100% with nothing past Phase 2 as a trigger to stop and
  document, not a cue to quietly extend the budget because momentum feels
  good. If you do extend, make it a deliberate decision with a new explicit
  number, not a drift.

## Phase 3 — Mandatory adversarial verification gate

Nothing graduates out of the fleet without going through all of these, run by
agents *other than* the one that produced the result:

1. **Counterexample search** — actively try to break the claimed result, not
   just confirm it
2. **Independent re-derivation** — have a separate agent, given only the claim
   (not the original derivation), try to reach the same result by a different
   path. If it can't, that's a red flag, not proof of failure, but investigate.
3. **Prior-art deduplication** — search to confirm this isn't already published
   or already known. Being first matters both for credit and because "already
   known" results sometimes have known caveats/errors attached that you should
   inherit awareness of.
4. **Numerical / empirical stress test** — if the domain allows it, test the
   claim against as many concrete cases as feasible, not a handful.

Only after a result survives all four should you treat it as a real candidate.

**A hard limit on what this gate actually proves.** Every agent doing this
validation — including the "independent" re-derivation agent — is the same
underlying model as the one that produced the result. That's not independence
in the sense a human reviewer is independent. Subagent validation is good at
catching computational slips, logical gaps, and missed edge cases. It is much
weaker at catching a flaw in the *framing* itself — an assumption so natural to
the model that every subagent inherits it without questioning it, because it
comes from the same training rather than a genuinely different vantage point.
A SURVIVED VALIDATION verdict means "no subagent could break this." It does not
mean "no possible flaw exists." Don't let a clean verdict here substitute for
Phase 4.

## Phase 3.5 — Fleet blind-spot check

Because the whole fleet shares one model's training, its failures can be
correlated rather than independent: if there's a category of approach the model
just doesn't naturally reach for, every generator, extender, and validator can
share that same gap, and 60 agents missing the same thing looks identical to
60 agents doing careful, thorough work. This is cheap to check for and easy to
skip, so build it in rather than trusting you'll remember:

- Assign one agent (a generator or a dedicated pass) the explicit task: *"Given
  everything the fleet has tried so far, what category of approach would this
  whole fleet systematically be unlikely to consider? Argue for a genuinely
  different angle, subfield, or framing — not a variation on what's already
  been tried."*
- Do this once after Phase 1's broad map exists, and again if Phase 2 stalls.
- Treat its output as a candidate direction to actually feed back into
  Phase 1/2, not a curiosity to read and discard.

This costs one agent's worth of budget and is one of the cheapest hedges
available against the fleet confidently agreeing on a shared blind spot.

## Phase 4 — Human-in-the-loop expert review

Whatever your process, the ceiling of self-verification is real: a sufficiently
subtle error can survive counterexample search, re-derivation, and numerical
tests if the flaw is conceptual rather than computational — see the limit
noted at the end of Phase 3. Route the candidate result to a domain expert
human before treating it as fact. If Claude itself recommends this, don't
discount that as boilerplate caution — treat it as signal.

## Phase 5 — Write-up and (if applicable) formalization

- Have Claude produce a clear, standalone write-up of the result, aimed at
  someone expert in the field but unfamiliar with this specific derivation
- If the domain supports formal verification (Lean for math, a test suite +
  fuzzer for code, a reproducible benchmark for empirical claims), produce that
  artifact as an independent check, ideally built by a different session/agent
  than the one that found the result

## Reading the failure modes

- **If phase 1 produces zero interesting dead ends and no partial progress**,
  your framing is probably too vague or the problem may not decompose the way
  you think. Go back to Phase 0.
- **If your fleet converges on one approach immediately without exploring
  broadly**, you've probably over-specified the prompt. Loosen it.
- **If validators never reject anything**, they're not doing their job —
  they need explicit instructions to actively attack, not politely review.
- **If nothing ever graduates past Phase 3**, that's a legitimate outcome for a
  genuinely hard problem. The real Riemann attempt failed at its actual goal
  (proving RH) and only produced a side result. Don't force a weak result through
  because you spent a lot of compute; a well-documented failure with a clean
  dead-end map is still a useful output.
