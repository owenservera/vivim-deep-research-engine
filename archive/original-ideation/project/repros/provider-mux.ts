// repros/provider-mux.ts
// Iteration 4 target: provider-mux.ts (ProviderMuxEngine).
// Executed checks using a fake MuxStore + MuxDispatcher (no DB needed).
//   D1 (silent no-op): mux() with neither targetProviderIds nor a capabilityId
//       resolves to an EMPTY provider list, dispatches NOTHING, and returns a
//       "success-ish" MuxResponse (providerResponses=0, bestProviderId=null)
//       with no error. autoRoute() throws on empty, so the two paths disagree.
//   D2 (maxProviders:0): maxProviders is used as `?? providerIds.length`, so a
//       literal 0 is NOT treated as "unset" -> slice(0,0) -> nobody dispatched,
//       silent empty result even when providers are supplied.
//   D3 (cost budget exceeded): cost_optimized checks the budget BEFORE dispatch,
//       so a single provider whose cost exceeds the REMAINING budget is still
//       dispatched; total can overrun the budget by up to one provider's cost.
// Run: bun run repros/provider-mux.ts
import { ProviderMuxEngine } from 'C:/0-BlackBoxProject-0/vivim-final/src/engines/provider-mux.ts'

async function main() {
  let fails = 0
  const ok = (cond: boolean, msg: string) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) fails++ }

  const emptyStore: any = {
    createMuxSession: async () => {},
    updateMuxSession: async () => {},
    getMuxSession: async () => null,
    createMuxResponse: async () => {},
    getMuxResponses: async () => [],
    createRoutingPreference: async () => {},
    updateRoutingPreference: async () => {},
    getRoutingPreferences: async () => [],
  }
  const dispatcher: any = {
    dispatchToProvider: async (pid: string) => ({ ok: true, response: `r-${pid}`, latencyMs: 10, costCents: 6 }),
  }
  const eventBus: any = { emit: () => {} }
  const eng = new ProviderMuxEngine(emptyStore, dispatcher, undefined as any, eventBus)

  // D1 FIX: empty provider resolution now throws (fail-loud, consistent with autoRoute)
  let threw = false
  let resp: any
  try {
    resp = await eng.mux({ strategy: 'fan_out', maxProviders: 3, synthesisEnabled: false, timeoutMs: 1000 } as any)
  } catch { threw = true }
  ok(threw, 'FIX D1: mux() with no providers THROWS (no silent empty success)')

  // D2: maxProviders = 0 -> deliberate no-op (valid), still nobody dispatched,
  // but no longer a confusing silent success (engine logs a warning).
  threw = false
  try {
    resp = await eng.mux({
      strategy: 'fan_out', targetProviderIds: ['p1', 'p2'], maxProviders: 0,
      synthesisEnabled: false, timeoutMs: 1000,
    } as any)
  } catch { threw = true }
  ok(!threw && resp && resp.providerResponses.length === 0,
    'D2: maxProviders:0 dispatches nobody (valid deliberate no-op, not treated as unset)')

  // D3 FIX: cost_optimized stops immediately once over budget (no further
  // dispatches). Budget=10, each provider=6 -> at most 2 dispatched (12).
  const costDispatcher: any = {
    dispatchToProvider: async (pid: string) => ({ ok: true, response: `r-${pid}`, latencyMs: 10, costCents: 6 }),
  }
  const eng2 = new ProviderMuxEngine(emptyStore, costDispatcher, undefined as any, eventBus)
  resp = await eng2.mux({
    strategy: 'cost_optimized', targetProviderIds: ['p1', 'p2', 'p3'],
    maxProviders: 3, synthesisEnabled: false, timeoutMs: 1000, costBudgetCents: 10,
  } as any)
  const total = resp.totalCostCents
  const count = resp.providerResponses.length
  ok(count === 2 && total === 12,
    `FIX D3: cost_optimized budget=10 -> dispatched ${count} providers, total ${total} (stops at overage, no 3rd dispatch)`)

  console.log(`\n${fails === 0 ? 'ALL PASS (provider-mux fixes verified)' : fails + ' FAILURES'}`)
  process.exit(fails === 0 ? 0 : 1)
}
main().catch((e) => { console.error('ERR', e); process.exit(2) })
