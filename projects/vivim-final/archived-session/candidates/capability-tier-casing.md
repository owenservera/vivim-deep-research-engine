claimed-by: lead-smoke-test
READY FOR VALIDATION

# Candidate: Capability tier gate fails open on non-normalized `min_plan_tier`

## Approach / claim
`CapabilityResolutionEngine` gates capabilities by plan tier in `buildResult`:
`if (tierRank(row.min_plan_tier) > tierRank(planTier)) continue`. `tierRank`
does `TIER_RANK[tier as PlanTier] ?? 0`. The `?? 0` fallback means **any
`min_plan_tier` string that is not exactly one of the lowercase enum values
(`free|pro|max|enterprise`) is assigned rank 0** — i.e. treated as "free."

Consequence: a capability whose stored `min_plan_tier` is `'ENTERPRISE'`,
`'Pro'`, `'MAX'`, or any typo/case variant is **never gated** and is shown to
every tier, including `free`. The entitlement gate **fails open**.

## Why it seems promising
Backed by an **executed** bun harness against the real engine:
- I1 tier monotonicity: PASS.
- I2a/I2b exact-case gating (free/pro/max/enterprise): PASS.
- I3 existential `==`/`!=`/`!` coercion (incl. numeric `3 == "3"`): PASS.
- I4 `search` ⊆ `resolve`: PASS.
- **I2c FAIL ×3**: rows with `min_plan_tier='ENTERPRISE'` and `'Pro'` are
  returned by `resolve('p','free')` and `resolve('p','pro')` — they should be
  excluded. Exact observed: `entUpper` and `proMixed` present in free/pro result
  sets (should be absent).

## What needs to be checked next
- **Reachability / severity**: only triggers if provider data stores
  `min_plan_tier` in non-lowercase form. If all rows are normalized at write
  time, production is unaffected — but the engine should be defensive.
- Whether the store/seed/bootstrap ever produces mixed-case tiers.
- Minimal fix: normalize casing (`tier.trim().toLowerCase()`), and treat an
  *unknown* tier as **most restrictive** (rank = max) or throw, instead of rank 0.

## Confidence
High the defect is real (executed, deterministic). Medium on production impact
(depends on data normalization upstream).

## Validation (validator agent, 2026-08-23)
Ran `repros/capability-resolution.ts` against the real engine and attacked the claim.

1. **Counterexample search**: I2c reproduced — rows with `min_plan_tier='ENTERPRISE'`
   and `'Pro'` appear in `resolve('p','free')` and `resolve('p','pro')` result
   sets; the harness asserts their absence and FAILS, confirming the gate opens.
2. **Independent re-derivation**: read `tierRank()` — `TIER_RANK[tier as PlanTier] ?? 0`.
   For `'ENTERPRISE'` the map lookup is `undefined`, so rank = 0. Gate condition
   `0 > tierRank('free'=0)` is false → capability is NOT skipped → included. The
   defect follows directly from the code, independent of the harness.
3. **Edge / boundary check**:
   - `'Pro'`, `'MAX'`, `'Enterprise'` (any non-lowercase) → rank 0 → not gated.
   - `null` / `''` / missing `min_plan_tier` → also rank 0 → shown to all. The
     missing case is arguably "intended = free," but an *unknown* string (e.g. a
     future tier the engine doesn't know) is also silently treated as free —
     that is unambiguously wrong (a new restricted tier would be exposed).
4. **Empirical stress test**: executed (I1–I4). I2c is the ONLY failure; all
   other invariants (monotonicity, exact-case gating, existential coercion,
   search⊆resolve) PASS. So the break is isolated to the case/normalization of
   the tier token, not to the gating logic generally.

**Adversarial counterargument (considered):** the store may enforce
`min_plan_tier` via a DB enum/CHECK constraint, so non-lowercase values can never
be stored → the bug is unreachable in production. Resolution: even if true, the
engine is the unit under test and **fails open on any input it receives**, which
is a latent defect and a footgun for any code path that inserts/updates tiers
programmatically (migrations, API, bootstrap). The fix is cheap and strictly
safer. Severity is therefore **conditional on data hygiene but the defect is
real**.

**Suggested fix (one line):** in `tierRank`, normalize and fail closed —
```ts
const t = (tier ?? 'free').trim().toLowerCase();
const known = TIER_RANK[t];
return known === undefined ? Number.MAX_SAFE_INTEGER : known; // unknown => most restrictive
```
(missing/null → 'free' as before; unknown *value* → max rank, never exposed.)

**Verdict: SURVIVED VALIDATION** — the gate-fails-open defect is confirmed by
executed evidence and by independent code reading; production reachability is
conditional on upstream normalization, but the engine should be defensive. This
is subagent validation, NOT independent human-expert confirmation.
