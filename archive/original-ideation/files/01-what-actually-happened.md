# What Actually Happened: The Riemann Zeta Result, Decoded

Before you build a process around this, it's worth being precise about what it was
and wasn't, because the honest version is what makes the runbook useful instead of
cargo-cult mysticism.

## The claim, precisely

An unreleased research version of Claude (not any publicly available model) improved
a lower bound in analytic number theory: the proportion of nontrivial zeros of the
Riemann zeta function *provably* on the critical line, from 41.6% to 67.2%. This is
**not** progress toward proving the Riemann hypothesis itself — it's a separate,
narrower, well-defined technical question that number theorists have worked on for
decades. Anthropic and outside experts (Brian Conrey, Dan Goldston) are explicit that
this technique has no path to the full hypothesis.

Claude did not invent new mathematics from nothing. It **combined three existing
published results** (Aryan 2019; Baluyot–Goldston–Suriajaya–Turnage-Butterbaugh's
2023/2025 papers; Bombieri 2000) in a way no human had assembled — extending
Montgomery's 1973 pair-correlation technique (previously valid only *assuming* RH)
into an unconditional form usable for the bound, then combining it with Bombieri's
work on a quadratic form argument. The "novel" step was mathematical courage/insight
in treating the whole space jointly (positive- and negative-definite subspaces
together, non-diagonal quadratic form) rather than a genuinely new object.

**This is the generalizable pattern**: literature synthesis + willingness to try a
combination nobody else tried + relentless verification. Not new axioms, not magic.

## The actual process, step by step

1. **Open-ended prompt, no math from the human.** A non-mathematician staff member
   said "take a real stab at the Riemann hypothesis." No hints, no papers pointed to,
   no strategy suggested.

2. **First pass: broad, cheap exploration, expect total failure.**
   Claude generated and attempted 650 distinct ideas. All failed. This is the
   overwhelming majority of the compute and it produced nothing directly usable —
   its value was in mapping the space and (implicitly) building context for pass two.

3. **Persistence signal from the human, not technical guidance.**
   The only intervention between pass one failing and pass two succeeding was
   "try again" / "keep going" / "trust yourself." No new information entered the
   system. This matters: the model's own trained-in skepticism about "open problems
   are basically unsolvable by me" was the main obstacle, not lack of capability.

4. **Second pass: massive parallel subagent fan-out with role specialization.**
   About 60 subagents, ~1.5 days, 2,400 shell commands, hundreds of Python scripts,
   thousands of numerical checks against known zeta zeros. Roles were **not**
   uniform — they were specialized and the specialization was mostly emergent:
   - 2 agents developed the actual key idea
   - 13 agents fed supporting ideas into those 2
   - 30 agents tried and failed (this is normal and expected — half the fleet)
   - 13 agents acted as adversarial validators/referees on the others' work
   - 2 agents wrote up the result as a paper

5. **Self-directed adversarial verification, not just "check your work."**
   Once Claude believed it had something, it didn't stop — it had subagents:
   - search for counterexamples against the claim
   - download and check 54 arXiv papers to rule out the result already existing
   - **independently re-derive the result from scratch** as a second proof path
   - numerically test the claim against thousands of known zeros

6. **External validation was requested by Claude, not imposed.**
   Claude itself recommended a human number theorist validate the findings before
   anyone suggested it. Two Anthropic mathematicians (Alpöge, Furman) then examined
   it, two outside experts (Conrey, Goldston) reviewed it, and the result was
   separately formalized in Lean (machine-checkable proof) with another staff member.

## What will and won't transfer to you

**Won't transfer:**
- Raw compute/token budget (31M output tokens across two long sessions — that's a
  lot of dollars and a lot of wall-clock even at API rates)
- Model capability ceiling (unreleased research model, likely beyond anything
  publicly available to you right now)
- The literature depth — Claude's training gave it fluent command of decades of
  analytic number theory papers; if your domain's Claude doesn't have that same
  depth of prior art memorized, literature search becomes a much bigger, more
  fallible bottleneck

**Will transfer:**
- The open-ended prompt + persistence-only follow-ups pattern
- Broad cheap exploration before narrow deep exploration (expect ~90%+ of ideas to
  fail — that's not a bug in your process, it's the process)
- Subagent role specialization: generators, critics/validators, and a
  literature/synthesis role are the three you actually need
- Adversarial self-verification as a mandatory gate, not an afterthought:
  counterexample search, independent re-derivation, literature deduplication
- Treating "Claude recommends human expert review" as a real signal to act on,
  not a hedge to ignore

The next two documents give you a runbook and the actual Claude Code implementation.
