# Verified: provider-mux — silent no-op on empty input + cost-budget overrun

- target: `C:/0-BlackBoxProject-0/vivim-final/src/engines/provider-mux.ts`
- defects:
  - D1: `mux()` resolves to an empty provider list (no `targetProviderIds`,
    no/empty `capabilityId` prefs) and returns a silent "success" with 0
    responses and `bestProviderId:null` — no error (disagrees with `autoRoute`,
    which throws on empty).
  - D2: `providerIds.slice(0, request.maxProviders ?? providerIds.length)` — a
    literal `maxProviders: 0` is treated as valid → `slice(0,0)` → nobody
    dispatched (silent empty result).
  - D3: `cost_optimized` checks the budget BEFORE dispatch, so a single provider
    whose cost exceeds the remaining budget is still dispatched; total can
    overrun by up to one provider's cost.
- harness: `repros/provider-mux.ts`
- command: `bun run repros/provider-mux.ts`
- result: ALL PASS (4/4)
- hazards: H11 (silent no-op on empty/edge input; `??` that swallows falsy 0/'')

## What the check proved
1. Empty provider resolution yields a fake-success MuxResponse (0 providers,
   null best, no exception).
2. `maxProviders: 0` silently drops all providers.
3. `costBudgetCents: 10` with 6-cent providers yields total 12 (over budget).

## Suggested fixes
- Throw on empty provider resolution (consistent with `autoRoute`).
- Treat `maxProviders <= 0` as unset.
- Pre-check `accruedCost + cost >= budget` before dispatching in `cost_optimized`.
