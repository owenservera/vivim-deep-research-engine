claimed-by: lead (blindspot follow-up)
READY FOR VALIDATION

# Candidate: Override precedence is largely non-functional / `overrideSources` is untrustworthy

## Approach / claim
The fleet's first pass verified tier gating, existential rules, and search, but
skipped the `_from` override-source system. Inspecting `buildResult` (lines
244–294 of capability-resolution.ts) shows:

- The resolved field values (`uiComponent`, `uiLabel`, `uiIcon`, `uiPosition`,
  `uiOrder`, `uiGroup`, `uiPriority`, `interactionMode`, `uiStates`,
  `uiVisibilityRule`, `existentialRule`, `uiInputSchema`, `mutationEffects`,
  `recoveryBehavior`, `statePersistence`, `dataFlow`, `minPlanTier`,
  `dependsOn`) are **always taken from the base column** (`row.ui_component`,
  `row.ui_label`, …) regardless of the corresponding `_from` flag.
- `overrideSources` records provenance (`'provider' | 'tier' | 'global'`) for
  those 17 fields, but the recorded source does NOT correspond to the value
  actually used.
- The ONLY field that honors an override is `uiSlots`, pulled from
  `ui_component_override` (line 270) — yet `uiSlots` has **no `overrideSources`
  entry at all** (it is absent from the `overrideSources` object at 275–293).

Net: `overrideSources` can report `'provider'` for a field whose resolved value
is the base column, and the one field that applies an override has no
provenance. The override mechanism is internally inconsistent.

## Why it seems promising
Executed harness `repros/capability-override-precedence.ts` against the real
engine:
- `overrideSources.uiComponent === 'provider'` **PASS** (provenance claims override)
- `uiComponent === 'GLOBAL_COMP'` **PASS** (value is base, override ignored)
- `uiSlots` parsed from `ui_component_override` **PASS** (this field DOES honor override)
- `!('uiSlots' in overrideSources)` **PASS** (the override-applied field is untracked)
- CONTRADICTION (provenance says provider, value is base) **PASS**

## What needs to be checked next
- Whether the data model intends the **base columns to already be merged** at
  write time (so `_from` is purely informational and the engine is "correct"),
  OR intends `_override` columns to carry the effective value (so the engine
  silently drops overrides). Either way the `uiSlots`-vs-rest asymmetry is a
  defect: if base columns are pre-merged, `uiSlots` is wrong (it reads the
  override column instead of the merged base); if overrides should be applied,
  the other 17 fields are wrong.
- Whether any consumer trusts `overrideSources` for correctness (e.g. to decide
  "is this capability provider-customized?").

## Confidence
High — executed, deterministic, and visible directly in the source (value
selection vs `overrideSources` population are two independent code paths that
disagree). The *intended* contract is ambiguous, so severity for production
depends on the write-side convention, but the internal inconsistency is
unambiguous.

## Validation (validator agent, 2026-08-23)
Ran `repros/capability-override-precedence.ts` against the real engine.

1. **Counterexample**: with `component_from='provider'`, `ui_component='GLOBAL_COMP'`,
   `ui_component_override={main:{component:'PROVIDER_COMP'}}`, the resolved
   `uiComponent` is `'GLOBAL_COMP'` while `overrideSources.uiComponent` is
   `'provider'`. The harness asserts both and they PASS — the provenance claim
   and the actual value disagree.
2. **Independent re-derivation**: read `buildResult` (lines 240–305). Two
   independent paths: (a) value selection uses `row.ui_*` base columns
   unconditionally (244–269); (b) `overrideSources` population reads `row.*_from`
   columns (276–293). `uiSlots` is the lone exception, sourced from
   `ui_component_override` (270). The disagreement is structural, not a harness
   artifact.
3. **Edge / boundary**:
   - Same defect holds for `PlanTier='tier'` overrides — `overrideSources` can
     read `'tier'` for any of the 17 fields while the value stays base.
   - **Crucial ambiguity**: if the write-side *pre-merges* overrides into the
     base columns (so `ui_component` already holds the effective value), then
     `uiSlots` is the buggy one — it reads `ui_component_override` (the original
     global default / fallback), not the merged effective value. If instead
     `_override` columns hold the effective value (documented intent — the
     doc comment at line 66 says UI slots are "sourced from
     provider_capability.ui_component_override"), then the other 17 fields are
     the buggy ones (overrides silently dropped). **Either way the engine is
     internally inconsistent**; it cannot be correct under both conventions.
   - No consumer-side check mitigates this; `overrideSources` is presented as
     authoritative provenance.
4. **Executed stress**: `bun run repros/capability-override-precedence.ts` →
   ALL PASS (7/7).

**Suggested fix** (`capability-resolution.ts` `buildResult`, lines 240–294):
pick ONE convention and make both paths agree. Recommended (matches the doc
comment): `_from !== 'global'` selects the effective value. For `uiComponent`,
`uiLabel`, etc. this requires per-field override columns that the current schema
appears to lack — so either (a) implement override selection where override
columns exist and treat `_from` as authoritative, or (b) if only `uiSlots` is
overridable, drop the dead `_from`/`overrideSources` provenance for the other 17
fields and add `uiSlots` to `overrideSources` for consistency. Also: the
`uiSlots` absent-key bug is fixed by adding `uiSlots: toOverrideSource(...)`.

**Verdict: SURVIVED VALIDATION** — the inconsistency is confirmed by execution
and by independent source reading. It is a structural/design defect; production
impact depends on the (presently ambiguous) write-side convention, but the
engine cannot be internally consistent as written. Subagent validation, not
independent human review.
