claimed-by: lead (iteration 7, trust-score)
READY FOR VALIDATION

# Candidate: TrustScoreEngine — missing evidence scores as trusted (fail-open)

## Approach / claim
`TrustScoreEngine` (src/engines/trust-score.ts) computes a 0–100 trust score,
but its factors **default to a permissive/positive value when evidence is
absent**, so a provider or capability with zero data is scored as meaningfully
trusted.

1. **D1 (missing data -> trusted — H1/H4 family, fail-open).** Several factors
   return MAX trust on missing data:
   - latency: no rows → `p95([]) === 0` → `0 < 3000` → score **100**.
   - circuit: no circuits → score **100**.
   - drift: no drifts → score **100**.
   while success/selector/auth default to neutral 50. A brand-new provider with
   no outcomes/circuits/drifts/accounts/selectors scores **68/100** (weighted
   average) — i.e. "trusted" with zero evidence.
   `computeOperationScore` returns **50** (medium) when there are zero outcomes —
   an unproven capability is treated as medium-trust, not low/untrusted.
2. **D2 (substring match — H7 family).** Circuit matching uses
   `c.slaveId.includes(providerId)` (string *containment*), not equality, so
   providerId `'p1'` matches an unrelated `slaveId: 'p1-evil'`.

## Why it seems promising
Executed check `repros/trust-score.ts` (fake CapStoreDb, no prisma) → ALL PASS
(6/6): no-data provider scores 68; latency/circuit/drift = 100 on missing data;
operation score = 50 on zero outcomes; `'p1'` matched `'p1-evil'` via includes.

## What needs to be checked next
- Whether the score gates any autonomous/allow decision (if so, 68/100 for
  unknown providers is a real fail-open); if it's only a display badge, lower
  severity.
- Whether `slaveId` is expected to be an exact provider id (then includes is a
  clear bug) or a compound string (then it needs token-aware equality).

## Confidence
High for both (executed). Severity: D1 is a genuine "absence of evidence →
trust" bias that fails open; D2 is a comparison bug with false-positive circuit
penalties/matches.
