claimed-by: lead (iteration 3, policy-engine)
READY FOR VALIDATION

# Candidate: P0PolicyEngine — fail-open on unknown risk + two inert policy flags

## Approach / claim
`P0PolicyEngine.evaluate` (src/engines/policy-engine.ts) gates ActionPlan nodes
by `RISK_TIER[risk] ?? 0` and a `switch(risk)`. Two structural problems:

1. **D1 (H1 fail-open).** `RISK_TIER[risk] ?? 0` maps any unrecognized risk to
   tier 0 = `read` = allowed. The engine does no validation of `risk` itself; it
   trusts the caller. If a plan reaches `evaluate` without re-running Zod
   validation (an internally-built plan, a new risk added to `CapabilityRiskSchema`
   but not to policy-engine's `RISK_TIER`, or drift between the *two* duplicated
   `RISK_TIER` maps in action-plan.ts:29 and policy-engine.ts:33), the unknown
   risk is silently ALLOWED — bypassing every gate.
2. **D2 (dead `allowFinancial`).** `CapabilityRiskSchema` (action-plan.ts:18) has
   no `financial` value, yet `P0PolicyEngineOptions.allowFinancial` exists and the
   header promises "Financial operations have explicit policy." There is no risk
   category for which `allowFinancial` is the controlling flag, so it can never
   gate anything. Financial actions are conflated under `external_communication`
   (or other existing risks) and governed only by `allowCommunication`.
3. **D3 (`allowSecuritySensitive` silently overridden by `maxRiskTier`).** The
   tier check runs *before* the category switch. With default `maxRiskTier=3`, a
   `security_sensitive` node (tier 4) is denied by the tier gate even when
   `allowSecuritySensitive:true` is set. The explicit allow flag is inert unless
   the caller also raises `maxRiskTier >= 4`.

## Why it seems promising
Executed check `repros/policy-engine.ts` → ALL PASS (7/7): unknown risk
`"financial"`/`"UNKNOWN"` → allowed; `allowFinancial:true` does not allow
`external_communication`; `allowSecuritySensitive:true` still denied by default
tier threshold; sanity (default engine denies destructive/security_sensitive)
holds.

## What needs to be checked next
- Whether the execution kernel always Zod-validates the plan *immediately before*
  `evaluate` (mitigates D1 at runtime, but the engine still fails open by design
  and the duplicated maps can drift).
- Whether `allowFinancial` was intended to be wired to a capability attribute
  not present in the current `ActionNode` schema (would confirm D2 is a gap, not
  just dead code).

## Confidence
High. All three are demonstrated by executed checks against the real engine.
Severity: D1 is a real fail-open (policy should fail CLOSED on unknown risk); D2
is a missing/ineffective control; D3 is a misleading-config defect.
