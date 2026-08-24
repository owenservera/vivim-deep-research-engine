VALIDATED

# Verified: Capability tier gate fails open on non-normalized `min_plan_tier`

## What was found
`CapabilityResolutionEngine.resolve()` / `search()` gate capabilities by plan
tier in `buildResult`:
```ts
if (tierRank(row.min_plan_tier) > tierRank(planTier)) continue;
```
`tierRank` returns `TIER_RANK[tier as PlanTier] ?? 0`. Any `min_plan_tier`
string that is not exactly a lowercase enum value (`free|pro|max|enterprise`)
falls through to `?? 0`, i.e. is treated as "free." The gate is then never
triggered and the capability is shown to **every** tier, including `free`.

A capability stored with `min_plan_tier = 'ENTERPRISE'`, `'Pro'`, `'MAX'`, or any
typo/case variant is therefore **not gated** — the entitlement boundary fails
open.

## How it was verified
Executed harness in `repros/capability-resolution.ts` (bun, mock
`CapabilityResolutionStore`), run against the real engine file. Results:
- I1 tier monotonicity (free ⊆ pro ⊆ max ⊆ enterprise): **PASS**
- I2a/I2b exact-case gating (free shows only free; pro gates max/ent): **PASS**
- I3 existential `==` / `!=` / `!` coercion, incl. numeric `3 == "3"`: **PASS**
- I4 `search` results ⊆ `resolve` results: **PASS**
- **I2c FAIL ×3**: rows with `min_plan_tier='ENTERPRISE'` and `'Pro'` are returned
  by `resolve('p','free')` and `resolve('p','pro')`; they must be excluded.

The failure was independently re-derived from `tierRank` source, so it is not a
harness artifact.

## Severity (honest)
- **Defect is real and deterministic** — confirmed by execution and code reading.
- **Production reachability is conditional** on whether provider data ever
  stores `min_plan_tier` in non-lowercase form. If a DB enum/CHECK enforces
  lowercase, the live path is unaffected — but any programmatic insert/migration/
  bootstrap that writes a non-normalized tier triggers it, and the engine is
  unsafe-by-default for untrusted input.
- This is **subagent validation**, not independent human-expert confirmation.

## Suggested fix
Normalize and fail closed in `tierRank`:
```ts
const t = (tier ?? 'free').trim().toLowerCase();
const known = TIER_RANK[t];
return known === undefined ? Number.MAX_SAFE_INTEGER : known; // unknown => most restrictive
```
Missing/null stays "free"; an unknown *value* becomes most restrictive and is
never accidentally exposed.

## Known gaps (blindspot)
The fleet did not test `_from` override-source precedence for non-tier fields,
cross-field interaction of existential + tier + dependency, or store-method
divergence between `resolve` and `search`. Recommended next targets.
