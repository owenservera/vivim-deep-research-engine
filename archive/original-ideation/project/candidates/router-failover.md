claimed-by: lead (iteration 5, router)
READY FOR VALIDATION

# Candidate: Router.route() failover re-dispatches identical payload to every target

## Approach / claim
`Router.route()` (src/router/router.ts) does priority failover: it iterates
`activeTargets` in priority order and dispatches the **same `RouteInput`** to each
until one returns `ok`. There is no idempotency key, deduplication, or
"already-executed" guard.

1. **D1 (no idempotency on failover — H12).** For a non-idempotent capability
   (payment, message send, mutation), an earlier target may have *partially
   executed* before reporting failure (network timeout, 5xx after commit). The
   router then re-sends the identical payload to the next target, causing a
   duplicate side effect. The executed check confirms the same `payload` is
   delivered to multiple targets.
2. **D2 (misleading provenance on total failure — H2-ish).** When all targets
   fail, `route()` returns `targetProviderId: activeTargets[0]?.provider_id` —
   the highest-priority target, which is the one that failed. Error reports
   therefore point at the wrong provider.

Separately observed (not executed here, requires heavy deps): in
`src/ai/routing/default-router.ts`, `LearnedStrategy` is registered only when an
`OutcomeTracker` is supplied, but `pickStrategy()` never returns `'learned'`
(its cases are explicit / local-only / lowest-cost / best-fit(dead) / priority),
so the learned strategy is orphaned — routing never uses historical outcomes.

## Why it seems promising
Executed check `repros/router-failover.ts` (fake RouterStore + RouteDispatcher)
→ ALL PASS (4/4): failover dispatched to 2 targets with identical payload;
succeeded via the 2nd; on total failure `targetProviderId` was the first
(failed) target `pA`.

## What needs to be checked next
- Whether all dispatched capabilities are idempotent or the caller ensures
  exactly-once (unlikely for a generic dispatch router).
- Whether `dispatch` is expected to be safe to retry.

## Confidence
High for D1/D2 (executed). The default-router orphan is a clear code-reading
finding (lower confidence without a full deps mock, but the `pickStrategy` logic
is unambiguous).
