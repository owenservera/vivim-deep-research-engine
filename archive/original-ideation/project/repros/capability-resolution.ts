// repros/capability-resolution.ts
// Executed verification for candidate "capability-resolution invariants".
// Run: bun run repros/capability-resolution.ts  (from research project dir)
const ENGINE_PATH = 'C:/0-BlackBoxProject-0/vivim-final/src/engines/capability-resolution.ts'
const { CapabilityResolutionEngine } = await import(ENGINE_PATH)
type RawRow = Record<string, any>
type Store = any

let n = 0
function row(over: RawRow = {}): RawRow {
  n++
  return {
    id: `c${n}`, slug: `s${n}`, name: `Cap${n}`, category: 'cat',
    ui_component: 'x', ui_label: 'l', ui_icon: 'i', ui_position: 'inline',
    ui_order: n, ui_group: 'g', ui_layer_depth: 0, parent_capability_id: null,
    ui_priority: 'normal', interaction_mode: 'click', ui_states_json: null,
    ui_visibility_rule: null, existential_rule: null, ui_input_schema: null,
    mutation_effects_json: null, recovery_behavior: 'none', state_persistence: 'none',
    data_flow: 'none', min_plan_tier: 'free', depends_on_json: null,
    concurrency_safe: 1, op_classification: null, requires_user_confirmation: 0,
    max_result_size: 0, result_component: 'r', result_layout: 'l',
    ui_component_override: null, search_hints_json: null, aliases_json: null,
    availability_json: null, prefetch: 0,
    component_from: 'global', label_from: 'global', icon_from: 'global',
    position_from: 'global', order_from: 'global', group_from: 'global',
    priority_from: 'global', interaction_from: 'global', states_from: 'global',
    visibility_from: 'global', existential_from: 'global', input_schema_from: 'global',
    mutation_from: 'global', recovery_from: 'global', persistence_from: 'global',
    data_flow_from: 'global', plan_tier_from: 'global', depends_from: 'global',
    binding_status: 'active', binding_confidence: 1,
    tier_max_models: null, tier_max_file_size: null, tier_max_options: null,
    tier_config_json: null,
    ...over,
  }
}

function mockStore(rows: RawRow[]): Store {
  return {
    resolveCapabilities: async () => rows,
    searchCapabilities: async (_p: string, _t: string, _q: string) => rows,
    getActiveBindings: async () => [],
  }
}

function ids(r: any): string[] {
  return [...r.composer, ...r.header, ...r.message, ...r.sidebar, ...r.inline].map((c: any) => c.id)
}

async function main() {
  let fails = 0
  const assert = (cond: boolean, msg: string) => {
    console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`)
    if (!cond) fails++
  }

  // ---- I1 + I2: tier monotonicity + gating (with case-sensitivity probe) ----
  const caps = [
    row({ id: 'free1', min_plan_tier: 'free' }),
    row({ id: 'pro1', min_plan_tier: 'pro' }),
    row({ id: 'max1', min_plan_tier: 'max' }),
    row({ id: 'ent1', min_plan_tier: 'enterprise' }),
    // Case / spelling probes:
    row({ id: 'entUpper', min_plan_tier: 'ENTERPRISE' }),
    row({ id: 'proMixed', min_plan_tier: 'Pro' }),
  ]
  const eng = new CapabilityResolutionEngine(mockStore(caps))
  const rFree = new Set(ids(await eng.resolve('p', 'free')))
  const rPro = new Set(ids(await eng.resolve('p', 'pro')))
  const rMax = new Set(ids(await eng.resolve('p', 'max')))
  const rEnt = new Set(ids(await eng.resolve('p', 'enterprise')))

  assert(rFree.has('free1') && !rFree.has('pro1') && !rFree.has('max1') && !rFree.has('ent1'),
    'I2a free tier shows only free cap')
  assert(rPro.has('pro1') && !rPro.has('max1') && !rPro.has('ent1'), 'I2b pro tier gates max/ent')
  // monotonicity
  assert([...rFree].every((x) => rPro.has(x)) && [...rPro].every((x) => rMax.has(x)) &&
         [...rMax].every((x) => rEnt.has(x)), 'I1 tier monotonicity (low ⊆ high)')

  // ---- I2c: case-sensitivity bug probe ----
  // A cap whose min_plan_tier is uppercased must STILL be gated from 'free'.
  assert(!rFree.has('entUpper'), 'I2c ENTprise(case) gated from free')
  assert(!rFree.has('proMixed'), 'I2c Pro(case) gated from free')
  // and from 'pro' the uppercased enterprise cap must be gated too
  assert(!rPro.has('entUpper'), 'I2c ENTprise(case) gated from pro')

  // ---- I3: existential correctness ----
  const exCaps = [
    row({ id: 'eqNum', existential_rule: 'level == 3' }),
    row({ id: 'eqStr', existential_rule: 'mode == dark' }),
    row({ id: 'neStr', existential_rule: 'mode != dark' }),
    row({ id: 'notKey', existential_rule: '!enabled' }),
  ]
  const exEng = new CapabilityResolutionEngine(mockStore(exCaps))
  const ctx = async (c: Record<string, unknown>) =>
    new Set(ids(await exEng.resolve('p', 'enterprise', { conversationContext: c })))
  const e1 = await ctx({ level: 3 }); assert(e1.has('eqNum') && !e1.has('eqStr'), 'I3a level==3 includes eqNum')
  const e2 = await ctx({ level: 2 }); assert(!e2.has('eqNum'), 'I3b level==3 excludes level=2')
  const e3 = await ctx({ mode: 'dark' }); assert(e3.has('eqStr') && !e3.has('neStr'), 'I3c mode==dark includes eq, excludes ne')
  const e4 = await ctx({ mode: 'light' }); assert(!e4.has('eqStr') && e4.has('neStr'), 'I3d mode=light inverse')
  const e5 = await ctx({ enabled: false }); assert(e5.has('notKey'), 'I3e !enabled true when false')
  const e6 = await ctx({ enabled: true }); assert(!e6.has('notKey'), 'I3f !enabled false when true')
  // numeric coercion in == : context value is a number 3, rule 'level == 3'
  const e7 = await ctx({ level: 3 as any }); assert(e7.has('eqNum'), 'I3g numeric coercion (3 == "3")')
  // context value as string '3' also matches
  const e8 = await ctx({ level: '3' as any }); assert(e8.has('eqNum'), 'I3h string ' + "'3' == '3'")

  // ---- I4: search ⊆ resolve ----
  const all = [
    row({ id: 'a', name: 'Alpha', search_hints_json: '["zzz"]' }),
    row({ id: 'b', name: 'Beta', min_plan_tier: 'max' }),
    row({ id: 'c', name: 'Gamma', existential_rule: 'ok == yes' }),
  ]
  const sEng = new CapabilityResolutionEngine(mockStore(all))
  const base = new Set(ids(await sEng.resolve('p', 'enterprise')))
  const srch = await sEng.search('p', 'enterprise', 'alpha')
  const srchIds = ids(srch)
  assert(srchIds.every((x) => base.has(x)), 'I4 search results ⊆ resolve results')
  assert(srchIds.includes('a'), 'I4 search "alpha" finds Alpha')

  console.log(`\n${fails === 0 ? 'ALL PASS' : fails + ' FAILURES'}`)
  process.exit(fails === 0 ? 0 : 1)
}
main().catch((e) => { console.error('ERR', e); process.exit(2) })
