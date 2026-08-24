# Verified write-up: most efficient correct "power of two" test (32-bit unsigned)

**Status: SURVIVED VALIDATION only. Not yet independently human-expert reviewed.**

## Precise claim
For unsigned 32-bit integers `n`, the expression

```
(n > 0) && ((n & (n - 1)) == 0)
```

returns true iff `n` is a power of two (n == 2^k, k >= 0), and is among the
most efficient correct tests.

## Key idea (plain)
A power of two has exactly one 1-bit. `n & (n-1)` clears that lowest 1-bit; if
the result is 0 the number had only one bit to begin with. `n > 0` excludes 0,
which would otherwise pass vacuously.

## Argument
- If n = 2^k: its binary is a single 1 followed by zeros; n-1 flips that bit
  and all lower bits to 1; AND yields 0. Guard keeps n=0 out.
- If n has >= 2 bits set: n-1 leaves the next-higher set bit intact, so the AND
  is nonzero.
- O(1), no floats, no loops. Alternative B `(n>0)&&(n&-n)==n` is equivalent.

## What was checked
- Counterexample search over 200k+ samples + all 2^k + boundaries: none found.
- Edge cases (0, 1, 2, 3, 2^31, 0x80000000, 0xFFFFFFFF, 0xFFFFFFFE): all correct
  under 32-bit unsigned semantics.
- Numerical stress test via `scripts/_validate.py`: full agreement.

## What remains uncertain
- Subagent validation shares one model's blind spots; a conceptual framing error
  could survive. Float-`log2` (approach C) is correct in 32-bit but not robust
  beyond 2^53 — keep scope discipline if widened.
- Runtime two's-complement semantics for `-n` (relevant to variant B) should be
  confirmed in the actual deployment language.

## Recommendation
Have a human expert review before treating as established. This write-up has
not had independent human expert review.
