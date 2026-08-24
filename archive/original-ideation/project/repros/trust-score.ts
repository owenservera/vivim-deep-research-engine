// repros/trust-score.ts
// Iteration 7 target: trust-score.ts (TrustScoreEngine).
// Executed checks using a fake CapStoreDb (no real DB/prisma).
//   D1 (missing data -> trusted, fail-open — H1/H4 family): A provider/capability
//       with NO evidence is scored as meaningfully trusted, because several
//       factors default to the MAX (100) on missing data (latency, circuit,
//       drift) while others default to neutral (50). A brand-new provider scores
//       ~68/100. computeOperationScore returns 50 (medium) on zero outcomes.
//   D2 (substring match — H7 family): circuit matching uses
//       `c.slaveId.includes(providerId)` (string containment), not equality, so
//       providerId 'p1' matches an unrelated slaveId 'p1-evil'.
// Run: bun run repros/trust-score.ts
import { TrustScoreEngine } from 'C:/0-BlackBoxProject-0/vivim-final/src/engines/trust-score.ts'

function makeDb(rows: any): any {
  return {
    prisma: {
      outcome: { findMany: async () => rows.outcome ?? [] },
      selectorStrategy: { findMany: async () => rows.selector ?? [] },
      circuitBreakerState: { findMany: async () => rows.circuit ?? [] },
      providerAccount: { findMany: async () => rows.account ?? [] },
      manifestDrift: { findMany: async () => rows.drift ?? [] },
    },
  }
}

async function main() {
  let fails = 0
  const ok = (cond: boolean, msg: string) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) fails++ }

  // Regression after fix: missing evidence must NOT be scored as trusted.
  const eng = new TrustScoreEngine(makeDb({}))
  const rep = await eng.computeProviderScore('p1')
  ok(rep.overallScore === 38,
    `no-data provider scores ${rep.overallScore}/100 (was 68; now untrusted, below 50)`)
  const lat = rep.factors.find((f) => f.name === 'latency')!
  const cir = rep.factors.find((f) => f.name === 'circuitState')!
  const dri = rep.factors.find((f) => f.name === 'driftStatus')!
  ok(lat.value === 0, 'FIX: latency=0 on NO latency data (was 100)')
  ok(cir.value === 0, 'FIX: circuit=0 on NO circuits (was 100)')
  ok(dri.value === 100, 'drift=100 on NO drifts (correct: no drift = healthy)')

  // computeOperationScore neutral default (intentionally left at 50).
  const op = await eng.computeOperationScore('p1', 'c1')
  ok(op === 50, 'computeOperationScore returns 50 (neutral) on zero outcomes')

  // D2 fixed: substring match must not produce false positives.
  // Use a CLOSED 'p1-evil' circuit: with the old substring `.includes`, 'p1'
  // matched 'p1-evil' (closed) and scored 100; with exact equality it does not
  // match, so provider 'p1' has no circuit record -> scored 0 (missing).
  const eng2 = new TrustScoreEngine(makeDb({ circuit: [{ slaveId: 'p1-evil', state: 'closed' }] }))
  const rep2 = await eng2.computeProviderScore('p1')
  const cir2 = rep2.factors.find((f) => f.name === 'circuitState')!
  ok(cir2.value === 0,
    `FIX: providerId 'p1' does NOT match unrelated slaveId 'p1-evil' (circuitScore ${cir2.value}; substring would be 100)`)
  // And equality still matches its OWN circuit.
  const eng3 = new TrustScoreEngine(makeDb({ circuit: [{ slaveId: 'p1', state: 'open' }] }))
  const rep3 = await eng3.computeProviderScore('p1')
  const cir3 = rep3.factors.find((f) => f.name === 'circuitState')!
  ok(cir3.value === 0, 'FIX: providerId "p1" matches its OWN circuit (equality)')

  console.log(`\n${fails === 0 ? 'ALL PASS (trust-score fix verified)' : fails + ' FAILURES'}`)
  process.exit(fails === 0 ? 0 : 1)
}
main().catch((e) => { console.error('ERR', e); process.exit(2) })
