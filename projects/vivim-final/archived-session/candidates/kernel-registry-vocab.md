claimed-by: lead (iteration 6, kernel-registry)
READY FOR VALIDATION

# Candidate: KernelRegistry — health/status vocabulary mismatch + unresolved deps

## Approach / claim
`KernelRegistry` (src/engines/kernel/kernel-registry.ts) has two defects:

1. **D1 (status vocabulary mismatch — H11/H3 family).** `EngineDescriptor.status`
   is `'registered'|'wired'|'running'|'error'|'stopped'`, while
   `HealthState.status` is `'healthy'|'degraded'|'unhealthy'|'unknown'`.
   `updateHealth` only maps `healthy -> running` and `unhealthy -> error`;
   `degraded` and `unknown` leave the lifecycle `status` UNCHANGED (stale).
   `listEngines({ status })` filters on `EngineDescriptor.status`, so a caller
   filtering by a health word (`'healthy'`/`'unhealthy'`/`'degraded'`) silently
   gets an EMPTY list — there is no status value that equals those words.
2. **D2 (unresolved dependency returned — H1 family).** `getDependencies` BFSes
   `desc.dependencies` and returns the ids, but never validates that each id is a
   registered engine. A declared dependency on a non-existent id is returned
   verbatim (and a caller doing `getEngine(dep)` gets `null`). No validation that
   dependencies resolve; cycles are also accepted silently (only the `visited`
   set prevents an infinite loop).

## Why it seems promising
Executed check `repros/kernel-registry.ts` (pure in-memory) → ALL PASS (7/7):
`listEngines({status:'healthy'})` empty while `status:'running'` works;
`updateHealth('degraded')` leaves `status:'running'`; `getDependencies` returns a
`'ghost'` dep that is not a registered engine.

## What needs to be checked next
- Whether any caller filters `listEngines` by a health word (latent breakage).
- Whether `registerEngine` should reject duplicate ids / unregistered deps / cycles.

## Confidence
High. Both reproduced by executed checks against the real class. Severity: D1 is
a real observability/monitoring bug (degraded engines invisible via status
filter); D2 is a validation gap (dangling references).
