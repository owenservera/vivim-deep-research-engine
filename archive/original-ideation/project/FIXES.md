# Fixes applied

## Scope
- **Wave 1 (highest-severity / fail-open class):** the 3 fail-open defects
  below (#1–#3).
- **Wave 2 (careful fix pass, user-approved "be careful"):** every *confirmed
  real* defect from the loop, fixed with a minimal root-cause change and
  re-verified by its `repros/` harness turned into a regression test.
- **Explicitly NOT fixed (design-ambiguous, needs a design decision):** all
  originally-flagged design-ambiguous defects (override-precedence, cross-field
  value/source mismatch, stream-parser premature-commitment contract,
  provider-mux silent-no-op, dead policy flags, router failover idempotency,
  vacuous-context existential) were subsequently approved and FIXED under
  §9–14. The only items still unconsidered are new hazards not yet raised.

All fixes are in `C:\0-BlackBoxProject-0\vivim-final\src` and verified by the
`repros/` harnesses (re-run as regression tests → all PASS).

## 1. capability-resolution.ts — tier casing / fail-open (I2c, H1+H3)
File: `src/engines/capability-resolution.ts`
`function tierRank(tier: string)`:
- Before: `return TIER_RANK[tier as PlanTier] ?? 0` — non-lowercase
  (`'ENTERPRISE'`, `'Pro'`) missed the map and fell to `0` (open), bypassing the
  tier gate. Also any unknown tier was treated as the permissive default.
- After: normalize with `toLowerCase().trim()`, and on unknown tier return
  `Number.POSITIVE_INFINITY` (fail CLOSED — gated, not passed).
Verified: `repros/capability-resolution.ts` → I2c assertions now PASS (16/16).

## 2. policy-engine.ts — fail-open on unknown risk (D1, H1)
File: `src/engines/policy-engine.ts`
`evaluateNodeRisk`:
- Before: `const tier = RISK_TIER[risk] ?? 0` — unrecognized risk → tier 0 →
  allowed with no gate.
- After: look up with `(RISK_TIER as Record<string, number | undefined>)[risk]`;
  if `undefined`, return `{ allowed: false, reason: '...unrecognized risk...' }`
  (fail CLOSED).
Verified: `repros/policy-engine.ts` → D1 "unknown risk DENIED" PASS (7/7).
NOTE: D2 (dead `allowFinancial`) and D3 (`allowSecuritySensitive` vetoed by
`maxRiskTier`) are fixed in §13.

## 3. safe-eval.ts — denylist fails open (denylist, H9)
File: `src/engines/safe-eval.ts`
`FORBIDDEN_TOKENS` regex:
- Before: lowercase-only, omitted many dangerous globals (WebSocket, navigator,
  Blob, TextEncoder, structuredClone, MessageChannel, crypto, DOMParser, …) →
  `new Function()` could still reach them after the guard passed; case variants
  (`PROCESS`) evaded it.
- After: added the omitted dangerous globals and the `i` (case-insensitive)
  flag. Benign DSL expressions with no forbidden token still pass.
Caveat: this remains a *denylist*, which is fundamentally incomplete — the
proper fix is an allowlist of permitted DSL identifiers and/or a real sandbox
(quickjs/vm) with no globals. This change closes the demonstrated vectors.
Verified: `repros/safe-eval-guard.ts` → all dangerous globals blocked, case
variants blocked, benign allowed (27/27).

## 4. trust-score.ts — missing-data scored as healthy + substring slave match (H14, H15)
File: `src/engines/trust-score.ts`
- `latencyScore`: before returned `100` when there were no latency samples
  (missing data = "healthy"). After: `0` (treat absence of evidence as
  untrusted). `circuitStateScore`: same fix — empty provider-circuits → `0`.
- `circuitStateScore`: `providerCircuits = circuits.filter(c => c.slaveId.includes(providerId))`
  matched `providerId:'p1'` against `slaveId:'p1-evil'` (substring) → false
  positive. After: exact equality (`===`). Own circuits still match.
- `computeProviderScore` left at `50` (neutral) on zero outcomes — NOT treated
  as a defect (no fail-open, just neutral).
- Net: a provider with no trust data now scores ~38/100 (was 68) — correctly
  below the 50 trust threshold.
Verified: `repros/trust-score.ts` → no-data=38, latency/circuit=0, no substring
match, own-circuit matches (ALL PASS).

## 5. streaming-protocol.ts — double block storage + incremental never persisted (H15)
File: `src/engines/streaming-protocol.ts`
- `finishConversation`: stored blocks BOTH per-chunk (in `captureContent`) AND
  again from the full buffer in `finishConversation` → each block written twice.
  After: removed the duplicated `storeBlocks` in `finishConversation`.
- `processIncremental`: the `parser.parseIncremental` branch only updated the
  conversation transcript and NEVER persisted the parsed blocks. After: added
  `storeBlocks` so incremental captures are persisted exactly once.
- Result: blocks stored exactly once across incremental capture + finish.
Verified: `repros/streaming-protocol.ts` → 2 blocks stored once; processIncremental
persists 2; finish after incremental sees empty buffer (ALL PASS).

## 6. kernel/kernel-registry.ts — ghost deps + health/status vocab mismatch + stale degraded (H13)
File: `src/engines/kernel/kernel-registry.ts`
- `getDependencies`: before returned unresolved ("ghost") dependency ids that
  are not registered engines → downstream resolution could crash/trust missing
  nodes. After: drops ids with no registered engine.
- `listEngines({status})`: before matched only the lifecycle `status` field and
  ignored `health.status`, so filtering by the health word (e.g. `'healthy'`)
  returned empty. After: matches against `health.status` too.
- `updateHealth`: before set `engine.status` to the *health* status verbatim,
  so a `'degraded'` health left `status` STALE/wrong. After: health maps to
  lifecycle status (`'degraded'`/`'unknown'`/`'unknown'` → still operational
  `running`, with health recorded; `'healthy' → running`).
Verified: `repros/kernel-registry.ts` → ghost dropped, listEngines(healthy)
matches, degraded→running recorded (ALL PASS).

## 7. router/router.ts — misleading targetProviderId on total failure (H13)
File: `src/router/router.ts`
- On total failover failure, `targetProviderId` was set to `activeTargets[0]`
  — which is the FIRST target that just FAILED → misleading provenance. After:
  `''` (no provenance), and `ok=false`.
- NOTE: D1 (failover re-sends the identical payload to every target with no
  idempotency/dedup) is intentionally NOT fixed — design-ambiguous (some
  callers may rely on at-least-once delivery); flagged for human review.
Verified: `repros/router-failover.ts` → total-failure targetProviderId===''
(ALL PASS).

## 8. storage/impl/capability-resolution-store-impl.ts — unescaped ILIKE + premature LIMIT 20 (H8)
File: `src/storage/impl/capability-resolution-store-impl.ts`
- `searchCapabilities`: the SQL `ILIKE '%' || $3 || '%'` made a user query's `%`
  and `_` act as wildcards (query `'50%'` matched `'HTTP 503 ...'`). After: the
  pattern escapes `%`, `_`, and `\` (`[\\%_] → \\$&`) so they are literal.
- The SQL applied `LIMIT 20` BEFORE the engine's precise `applySearchFilter`
  ran, silently dropping valid matches when false-positive wildcards filled the
  cap. After: removed the premature `LIMIT 20` (the engine's precise filter is
  authoritative; any final LIMIT is applied downstream).
Verified: `repros/capability-store-search-real.ts` (real store, fake Prisma) →
pattern escaped (`%50\%%`, `%a\_b%`), no premature LIMIT; plus
`repros/capability-store-search.ts` simulation (ALL PASS).

## Design-ambiguous defects — addressed (proposals approved)
The four design-ambiguous defects flagged after the careful-fix pass were
approved via `PROPOSALS.md` (user chose Hybrid convention, non-breaking
stream-parser contract, throw-on-empty, and `maxProviders:0` valid no-op).
They are documented as fix sections 9–11 below; the still-open items follow.
## 9. capability-resolution.ts — override/value-source consistency (H2/H13) [design-ambiguous, now fixed]
File: `src/engines/capability-resolution.ts` (`mapRow`, lines 278–298)
- Adopted the **Hybrid** convention (user-approved): the 17 base UI fields are
  read from pre-merged base columns, so `*_from` records the *origin* of the
  merged value (provenance), not a runtime-applied override. Only `uiSlots` is
  applied at resolve time, from `ui_component_override`.
- **Fix:** added `uiSlots` to `overrideSources` (`'provider'` when an override is
  present, else `'global'`) — previously the one override-applied field was
  untracked. Added an explanatory comment so value-selection and provenance
  paths cannot silently diverge again.
- Net: `overrideSources` is now internally consistent — provenance reports
  origin, value comes from the merged base, and `uiSlots` is both applied and
  tracked. (Schema note: only `uiSlots` has a dedicated override column; the
  other 17 fields have no per-field override column, so per-field override
  selection was not possible without a schema migration.)
Verified: `repros/capability-override-precedence.ts` → uiSlots tracked;
provenance/value consistent (ALL PASS).

## 10. stream-parser.ts — enforce explicit completion contract (HAZARD) [design-ambiguous, now fixed]
File: `src/engines/stream-parser.ts` (`detectCompletion`, `parse`)
- `detectCompletion` now takes `isFinal?: boolean` and returns `false` unless a
  real completion sentinel is seen OR the caller passes `isFinal` (non-breaking:
  existing `parse()` callers unaffected; `parse` keeps its whole-body behavior).
- The error/fallback module's `detectCompletion` default changed from `() => true`
  to `() => false`, removing the footgun where the natural per-chunk loop
  (`if (detectCompletion(p)) parse(p)`) committed partial content on the first
  chunk.
- Parser selection is already locked per provider by the primed-cache/version
  pick; selection-flip was not reproduced in validation, so no further change.
Verified: `repros/stream-parser-contract.ts` → partial prefix not "complete";
`isFinal=true` forces completion; `parse()` still returns blocks (ALL PASS).

## 11. provider-mux.ts — fail-loud empty + explicit no-op + cost cap (H11) [design-ambiguous, now fixed]
File: `src/engines/provider-mux.ts` (`mux`, `costOptimized`)
- **D1:** `mux()` now THROWS `EngineError` when the resolved provider set is empty
  (was a silent `status:'partial'`, `0` responses) — consistent with `autoRoute()`,
  which already threw.
- **D2:** `maxProviders: 0` is a deliberate, valid "send to nobody" no-op (NOT
  treated as "unset"). The engine logs an explicit warning so it is no longer a
  mysterious empty result. `??` still distinguishes `0` from "unset".
- **D3:** `cost_optimized` breaks **immediately** once `accruedCost > budget`, so
  it never dispatches a further provider after overrunning. Residual: a single
  provider whose own cost crosses the budget is still dispatched, because its
  cost is only known after dispatch — true pre-estimation would require a
  dispatcher cost hint (not in scope).
Verified: `repros/provider-mux.ts` → empty THROWS; `maxProviders:0` is a valid
no-op (warned); budget=10 with 6-cent providers dispatches 2, total 12 (ALL PASS).

## 12. capability-resolution.ts — fail-closed on missing context (H6) [design-ambiguous, now fixed]
File: `src/engines/capability-resolution.ts` (`satisfiesExistentialRule`)
- Before: `if (!context) return true` — when `conversationContext` was omitted
  (or empty) the existential guard `mode == dark`, `time == night`, etc. was
  VACUOUSLY satisfied and the gated capability was INCLUDED. Callers that forgot
  to pass context silently got the capability.
- After: `if (!context) return false` — missing context now fails the existential
  check CLOSED (capability excluded), so a caller must actually supply the
  evidence. (The empty-context case was already safe: `mode == 'dark'` evaluates
  against `{}` as `false`.)
Verified: `repros/capability-cross-field.ts` → "UNDEFINED context → EXCLUDED"
(ALL PASS).

## 13. policy-engine.ts — make `allowFinancial` and `allowSecuritySensitive` functional (H10) [design-ambiguous, now fixed]
File: `src/engines/policy-engine.ts` (`evaluateNodeRisk`)
- **D2 (dead `allowFinancial`):** financial operations are classified as
  `security_sensitive` (action-plan-compiler:145, nlcl:52, capability-parity:54),
  so `allowFinancial` now ALSO satisfies the `security_sensitive` gate. It does
  NOT open any other risk (e.g. `destructive` stays gated by `allowDestructive`).
- **D3 (`allowSecuritySensitive` vetoed by `maxRiskTier`):** the switch now
  returns `{ allowed: true, requiresConfirmation: true }` when the matching
  allow-flag is set, and this result is returned directly — it is NO LONGER
  re-gated by the numeric `maxRiskTier` threshold afterward. The threshold
  continues to bound every *other* risk tier (regression preserved: `destructive`
  is still capped by `maxRiskTier`).
- Caveat: an explicit allow still sets `requiresConfirmation: true` — intentional
  (security_sensitive ops always need a human/confirm step even when allowed).
Verified: `repros/policy-engine.ts` → allowFinancial/allowSecuritySensitive now
permit their risk; destructive still capped by threshold (ALL PASS).

## 14. router/router.ts — idempotency guard against duplicate providers (H12) [design-ambiguous, now fixed]
File: `src/router/router.ts` (`route`)
- Before: the failover loop dispatched the SAME input to EVERY active target in
  priority order with no dedup. If two target rows pointed at the same
  `provider_id` (duplicate row), that provider was dispatched TWICE within one
  request — a duplicate side effect for non-idempotent capabilities.
- After: a `Set` of attempted `provider_id`s is kept; within a single request a
  provider is dispatched at most once. A duplicate target row is skipped
  (`skipped_duplicate` event). Cross-target failover (re-sending the payload to
  the *next distinct* provider on failure) is preserved — i.e. at-least-once
  delivery across *different* providers remains intended.
Verified: `repros/router-failover.ts` → duplicate-provider row dispatched once;
cross-target failover still re-sends to the next provider; total-failure
`targetProviderId===''` (ALL PASS).

## Status
- All 10 loop targets: DONE. All 14 `repros/` regression harnesses PASS.
- Fixed: 3 fail-open (§1–3) + 5 careful-pass (§4–8) + 6 design-ambiguous
  (§9–14) = 14 fix sections covering H1, H2, H3, H6, H8, H9, H10, H11, H12, H13,
  H14, H15.
- No defects remain open from the loop. (Future hazards can still be raised via
  `scripts/research-loop.ts hazard`.)
