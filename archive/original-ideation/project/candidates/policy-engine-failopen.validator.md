validated-by: lead (iteration 3, policy-engine)
VERIFIED

# Validation: P0PolicyEngine — fail-open on unknown risk + inert flags

## Check type
Executed reproduction against the real `P0PolicyEngine` imported from
`C:/0-BlackBoxProject-0/vivim-final/src/engines/policy-engine.ts`.
File: `repros/policy-engine.ts`.

## How to run
```
cd C:\0-BlackBoxProject-0\ideation\project
bun run repros/policy-engine.ts
```

## Result
ALL PASS (exit 0), 7/7:
- sanity: default engine denies `destructive` and `security_sensitive`.
- D1/H1: unknown risk `"financial"` → allowed, no confirmation.
- D1/H1: unknown risk `"UNKNOWN"` → allowed (fail-open via `?? 0`).
- D2: `allowFinancial:true` does NOT allow `external_communication` (no `financial`
  risk exists; only `allowCommunication` gates it) → flag inert.
- D2: no `CapabilityRisk` value exists for which `allowFinancial` is the
  controlling flag (dead option).
- D3: `allowSecuritySensitive:true` still DENIED because `maxRiskTier` default 3
  blocks tier 4 before the category switch → flag silently inert.

## Verdict
Confirmed. The policy engine fails OPEN on unrecognized risk (should fail
closed), ships a dead `allowFinancial` option that cannot enforce any financial
policy, and has an `allowSecuritySensitive` flag that is vetoed by `maxRiskTier`
unless the caller also raises the threshold.

Suggested fixes:
- Fail CLOSED: `const tier = RISK_TIER[risk]; if (tier === undefined) return deny`
  (or throw) instead of `?? 0`.
- Remove the duplicated `RISK_TIER` (import from action-plan) so the two maps
  cannot drift.
- Either implement a real `financial` risk category + `allowFinancial` gating, or
  delete the dead option.
- Make `allowSecuritySensitive` take precedence over `maxRiskTier` (or document
  the interaction) so the flag is not silently inert.
