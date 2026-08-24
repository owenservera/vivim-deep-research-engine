// repros/capability-cross-field.ts
// Blindspot sub-cases (b) cross-field AND-composition (tier+existential+dependency)
// and (c) search ⊆ resolve under combined gates.
// Run: bun run repros/capability-cross-field.ts
const ENGINE_PATH = 'C:/0-BlackBoxProject-0/vivim-final/src/engines/capability-resolution.ts'
const { CapabilityResolutionEngine } = await import(ENGINE_PATH)
type RawRow = Record<string, any>
type Store = any

let n = 0
function baseRow(over: RawRow = {}): RawRow {
  n++
  return {
    id: `c${n}`, slug: `s${n}`, name: `Special${n}`, category: 'cat',
    ui_component: 'x', ui_label: 'l', ui_icon: 'i', ui_position: 'inline',
    ui_order: n, ui_group: 'g', ui_layer_depth: 0, parent_capability_id: null,
    ui_priority: 'normal', interaction_mode: 'click', ui_states_json: null,
    ui_visibility_rule: null, ui_input_schema: null, mutation_effects_json: null,
    recovery_behavior: 'none', state_persistence: 'none', data_flow: 'none',
    min_plan_tier: 'free', depends_on_json: null, concurrency_safe: 1,
    op_classification: null, requires_user_confirmation: 0, max_result_size: 0,
    result_component: 'r', result_layout: 'l', ui_component_override: null,
    search_hints_json: JSON.stringify(['zzz']), aliases_json: null,
    availability_json: null, prefetch: 0,
    component_from: 'global', label_from: 'global', icon_from: 'global',
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

// A cap gated by ALL THREE: tier=max, existential mode==dark, depends on depA
const gated = baseRow({
  id: 'GATED', name: 'Special', slug: 'special', min_plan_tier: 'max',
  existential_rule: 'mode == dark', depends_on_json: JSON.stringify(['depA']),
})

function mockStore(rows: RawRow[], bindings: string[]): Store {
  return {
    resolveCapabilities: async () => rows,
    searchCapabilities: async () => rows, // consistent store (b/c divergence is store-side only)
    getActiveBindings: async () => bindings,
  }
}
function allIds(res: any): Set<string> {
  return new Set([...res.composer, ...res.header, ...res.message, ...res.sidebar, ...res.inline].map((c: any) => c.id))
}

async function main() {
  let fails = 0
  const assert = (cond: boolean, msg: string) => {
    console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) fails++
  }

  // ---- (b) cross-field AND-composition ----
  const scen = async (plan: string, ctx: any, bindings: string[]) => {
    const eng = new CapabilityResolutionEngine(mockStore([gated], bindings))
    return allIds(await eng.resolve('p', plan as any, { conversationContext: ctx }))
  }
  const s1 = await scen('max', { mode: 'dark' }, ['depA'])
  assert(s1.has('GATED'), 'b: tier ok + existential ok + dep ok -> INCLUDED')
  const s2 = await scen('free', { mode: 'dark' }, ['depA'])
  assert(!s2.has('GATED'), 'b: tier fails -> EXCLUDED (despite existential+dep ok)')
  const s3 = await scen('max', { mode: 'light' }, ['depA'])
  assert(!s3.has('GATED'), 'b: existential fails -> EXCLUDED (despite tier+dep ok)')
  const s4 = await scen('max', { mode: 'dark' }, [])
  assert(!s4.has('GATED'), 'b: dependency fails -> EXCLUDED (despite tier+existential ok)')
  const s5 = await scen('max', {}, ['depA'])
  assert(!s5.has('GATED'), 'b: EMPTY context -> existential mode==dark EVALUATES false -> EXCLUDED (safe)')

  // truly-undefined context (caller omits context): fail-closed -> rule cannot
  // be proven, so the capability is EXCLUDED (H6 fix).
  const s6ids = allIds(await new CapabilityResolutionEngine(mockStore([gated], ['depA'])).resolve('p', 'max' as any))
  assert(!s6ids.has('GATED'), 'FIX b: UNDEFINED context -> existential fail-closed -> EXCLUDED (no vacuous include)')

  // ---- (c) search ⊆ resolve under combined gates ----
  const srch = async (plan: string, ctx: any, bindings: string[], q: string) => {
    const eng = new CapabilityResolutionEngine(mockStore([gated], bindings))
    return allIds(await eng.search('p', plan as any, q, { conversationContext: ctx }))
  }
  const rFree = await scen('free', { mode: 'dark' }, ['depA'])
  const sFree = await srch('free', { mode: 'dark' }, ['depA'], 'special')
  assert([...sFree].every((x) => rFree.has(x)), 'c: search(free) ⊆ resolve(free) [tier gate]')
  assert(sFree.size === 0, 'c: search(free) empty (tier gate applied in search)')

  const rLight = await scen('max', { mode: 'light' }, ['depA'])
  const sLight = await srch('max', { mode: 'light' }, ['depA'], 'special')
  assert([...sLight].every((x) => rLight.has(x)), 'c: search(max,light) ⊆ resolve(max,light) [existential gate]')
  assert(sLight.size === 0, 'c: search(max,light) empty (existential gate applied in search)')

  const rNoDep = await scen('max', { mode: 'dark' }, [])
  const sNoDep = await srch('max', { mode: 'dark' }, [], 'special')
  assert([...sNoDep].every((x) => rNoDep.has(x)), 'c: search(max,no-dep) ⊆ resolve [dependency gate]')
  assert(sNoDep.size === 0, 'c: search(max,no-dep) empty (dependency gate applied in search)')

  const rOk = await scen('max', { mode: 'dark' }, ['depA'])
  const sOk = await srch('max', { mode: 'dark' }, ['depA'], 'special')
  assert(sOk.has('GATED') && [...sOk].every((x) => rOk.has(x)), 'c: search(max,ok) finds GATED and ⊆ resolve')

  // store-method divergence note: if searchCapabilities returned a row NOT in
  // resolveCapabilities, search could include it while resolve excludes it.
  // That is a store-contract risk, not an engine bug; engine always re-gates.
  console.log(`\n${fails === 0 ? 'ALL PASS' : fails + ' FAILURES'}`)
  process.exit(fails === 0 ? 0 : 1)
}
main().catch((e) => { console.error('ERR', e); process.exit(2) })
