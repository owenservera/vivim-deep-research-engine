# HAZARDS — cross-loop defect patterns

Patterns discovered across research iterations. Each new `FRAMING.md` is seeded
with the relevant hazard IDs so later targets are attacked with prior lessons.
When a NEW pattern is found, append it here via
`bun run scripts/research-loop.ts hazard "<text>"`.

- **H1 — Permissive `??`/default in lookup maps (fail-open).** A map lookup that
  falls back to the *permissive* value on miss, e.g. `TIER_RANK[tier] ?? 0`
  (rank 0 = lowest = never gated). Any key not in the map silently gets the
  open/default behavior. Check every `Map.get` / `obj[k] ?? default` whose
  default is the lenient option. Found: capability-resolution `tierRank`.
- **H2 — Provenance/metadata disagrees with the actual value path.** A
  `*_from` / `source` / `provenance` field is populated on a *different code
  path* than the value it describes, so the metadata lies. Check every
  recorded provenance vs the value actually selected. Found: capability-resolution
  `overrideSources` vs base-column value selection.
- **H3 — Case/whitespace sensitivity in enum-like tokens.** Tier/status strings
  compared without normalization; `'ENTERPRISE'` ≠ `'enterprise'`. Check every
  enum-like comparison for `.toLowerCase()`/`.trim()` normalization. Found:
  capability-resolution `min_plan_tier`.
- **H4 — Unparseable/empty rule defaults to "satisfied"/"allowed" (fail-open).**
  A parser that returns `true` (or includes) when the rule can't be parsed.
  Check every rule/expression evaluator's error branch. Found:
  capability-resolution `satisfiesExistentialRule` (unparseable → `true`).
- **H5 — Paired read paths can diverge.** `search` vs `resolve` (or list vs
  detail) reading from different store methods; a subset invariant
  (`search ⊆ resolve`) breaks if the store returns different rows. Check every
  paired read path. Found (engine-clean, store-contract residual):
  capability-resolution `search`/`resolve`.
- **H6 — Missing-context vacuous satisfaction.** An existential/policy check
  that is *vacuously true* when the caller omits `context`, so the capability is
  shown. Callers must always pass context. Found: capability-resolution.
- **H7 — Numeric/string coercion in comparisons.** `String(x) === expected`
  mixes types; `3 == "3"` passes but `3 === "3"` fails; NaN handling. Check every
  comparison that coerces. Found (benign, passes): capability-resolution
  existential `==`.
- **H8 — Unescaped wildcard metacharacters (%/_) in query strings and LIMIT/truncation applied before the precise filter — drops valid results or yields false positives** (found in capability-store-impl)
- **H9 — - **H9 — Denylist/blocklist guards for code execution (
ew Function/val/DSL) FAIL OPEN.** A source-string blocklist only blocks enumerated tokens, so any non-listed global (WebSocket, EventSource, navigator, location, localStorage, indexedDB, Blob, TextEncoder, structuredClone, MessageChannel, crypto, DOMParser, XMLSerializer, BroadcastChannel, …) passes; and it is usually case-sensitive (no \i\ flag) so PROCESS/FUNCTION evade it. Denylists cannot enumerate every dangerous global. Fix: allowlist of permitted identifiers AND/OR run inside a real sandbox (quickjs/vm) with no globals. Found: safe-eval assertTrustedExpressionSource.**
- **H10 — - **H10 — Inert/premature policy options and flags silently overridden by a coarser threshold.** A documented control (e.g. \llowFinancial\, \llowSecuritySensitive\) that cannot actually gate anything because no enum/category maps to it (dead option), or is vetoed by another setting (a tier threshold checked first). Gives a false sense of safety. Check every boolean policy flag: is there a path where it is the controlling condition, and can another setting nullify it? Found: policy-engine allowFinancial (dead), allowSecuritySensitive (vetoed by maxRiskTier).**
- **H11 — - **H11 — Silent no-op on empty/edge inputs, and \?? default\ that swallows a falsy-but-valid value (0, '').** A routing/dispatch/mux function that resolves to an empty set still returns a 'success-ish' result (0 items, best=null, no error) instead of failing; and \x ?? default\ is used where 0 or '' is legitimate and must be distinguished from unset (so 0 becomes 'unset'). Check every fan-out/dispatch path: does it error on empty resolution, and is \??\ used on a value that can legitimately be 0/''? Found: provider-mux mux() empty providers (silent), maxProviders:0 swallowed by ??.**
- **H12 — - **H12 — Failover/re-dispatch without idempotency causes duplicate side effects.** A router/dispatch/client that retries or fails over by re-sending the SAME input to the next target (priority list, multi-provider) with no idempotency key or dedup. If an earlier target partially executed before 'failing' (timeout/5xx after commit), the retry re-applies the side effect (double charge, double send). Check every retry/failover loop: is there an idempotency key, and are retried capabilities idempotent? Found: router Router.route() failover re-dispatches identical payload to every target.**
- **H13 — - **H13 — Vocabulary/enum mismatch across related fields + returning unvalidated references.** Two related enums use different value sets (e.g. lifecycle status vs health status), a setter maps only SOME values and leaves others stale, and a filter on one vocabulary silently returns empty for the other's terms. Separately, a graph/lookup returns declared ids (dependencies, refs) without validating they resolve to real registered entities, so dangling/'ghost' ids are returned. Check every status/enum pair and every id-returning traversal. Found: kernel-registry (health vs EngineDescriptor status vocab; getDependencies returns unregistered dep ids).**
- **H14 — - **H14 — Missing/empty evidence defaults to a PERMISSIVE/POSITIVE value in a trust/risk/score computation (fail-open).** A trust/risk/health score where absent data is scored as 'good' (e.g. no latency rows -> 100, no circuits -> 100, no drifts -> 100, no outcomes -> 50/medium) instead of 'unknown/low'. Result: an entity with zero evidence scores as trusted (e.g. 68/100). Check every scoring/risk engine: does missing data lower or raise the score, and is there a minimum-evidence gate? Found: trust-score (no-data provider = 68; computeOperationScore = 50 on zero outcomes).**
- **H15 — - **H15 — Divergent side effects across two code paths that should be equivalent.** Two branches/methods that represent the 'same' operation produce different persistent side effects: one path persists and the other does not, or one stores-then-another re-stores duplicates. Often an if (x) { ... } else { ... } where only one branch does the store/call. Found: streaming-protocol (processIncremental parseIncremental branch never stores; finishConversation double-stores the buffer). Watch for: if (parser.x) {A} else {B} where A and B differ in side effects; 'once per item' vs 'once for whole batch' double-writes.**
