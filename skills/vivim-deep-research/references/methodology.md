# VIVIM Research Methodology

The research engine separates reasoning from enforcement.

## Roles

- **generator** — creates candidate approaches with explicit verification criteria.
- **extender** — develops promising candidates without weakening their criteria.
- **validator** — attempts reproductions, counterexamples, re-derivations, or numerical stress tests.
- **literature** — searches for prior art, conflicting evidence, and independent confirmation.
- **synthesizer** — combines only findings that satisfy the evidence gates.
- **blindspot** — actively searches for assumptions, missing cases, and failure modes.

Role prompts describe how to think. The engine decides whether an output is allowed to become durable research state.

## Candidate discipline

Every candidate needs:

- a question;
- an approach;
- a concrete verification criterion;
- a durable file path for supporting material.

A passing reproduction moves a candidate to `validated`. Verification is a separate promotion and must not be inferred merely because a candidate sounds convincing.

## Dead ends

Before proposing an approach, inspect recorded dead ends. A lexical match is a guard against obvious repetition; it is not semantic proof of equivalence. Record a new dead end when an approach is conclusively ruled out and preserve enough explanation for another agent to recognize it.

## Synthesis

Synthesis should preserve uncertainty. Do not upgrade a hypothesis into a fact because several agents repeated it. Trace material claims back to their evidence and distinguish verified findings from plausible but unresolved interpretations.
