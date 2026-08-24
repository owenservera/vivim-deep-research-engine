validated-by: lead (iteration 4, provider-mux)
VERIFIED

# Validation: ProviderMuxEngine — silent no-op + cost-budget overrun

## Check type
Executed reproduction against the real `ProviderMuxEngine` imported from
`C:/0-BlackBoxProject-0/vivim-final/src/engines/provider-mux.ts`, using a fake
MuxStore (all methods no-op) and a fake MuxDispatcher (returns ok, cost 6).
File: `repros/provider-mux.ts`.

## How to run
```
cd C:\0-BlackBoxProject-0\ideation\project
bun run repros/provider-mux.ts
```

## Result
ALL PASS (exit 0), 4/4:
- D1: `mux()` with no `targetProviderIds` and no `capabilityId` → no exception,
  `providerResponses.length === 0`, `bestProviderId === null` (silent no-op).
- D1: strategy falls through to `fan_out` default for the empty list.
- D2: `maxProviders: 0` → `providerResponses.length === 0` despite two providers
  supplied (slice(0,0)).
- D3: `costBudgetCents: 10` with three 6-cent providers → `totalCostCents === 12`
  (> budget by one provider).

## Verdict
Confirmed. `mux()` returns a fake-success with zero providers instead of
erroring (disagreeing with `autoRoute`, which throws); `maxProviders: 0` silently
dispatches nobody; `cost_optimized` can overrun its budget by one provider.

Suggested fixes:
- Error on empty provider resolution (or match `autoRoute`'s throw).
- Treat `maxProviders <= 0` as invalid / default to `providerIds.length`.
- In `cost_optimized`, skip a provider whose `costCents` would exceed the
  remaining budget before dispatching (check `accruedCost + est >= budget`).
