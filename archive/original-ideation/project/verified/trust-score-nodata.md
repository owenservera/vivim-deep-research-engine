# Verified: trust-score — missing evidence scores as trusted (fail-open)

- target: `C:/0-BlackBoxProject-0/vivim-final/src/engines/trust-score.ts`
- defects:
  - D1: factors default to permissive/positive on missing data — latency/circuit/
    drift return 100 when evidence is absent; success/selector/auth return 50.
    Net: a provider with zero evidence scores 68/100 (trusted); an operation with
    zero outcomes scores 50 (medium). Absence of evidence is treated as trust.
  - D2: `circuitBreakerState` matched via `c.slaveId.includes(providerId)`
    (substring), so providerId 'p1' matches unrelated slaveId 'p1-evil'.
- harness: `repros/trust-score.ts`
- command: `bun run repros/trust-score.ts`
- result: ALL PASS (6/6)
- hazards: H14 (missing/empty evidence defaults to permissive/positive in a
  trust/risk/score computation), H7 (substring `.includes` vs equality)

## What the check proved
1. No-data provider scores 68/100; latency/circuit/drift = 100 on missing data;
   operation score = 50 on zero outcomes.
2. `'p1'` substring-matched `slaveId: 'p1-evil'`.

## Suggested fixes
- Default missing-evidence to low/unknown + evidence-count modifier (no-data →
  low, not 68).
- `computeOperationScore` → low/untrusted default or minimum-sample gate.
- Circuit match by exact `slaveId === providerId`.
