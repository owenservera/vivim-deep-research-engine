validated-by: lead (iteration 6, kernel-registry)
VERIFIED

# Validation: KernelRegistry — health/status vocab mismatch + unresolved deps

## Check type
Executed reproduction against the real `KernelRegistry` imported from
`C:/0-BlackBoxProject-0/vivim-final/src/engines/kernel/kernel-registry.ts`
(pure in-memory, no DB). File: `repros/kernel-registry.ts`.

## How to run
```
cd C:\0-BlackBoxProject-0\ideation\project
bun run repros/kernel-registry.ts
```

## Result
ALL PASS (exit 0), 7/7:
- D1: `updateHealth({status:'healthy'})` maps `status` to `'running'`.
- D1: `listEngines({status:'healthy'})` is EMPTY (vocabulary mismatch).
- D1: `listEngines({status:'running'})` works (lifecycle vocab only).
- D1: `updateHealth({status:'degraded'})` leaves `status` stale at `'running'`.
- D2: `getDependencies` returns unresolved dep `'ghost'`.
- D2: `'ghost'` is not a registered engine.
- sanity: `updateHealth` on an unknown engine throws.

## Verdict
Confirmed. Health statuses don't propagate into the filterable lifecycle
`status` for `degraded`/`unknown`, and filtering `listEngines` by a health word
silently returns nothing. `getDependencies` returns declared dependency ids
without validating they resolve to registered engines.

Suggested fixes:
- Make `updateHealth` set a consistent status for all HealthState values
  (`degraded` -> a distinct lifecycle status or a `degraded` status value), and/or
  have `listEngines` also match on `health.status`.
- In `getDependencies` (and `registerEngine`), validate that each dependency id
  resolves to a registered engine; reject/flag dangling references and cycles.
