claimed-by: lead-smoke-test
READY FOR VALIDATION

# Candidate A — `(n > 0) && (n & (n - 1)) == 0`

## Approach
The bit-trick: a power of two has exactly one bit set, so `n & (n-1)` clears
the lowest set bit and yields 0; the `n > 0` guard excludes 0 (which otherwise
passes the bit check vacuously).

## Why it seems promising
- O(1), branch-light, no floats, no loops.
- Matches the reference oracle exactly over the verification set.

## What needs to be checked next
- Adversarial edge cases (validator): n=0, n=1, n=2^31, n=0xFFFFFFFF,
  0xFFFFFFFE, large non-powers.
- Confirm it stays correct under the actual 32-bit unsigned semantics the
  runtime uses (two's-complement `-n`, not Python arbitrary ints).

## Confidence
High (within the stated 32-bit scope).

## Validation (validator agent, 2026-08-23)
1. **Counterexample search**: 200,009 samples (all 2^k in 32-bit, boundaries,
   200k random) — NONE found where A disagrees with the oracle.
2. **Independent re-derivation**: the `n>0` guard + `n&(n-1)==0` bit-clear test
   was derived independently and matches the oracle by construction.
3. **Edge cases**: n=0 (False), n=1 (True), n=2 (True), n=3 (False),
   n=2^31 (True), 0x80000000 (True), 0xFFFFFFFF (False), 0xFFFFFFFE (False) —
   all correct under 32-bit unsigned semantics.
4. **Numerical stress test**: ran `scripts/_validate.py` — agrees on every
   checked value.

**Verdict: SURVIVED VALIDATION.** No subagent could break candidate A within
the 32-bit unsigned scope. This is NOT independent human-expert confirmation —
it is a claim about what the fleet couldn't break. A human expert should still
review before treating it as established. (Note: the float-`log2` approach C is
correct in 32-bit but throws on n=0 without a guard and is precision-fragile
beyond 2^53; A is the more robust efficient choice.)
