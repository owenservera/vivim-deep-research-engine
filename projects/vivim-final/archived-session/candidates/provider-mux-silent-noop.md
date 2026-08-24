claimed-by: lead (iteration 4, provider-mux)
READY FOR VALIDATION

# Candidate: ProviderMuxEngine — silent no-op on empty input + cost-budget overrun

## Approach / claim
`ProviderMuxEngine` (src/engines/provider-mux.ts) has three concrete defects:

1. **D1 (silent no-op).** `mux()` resolves providers via
   `request.targetProviderIds ?? (await this.resolveProviderIds(request))`. With
   neither `targetProviderIds` nor a `capabilityId` (or a capabilityId with no
   routing prefs), `resolveProviderIds` returns `[]`. The strategy then dispatches
   NOTHING and `buildResponse` returns a MuxResponse with `providerResponses=0`,
   `bestProviderId=null`, and `status:'partial'` — **no error thrown**. This is a
   silent failure: the caller gets a "success-ish" result with zero providers.
   Note `autoRoute()` (sibling method) DOES throw on empty providerIds, so the two
   entry points disagree on the empty case.
2. **D2 (`maxProviders:0` swallowed).** Every strategy uses
   `providerIds.slice(0, request.maxProviders ?? providerIds.length)`. Because
   `??` only catches `null`/`undefined`, a literal `maxProviders: 0` is treated as
   valid and `slice(0, 0)` dispatches **nobody** — a silent empty result even when
   providers were supplied. 0 is a legitimate (if degenerate) value and must be
   distinguished from "unset".
3. **D3 (cost budget overrun).** `cost_optimized` checks
   `if (accruedCost >= budget) break` *before* dispatching each provider. A single
   provider whose cost already exceeds the remaining budget is still dispatched,
   so total cost can overrun the budget by up to one provider's cost.

## Why it seems promising
Executed check `repros/provider-mux.ts` (fake MuxStore + MuxDispatcher, no DB)
→ ALL PASS (4/4): empty providers → silent no-op; `maxProviders:0` → 0
dispatched; `costBudgetCents:10` with three 6-cent providers → total 12 (>budget).

## What needs to be checked next
- Whether callers always pass `targetProviderIds` (mitigates D1 in practice) — but
  the `learned`/`priority` paths resolve from the store and can still return empty.
- Whether `maxProviders` is ever sourced from untrusted input (D2).

## Confidence
High. All three reproduced by executed checks against the real engine. Severity:
D1 is a real silent-failure (should error on empty resolution); D2 is a `??`
anti-pattern that silently drops all providers; D3 is a budget-enforcement bug.
