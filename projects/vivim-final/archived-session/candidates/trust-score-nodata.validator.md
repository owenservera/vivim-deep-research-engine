validated-by: lead (iteration 7, trust-score)
VERIFIED

# Validation: TrustScoreEngine — missing evidence scores as trusted

## Check type
Executed reproduction against the real `TrustScoreEngine` imported from
`C:/0-BlackBoxProject-0/vivim-final/src/engines/trust-score.ts`, using a fake
`CapStoreDb` (all `prisma.*.findMany` return empty/configurable arrays).
File: `repros/trust-score.ts`.

## How to run
```
cd C:\0-BlackBoxProject-0\ideation\project
bun run repros/trust-score.ts
```

## Result
ALL PASS (exit 0), 6/6:
- D1: no-data provider `overallScore === 68` (trusted despite zero evidence).
- D1: latency = 100 on no latency data; circuit = 100 on no circuits; drift =
  100 on no drifts.
- D1: `computeOperationScore` returns 50 (medium) on zero outcomes.
- D2: providerId `'p1'` matched unrelated `slaveId: 'p1-evil'` via
  `slaveId.includes(providerId)` (circuitScore dropped to 0).

## Verdict
Confirmed. Missing evidence is scored as positive/trusted (latency/circuit/drift
hit 100 on empty data; operation score 50 on no outcomes), inflating scores for
unproven providers/capabilities. Circuit matching uses substring containment
instead of equality.

Suggested fixes:
- Default missing-evidence factors to a conservative (low) value, or explicitly
  separate "unknown" from "good"; consider a confidence/evidence-count modifier
  so no-data scores low, not 68.
- Make `computeOperationScore` return a low/untrusted default (or require a
  minimum sample count) when there are no outcomes.
- Match circuits by exact `slaveId === providerId` (or token-aware equality), not
  `.includes`.
