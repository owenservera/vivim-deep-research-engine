// repros/kernel-registry.ts
// Iteration 6 target: kernel/kernel-registry.ts (KernelRegistry).
// Executed checks (pure in-memory, no DB needed).
//   D1 (status vocabulary mismatch — H3/H11): updateHealth maps
//       health.status 'healthy' -> EngineDescriptor.status 'running' and
//       'unhealthy' -> 'error', but 'degraded'/'unknown' leave status UNCHANGED
//       (stale). listEngines({status}) filters on EngineDescriptor.status, so a
//       caller filtering by a health word ('healthy'/'unhealthy'/'degraded')
//       silently gets an EMPTY list.
//   D2 (unresolved dependency returned — H1-ish): getDependencies returns
//       declared dependency ids even when they are NOT registered engines (no
//       validation that deps resolve).
// Run: bun run repros/kernel-registry.ts
import { KernelRegistry } from 'C:/0-BlackBoxProject-0/vivim-final/src/engines/kernel/kernel-registry.ts'

async function main() {
  let fails = 0
  const ok = (cond: boolean, msg: string) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) fails++ }

  const reg = new KernelRegistry()
  reg.registerEngine({ id: 'e1', kind: 'engine', dependencies: [], status: 'registered', config: {}, metadata: {} })

  // healthy -> status 'running' (lifecycle vocab)
  reg.updateHealth('e1', { status: 'healthy', lastCheck: Date.now() })
  ok(reg.getEngine('e1')!.status === 'running', 'updateHealth(healthy) maps status to "running"')
  ok(reg.getEngine('e1')!.health?.status === 'healthy', 'updateHealth records health.status')

  // filtering by health word now works (was empty due to vocab mismatch)
  ok(reg.listEngines({ status: 'healthy' }).length === 1,
    'FIX: listEngines({status:"healthy"}) matches on health (was empty)')
  ok(reg.listEngines({ status: 'running' }).length === 1,
    'listEngines({status:"running"}) works (lifecycle vocab)')

  // degraded health: engine is still operational -> running, health recorded
  reg.updateHealth('e1', { status: 'degraded', lastCheck: Date.now() })
  ok(reg.getEngine('e1')!.status === 'running',
    'FIX: updateHealth(degraded) keeps status "running" (operational) and records health')
  ok(reg.getEngine('e1')!.health?.status === 'degraded', 'updateHealth(degraded) records health.status')
  // unknown health: status unchanged, health recorded
  reg.updateHealth('e1', { status: 'unknown', lastCheck: Date.now() })
  ok(reg.getEngine('e1')!.status === 'running', 'updateHealth(unknown) leaves status unchanged')
  ok(reg.getEngine('e1')!.health?.status === 'unknown', 'updateHealth(unknown) records health')

  // FIX: getDependencies must not return unresolved ("ghost") dep ids
  reg.registerEngine({ id: 'e2', kind: 'engine', dependencies: ['ghost'], status: 'registered', config: {}, metadata: {} })
  reg.registerEngine({ id: 'e3', kind: 'engine', dependencies: [], status: 'registered', config: {}, metadata: {} })
  const deps = reg.getDependencies('e2')
  ok(!deps.includes('ghost'), 'FIX: getDependencies drops unresolved dep "ghost"')
  ok(reg.getEngine('ghost') === null, '"ghost" is NOT a registered engine')
  // registered deps still returned
  reg.registerEngine({ id: 'e4', kind: 'engine', dependencies: ['e3'], status: 'registered', config: {}, metadata: {} })
  ok(reg.getDependencies('e4').includes('e3'), 'getDependencies still returns registered deps')

  // secondary: updateHealth on missing engine throws (sanity / fail behavior)
  let threw = false
  try { reg.updateHealth('nope', { status: 'healthy', lastCheck: Date.now() }) } catch { threw = true }
  ok(threw, 'sanity: updateHealth on unknown engine throws')

  console.log(`\n${fails === 0 ? 'ALL PASS (kernel-registry defects demonstrated)' : fails + ' FAILURES'}`)
  process.exit(fails === 0 ? 0 : 1)
}
main().catch((e) => { console.error('ERR', e); process.exit(2) })
