# Verified: router — failover re-dispatch + misleading failure provenance

- target: `C:/0-BlackBoxProject-0/vivim-final/src/router/router.ts` (Router.route())
- defects:
  - D1: priority failover dispatches the SAME input to every active target until
    one succeeds; no idempotency key/dedup → duplicate side effects for
    non-idempotent capabilities if an earlier target partially executed.
  - D2: on total failure, returned `targetProviderId` is `activeTargets[0]`
    (first/highest-priority target), which is the one that failed → misleading.
- also noted: `src/ai/routing/default-router.ts` `LearnedStrategy` is registered
  but `pickStrategy()` never selects it (orphaned).
- harness: `repros/router-failover.ts`
- command: `bun run repros/router-failover.ts`
- result: ALL PASS (4/4)
- hazards: H12 (failover/re-dispatch without idempotency → duplicate side effects)

## What the check proved
1. The identical payload was delivered to both targets t1 and t2 under failover.
2. On total failure, `targetProviderId` pointed at the first (failed) target pA.

## Suggested fixes
- Idempotency key + dedup, or restrict failover to idempotent/read capabilities.
- Report the last-attempted (or null) target on total failure.
- Wire `learned` strategy selection in default-router `pickStrategy`.
