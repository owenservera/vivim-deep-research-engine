# Verified: kernel-registry — health/status vocab mismatch + unresolved deps

- target: `C:/0-BlackBoxProject-0/vivim-final/src/engines/kernel/kernel-registry.ts`
- defects:
  - D1: `EngineDescriptor.status` (`registered|wired|running|error|stopped`) and
    `HealthState.status` (`healthy|degraded|unhealthy|unknown`) are different
    vocabularies. `updateHealth` maps only healthy->running / unhealthy->error;
    `degraded`/`unknown` leave lifecycle `status` stale, and
    `listEngines({status})` (filters on lifecycle vocab) silently returns empty
    for health words.
  - D2: `getDependencies` returns declared dependency ids without validating they
    resolve to registered engines (dangling/'ghost' deps returned).
- harness: `repros/kernel-registry.ts`
- command: `bun run repros/kernel-registry.ts`
- result: ALL PASS (7/7)
- hazards: H13 (vocabulary/enum mismatch across related fields + returning
  unvalidated references)

## What the check proved
1. `listEngines({status:'healthy'})` is empty; `degraded` health leaves `status`
   stale at `running`.
2. `getDependencies` returns a `'ghost'` dependency id that is not registered.

## Suggested fixes
- Propagate all HealthState values into a consistent lifecycle status (or let
  `listEngines` match `health.status`); fix the `degraded`/`unknown` gap.
- Validate dependency ids resolve at registration and in `getDependencies`; flag
  dangling references and cycles.
