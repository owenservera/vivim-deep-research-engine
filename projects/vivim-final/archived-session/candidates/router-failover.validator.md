validated-by: lead (iteration 5, router)
VERIFIED

# Validation: Router.route() failover re-dispatches identical payload

## Check type
Executed reproduction against the real `Router` imported from
`C:/0-BlackBoxProject-0/vivim-final/src/router/router.ts`, using a fake
RouterStore (listSpecs/listTargets/createRequest/updateRequest/createEvent
no-ops) and a fake RouteDispatcher that records every dispatch.
File: `repros/router-failover.ts`.

## How to run
```
cd C:\0-BlackBoxProject-0\ideation\project
bun run repros/router-failover.ts
```

## Result
ALL PASS (exit 0), 4/4:
- D1: failover dispatched the input to 2 targets (t1 then t2).
- D1: identical payload re-sent to multiple providers (no idempotency/dedup).
- D1: eventually succeeded via t2 (pB).
- D2: total-failure `targetProviderId` is the first (highest-priority) target
  `pA`, which is the one that failed (misleading provenance).

## Verdict
Confirmed. `route()` re-sends the same input to every target under failover with
no idempotency guard (duplicate side-effect hazard for non-idempotent
capabilities), and reports the wrong provider on total failure.

Suggested fixes:
- Add an idempotency key to `RouteInput` and have `dispatch` / store dedupe
  retries; or only fail over for read/known-idempotent capabilities.
- On total failure, set `targetProviderId` to the *last* attempted target (or
  leave it null) rather than the first.
- (default-router) wire `pickStrategy` to select `learned` when an OutcomeTracker
  is present, or remove the orphaned registration.
