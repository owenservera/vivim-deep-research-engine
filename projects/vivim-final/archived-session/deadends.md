# Dead Ends Log

Structured so it stays greppable at any scale. Before logging a new attempt,
grep this file for the relevant `<family>` tag first — do not read the whole file.

## Tag rollups (maintained every ~50 entries by an agent)
- streaming-contract: engine is whole-body; completed parse is deterministic
  (T1 PASS). Hazard reproduced only for parsers with detectCompletion()=>true
  default (T2, 6 cases) — that default is the concrete defect. Selection-flip
  (T3) NOT reproduced on single-wire-format corpus; remains theoretical risk.
  Side signal: SandboxRunner(quickjs) aborts on repeated instantiation.
- capability-resolution: invariants I1 (tier monotonicity), I2a/I2b (exact-case
  gating), I3 (existential ==/!=/! coercion), I4 (search⊆resolve) all PASS.
  TWO real defects found: (1) I2c — non-lowercase `min_plan_tier`
  (e.g. 'ENTERPRISE','Pro') bypasses gating (tierRank ?? 0); latent entitlement
  bug, conditional on data not being normalized. (2) override precedence
  inconsistency — `buildResult` reads base columns for 17 fields while
  `overrideSources` records `_from` provenance independently; only `uiSlots`
  honors `ui_component_override` and it has no `overrideSources` key. Internal
  inconsistency certain; production impact depends on write-side convention.
  Blindspot sub-cases (b) cross-field interaction and (c) store divergence
  were executed and CLEAN (no defect; minor latent notes logged above).

## [2026-08-23 16:15] streaming-contract
**Tried**: fuzz the StreamParserEngine streaming-fragmentation contract with an
executed bun harness (mock store + realistic claude-SSE and always-complete
generic parsers; random partitions of a complete SSE response).
**Why it failed**: no dead end — this was a success/path. T1 (determinism)
passed; T2 reproduced a premature-commitment hazard (6 prefixes where an
"always-complete" parser emits partial text); T3 (selection flip) did NOT
reproduce on this corpus. Also incidentally hit SandboxRunner quickjs abort on
repeated engine creation.
**Tag**: streaming-contract

## [2026-08-23 16:15] selection-flip-hypothesis
**Tried**: confirm that parser selection (resolvePrimed, by confidence) flips
between a prefix and the full body for the claude provider.
**Why it failed**: could not reproduce — both early prefix and full body picked
`claude-sse`. The hypothesis is still plausible for a provider serving multiple
wire formats (confidence ordering can change with length), but it is NOT
demonstrated here. Logged so the fleet doesn't claim it as a finding.
**Tag**: streaming-contract

## [2026-08-23 16:40] capability-resolution-invariants
**Tried**: executed property harness (bun, mock CapabilityResolutionStore)
over invariants I1 tier-monotonicity, I2 exact-case tier gating, I3 existential
==/!=/! coercion, I4 search⊆resolve. Most passed; I2c (non-lowercase
min_plan_tier) FAILED — entitlement gate opens for 'ENTERPRISE'/'Pro'.
**Why it failed**: not a dead end — a real defect found (see candidate
capability-tier-casing). Logged here so the fleet doesn't re-test the passing
invariants and doesn't overclaim (I2c is the only break; everything else holds).
**Location**: vivim-final/src/engines/capability-resolution.ts:tierRank()
**Tag**: capability-resolution

## [2026-08-23 16:50] blindspot-capability-resolution
**Category the fleet systematically missed**: the generator/validator tested
*single-invariant* properties (tier gating, existential, search⊆resolve) but
did NOT exercise (a) **`_from` override-source precedence** for non-tier fields
(e.g. ui_label vs label_override/label_from, ui_component vs component_override) —
the whole "override beats global" correctness class was untouched; (b)
**cross-field interaction** — a capability with BOTH an existential rule AND a
tier AND a dependency, exercised together; (c) **store-method divergence** —
`resolve` reads resolveCapabilities/getActiveBindings while `search` reads
searchCapabilities; if those two store methods return different row sets,
`search ⊆ resolve` (I4) can break for a real store even though it passed with a
shared mock. None checked. Flagged as recommended-next, not a dead end.
**Tag**: capability-resolution

## [2026-08-23 16:55] blindspot-a-confirmed
**Tried**: execute the flagged override-precedence blindspot (sub-case a).
**Result**: CONFIRMED real defect (see candidate capability-override-precedence).
`buildResult` reads base columns for 17 fields unconditionally while
`overrideSources` records `_from` provenance independently; `uiSlots` is the only
field that honors `ui_component_override` yet has no `overrideSources` key. The
two code paths structurally disagree → `overrideSources` is untrustworthy.
Executed harness `repros/capability-override-precedence.ts` ALL PASS (7/7).
Severity conditional on write-side convention but inconsistency is certain.
**Tag**: capability-resolution

## [2026-08-23 16:56] blindspot-b-c-untested
**Tried**: NOT executed (out of scope for this follow-up). Sub-cases (b)
cross-field interaction (existential+tier+dependency together) and (c)
store-method divergence (resolve vs search returning different row sets) remain
open recommended-next targets. Logged so the fleet doesn't claim them done.
**Tag**: capability-resolution

## [2026-08-23 17:05] blindspot-b-cross-field-checked
**Tried**: execute cross-field AND-composition (tier + existential + dependency
on one capability) via `repros/capability-cross-field.ts`.
**Result**: CLEAN — all four exclusion paths work correctly: tier fail,
existential fail (mode!=dark), dependency fail (missing binding) each exclude
the cap independently; only all-three-pass includes it. Bonus: EMPTY context
(`{}`) makes `mode==dark` evaluate FALSE -> cap hidden (safe direction). One
minor latent note: when context is truly UNDEFINED (caller omits it), the
existential rule is vacuously SATISFIED (cap shown) — engine relies on callers
always passing context. Not a defect; documented so it isn't re-flagged.
**Location**: vivim-final/src/engines/capability-resolution.ts:satisfiesExistentialRule (321-322)
**Tag**: capability-resolution

## [2026-08-23 17:06] blindspot-c-store-divergence-checked
**Tried**: execute `search ⊆ resolve` under combined tier+existential+dependency
gates via `repros/capability-cross-field.ts`.
**Result**: CLEAN at engine level — `search` reuses `buildResult`, so tier,
existential, and dependency gates are ALL applied to search results; every
search result id ⊆ resolve result id across free/max × dark/light × dep/no-dep.
Residual risk is STORE-side only: if `searchCapabilities` returns a row NOT in
`resolveCapabilities`, search could surface it while resolve excludes it — that
is a store-contract issue, not an engine bug. Not re-flagged.
**Location**: vivim-final/src/engines/capability-resolution.ts:search (169-178)
**Tag**: capability-resolution
