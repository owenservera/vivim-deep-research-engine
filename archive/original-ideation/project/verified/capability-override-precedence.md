VALIDATED

# Verified: Override precedence is largely non-functional / `overrideSources` untrustworthy

## What was found
In `CapabilityResolutionEngine.buildResult` the resolved capability field values
are **always read from the base columns** (`row.ui_component`, `row.ui_label`,
…) regardless of the corresponding `_from` flag, while a separately-populated
`overrideSources` object records provenance (`'provider' | 'tier' | 'global'`)
for 17 fields. The only field that honors an override, `uiSlots`, is pulled from
`ui_component_override` — yet `uiSlots` has **no entry in `overrideSources`**.

Consequence: `overrideSources` can assert a field was sourced from `provider`
while the resolved value is the base column. The override mechanism is
internally inconsistent, and (depending on the write-side convention) either
provider/tier overrides are silently dropped for 17 fields, or `uiSlots`
reads the wrong column.

## How it was verified
Executed `repros/capability-override-precedence.ts` (bun, mock store + real
engine). With `component_from='provider'`, `ui_component='GLOBAL_COMP'`,
`ui_component_override={main:{component:'PROVIDER_COMP'}}`:
- `overrideSources.uiComponent === 'provider'` — PASS (provenance claims override)
- `uiComponent === 'GLOBAL_COMP'` — PASS (value is base; override ignored)
- `uiSlots` parsed from `ui_component_override` — PASS (this field honors override)
- `!('uiSlots' in overrideSources)` — PASS (override-applied field is untracked)
- contradiction (provenance says provider, value is base) — PASS
All 7 assertions PASS.

## Severity (honest)
- The **internal inconsistency is certain** — two independent code paths
  (value selection vs `overrideSources` population) structurally disagree, and
  this is visible directly in the source.
- The **production impact depends on the write-side convention**, which is
  ambiguous:
  - If base columns are pre-merged at write time, `uiSlots` is the buggy path
    (reads the override/fallback column, not the effective value).
  - If `_override` columns carry the effective value (the documented intent —
    doc comment at line 66 says UI slots are "sourced from
    provider_capability.ui_component_override"), then the other 17 fields
    silently drop overrides.
- This is **subagent validation**, not independent human-expert confirmation.

## Suggested fix
Pick one convention and make both paths agree. Recommended (matches the doc
comment): when `_from !== 'global'`, use the effective override value. For the
fields that lack an override column, either implement selection or drop the dead
`_from`/`overrideSources` provenance; and add `uiSlots` to `overrideSources`.

## Companion finding
This blindspot was flagged because the first fleet pass only tested single
invariants (tier, existential, search) and never exercised the `_from` override
system at all.
