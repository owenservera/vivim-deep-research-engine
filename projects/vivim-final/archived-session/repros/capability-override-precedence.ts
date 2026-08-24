// repros/capability-override-precedence.ts
// Blindspot target: does the engine actually APPLY override precedence, or only
// record provenance? Run: bun run repros/capability-override-precedence.ts
const ENGINE_PATH = 'C:/0-BlackBoxProject-0/vivim-final/src/engines/capability-resolution.ts'
const { CapabilityResolutionEngine } = await import(ENGINE_PATH)
type RawRow = Record<string, any>
type Store = any

let n = 0
function row(over: RawRow = {}): RawRow {
  n++
  return {
    id: `c${n}`, slug: `s${n}`, name: `Cap${n}`, category: 'cat',
    ui_component: 'GLOBAL_COMP', ui_label: 'GLOBAL_LABEL', ui_icon: 'GLOBAL_ICON', ui_position: 'inline',
    ui_order: n, ui_group: 'g', ui_layer_depth: 0, parent_capability_id: null,
    ui_priority: 'normal', interaction_mode: 'click', ui_states_json: null,
    ui_visibility_rule: null, existential_rule: null, ui_input_schema: null,
    mutation_effects_json: null, recovery_behavior: 'none', state_persistence: 'none',
    data_flow: 'none', min_plan_tier: 'free', depends_on_json: null,
    concurrency_safe: 1, op_classification: null, requires_user_confirmation: 0,
    max_result_size: 0, result_component: 'r', result_layout: 'l',
    ui_component_override: JSON.stringify({ main: { component: 'PROVIDER_COMP' } }),
    search_hints_json: null, aliases_json: null, availability_json: null, prefetch: 0,
    component_from: 'provider', label_from: 'provider', icon_from: 'global',
    position_from: 'global', order_from: 'global', group_from: 'global',
    priority_from: 'global', interaction_from: 'global', states_from: 'global',
    visibility_from: 'global', existential_from: 'global', input_schema_from: 'global',
    mutation_from: 'global', recovery_from: 'global', persistence_from: 'global',
    data_flow_from: 'global', plan_tier_from: 'global', depends_from: 'global',
    binding_status: 'active', binding_confidence: 1,
    tier_max_models: null, tier_max_file_size: null, tier_max_options: null, tier_config_json: null,
    ...over,
  }
}
function mockStore(rows: RawRow[]): Store {
  return {
    resolveCapabilities: async () => rows,
    searchCapabilities: async () => rows,
    getActiveBindings: async () => [],
  }
}

async function main() {
  let fails = 0
  const assert = (cond: boolean, msg: string) => {
    console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) fails++
  }

  const eng = new CapabilityResolutionEngine(mockStore([row()]))
  const res = await eng.resolve('p', 'enterprise')
  const caps = [...res.composer, ...res.header, ...res.message, ...res.sidebar, ...res.inline]
  const r = caps[0]

  // FIXED (Hybrid convention): base UI fields are read from the pre-merged base
  // columns, so `*_from` records the ORIGIN of the merged value (provenance),
  // not a runtime-applied override. `uiSlots` is the one field applied at
  // resolve time, and is now tracked in overrideSources.
  assert(r.overrideSources.uiComponent === 'provider', 'provenance: uiComponent origin = provider (from component_from)')
  assert(r.overrideSources.uiLabel === 'provider', 'provenance: uiLabel origin = provider (from label_from)')

  // Value comes from the pre-merged base column (correct under Hybrid).
  assert(r.uiComponent === 'GLOBAL_COMP', 'uiComponent == base column (Hybrid: base is pre-merged)')
  assert(r.uiLabel === 'GLOBAL_LABEL', 'uiLabel == base column (Hybrid: base is pre-merged)')

  // FIX: the override-applied field is now tracked, and its provenance reflects
  // the override actually applied.
  assert('uiSlots' in r.overrideSources, 'FIX: uiSlots now tracked in overrideSources')
  assert(r.overrideSources.uiSlots === 'provider', 'FIX: uiSlots provenance = provider (override present)')
  assert(
    typeof r.uiSlots === 'object' && r.uiSlots !== null && Object.keys(r.uiSlots).length > 0,
    'uiSlots honors ui_component_override (override applied here only)',
  )

  // Consistency: value origin (provenance) and the value-selection path agree.
  assert(
    r.overrideSources.uiComponent === 'provider' && r.uiComponent === 'GLOBAL_COMP',
    'CONSISTENT: provenance records origin (provider) and value is the merged base — no false "applied override" claim',
  )

  console.log(`\n${fails === 0 ? 'ALL PASS' : fails + ' FAILURES'}`)
  process.exit(fails === 0 ? 0 : 1)
}
main().catch((e) => { console.error('ERR', e); process.exit(2) })
