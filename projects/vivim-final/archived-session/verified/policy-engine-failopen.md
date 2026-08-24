# Verified: policy-engine — fail-open on unknown risk + inert policy flags

- target: `C:/0-BlackBoxProject-0/vivim-final/src/engines/policy-engine.ts`
- defects:
  - D1 (H1): `RISK_TIER[risk] ?? 0` fail-open — unknown risk → tier 0 → allowed.
  - D2: `allowFinancial` option is dead — `CapabilityRisk` has no `financial`
    value, so no financial policy is enforced by this engine.
  - D3: `allowSecuritySensitive` is vetoed by `maxRiskTier` (tier check first),
    so the flag is silently inert at the default threshold.
- harness: `repros/policy-engine.ts`
- command: `bun run repros/policy-engine.ts`
- result: ALL PASS (7/7)
- hazards: H1 (fail-open default), H10 (inert policy flag / flag vetoed by coarse threshold)

## What the check proved
1. Unknown risk strings (`"financial"`, `"UNKNOWN"`) pass the policy as allowed
   with no confirmation — the engine trusts the caller and defaults to the safe
   tier, which is the *permissive* outcome for a security gate.
2. `allowFinancial:true` cannot allow any action, because no `CapabilityRisk`
   value maps to financial; financial actions are governed only by
   `allowCommunication`.
3. `allowSecuritySensitive:true` is denied while `maxRiskTier` is at its default 3,
   so the flag appears to do nothing.

## Suggested fixes
- Fail CLOSED on unknown risk (`RISK_TIER[risk] === undefined → deny`).
- De-duplicate `RISK_TIER` (import from action-plan.ts) to prevent drift.
- Implement or remove `allowFinancial`; make `allowSecuritySensitive` precedence
  explicit vs `maxRiskTier`.
