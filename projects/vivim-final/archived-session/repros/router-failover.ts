// repros/router-failover.ts
// Iteration 5 target: router (src/router/router.ts — Router.route()).
// Executed check using a fake RouterStore + RouteDispatcher.
//   D1 (failover re-dispatch / no idempotency — H12): route() iterates ALL
//       active targets in priority order and dispatches the SAME input to each
//       until one succeeds. For a non-idempotent capability (payment, send) this
//       re-sends the identical payload to multiple providers, causing duplicate
//       side effects if an earlier target partially-executed before "failing"
//       (timeout/network). There is no idempotency key / dedup.
//   D2 (provenance on total failure): when all targets fail, the returned
//       targetProviderId is activeTargets[0] (the first/highest-priority target),
//       which is the one that failed — misleading for error reporting (H2-ish).
// Run: bun run repros/router-failover.ts
import { Router } from 'C:/0-BlackBoxProject-0/vivim-final/src/router/router.ts'

async function main() {
  let fails = 0
  const ok = (cond: boolean, msg: string) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) fails++ }

  const calls: Array<{ targetId: string; providerId: string; payload: unknown }> = []
  const store: any = {
    listSpecs: async () => [{ id: 's1', capability_id: 'cap1', provider_id: 'p1', is_active: 1 }],
    listTargets: async () => [
      { id: 't1', route_spec_id: 's1', provider_id: 'pA', account_id: null, priority: 1, is_active: 1 },
      { id: 't2', route_spec_id: 's1', provider_id: 'pB', account_id: null, priority: 2, is_active: 1 },
    ],
    createRequest: async () => {},
    updateRequest: async () => {},
    createEvent: async () => {},
  }
  const dispatcher: any = {
    dispatch: async (target: any, input: any) => {
      calls.push({ targetId: target.id, providerId: target.provider_id, payload: input.payload })
      if (target.id === 't1') return { ok: false, error: 'boom' }
      return { ok: true }
    },
  }
  const router = new Router(store, dispatcher)

  const res = await router.route({ capabilityId: 'cap1', providerId: 'p1', payload: { amount: 100 } })

  // D1: cross-target failover still re-sends the payload to the next provider on
  // failure (intentional at-least-once behavior; preserved).
  ok(calls.length === 2, 'D1: failover dispatched the input to 2 targets (t1 then t2)')
  ok(calls[0].payload === calls[1].payload, 'D1: identical payload re-sent to next provider on failover (intended)')
  ok(res.ok === true && res.targetProviderId === 'pB', 'D1: eventually succeeded via t2 (pB)')

  // D4 FIX (H12 idempotency): a duplicate target row for the same provider is NOT
  // double-dispatched within one request.
  const calls2: Array<{ targetId: string; providerId: string }> = []
  const storeDup: any = {
    listSpecs: async () => [{ id: 's1', capability_id: 'cap1', provider_id: 'p1', is_active: 1 }],
    listTargets: async () => [
      { id: 't1', route_spec_id: 's1', provider_id: 'pA', account_id: null, priority: 1, is_active: 1 },
      { id: 't2', route_spec_id: 's1', provider_id: 'pA', account_id: null, priority: 2, is_active: 1 }, // duplicate provider
      { id: 't3', route_spec_id: 's1', provider_id: 'pB', account_id: null, priority: 3, is_active: 1 },
    ],
    createRequest: async () => {},
    updateRequest: async () => {},
    createEvent: async () => {},
  }
  const dispatcherDup: any = {
    dispatch: async (target: any) => {
      calls2.push({ targetId: target.id, providerId: target.provider_id })
      // pA always fails, pB succeeds
      return { ok: target.provider_id === 'pB' }
    },
  }
  const r3 = await new Router(storeDup, dispatcherDup).route(
    { capabilityId: 'cap1', providerId: 'p1', payload: { amount: 7 } },
  )
  ok(r3.ok === true && r3.targetProviderId === 'pB', 'D4: succeeded via pB (pA attempted once, pB once)')
  const pADispatches = calls2.filter((c) => c.providerId === 'pA').length
  ok(pADispatches === 1, `FIX D4: provider pA dispatched exactly once (${pADispatches}) despite two duplicate target rows (idempotency guard)`)

  // D2: total failure returns the FIRST target as targetProviderId (which is the one that failed)
  const storeAllFail: any = {
    ...store,
    listTargets: async () => [
      { id: 't1', route_spec_id: 's1', provider_id: 'pA', account_id: null, priority: 1, is_active: 1 },
      { id: 't2', route_spec_id: 's1', provider_id: 'pB', account_id: null, priority: 2, is_active: 1 },
    ],
  }
  const dispatcherAllFail: any = {
    dispatch: async (target: any, input: any) => {
      calls.push({ targetId: target.id, providerId: target.provider_id, payload: input.payload })
      return { ok: false, error: `fail-${target.id}` }
    },
  }
  const r2 = await new Router(storeAllFail, dispatcherAllFail).route(
    { capabilityId: 'cap1', providerId: 'p1', payload: { amount: 50 } },
  )
  ok(r2.ok === false && r2.targetProviderId === '',
    'FIX: total-failure targetProviderId is empty (no misleading failed-target provenance)')

  console.log(`\n${fails === 0 ? 'ALL PASS (router fix verified)' : fails + ' FAILURES'}`)
  process.exit(fails === 0 ? 0 : 1)
}
main().catch((e) => { console.error('ERR', e); process.exit(2) })
