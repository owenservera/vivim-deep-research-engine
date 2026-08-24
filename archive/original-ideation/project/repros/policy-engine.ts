// repros/policy-engine.ts
// Iteration 3 target: policy-engine.ts (P0PolicyEngine).
// Executed checks:
//   D1 (H1 fail-open): unknown risk -> RISK_TIER[risk] ?? 0 -> tier 0 -> allowed,
//       no tier gate, no switch case. Policy engine trusts caller; if a plan
//       reaches evaluate without Zod re-validation (internally-built plan, a new
//       risk added to the enum but not to policy-engine's RISK_TIER, or a drift
//       between the two duplicated RISK_TIER maps), the unrecognized risk is
//       silently ALLOWED.
//   D2: allowFinancial option is DEAD — CapabilityRisk has no `financial` value,
//       so financial ops cannot be gated by it (conflated under existing risks).
//   D3: allowSecuritySensitive is silently overridden by maxRiskTier (tier check
//       runs first); setting the flag alone does nothing.
// Run: bun run repros/policy-engine.ts
import { P0PolicyEngine } from 'C:/0-BlackBoxProject-0/vivim-final/src/engines/policy-engine.ts'

async function main() {
  let fails = 0
  const ok = (cond: boolean, msg: string) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) fails++ }

  const plan = (risk: string, extra: any = {}) => ({
    version: 1, goal: 'g', nodes: [{ id: 'n1', capability: 'c', input: {}, risk, ...extra }],
  }) as any

  // sanity: default engine correctly denies known-dangerous risks
  let d = new P0PolicyEngine().evaluate(plan('destructive'))
  ok(!d.allowed, 'sanity: default engine denies "destructive"')
  d = new P0PolicyEngine().evaluate(plan('security_sensitive'))
  ok(!d.allowed, 'sanity: default engine denies "security_sensitive"')

  // D1 (H1 fail-closed after fix): unknown risk must now be DENIED
  d = new P0PolicyEngine().evaluate(plan('financial'))
  ok(!d.allowed, 'D1/H1 (fixed): unknown risk "financial" -> DENIED (fail-closed)')
  d = new P0PolicyEngine().evaluate(plan('UNKNOWN'))
  ok(!d.allowed, 'D1/H1 (fixed): unknown risk "UNKNOWN" -> DENIED (fail-closed)')

  // D2 FIX: financial operations are classified as `security_sensitive`, so
  // `allowFinancial` is now a functional alternative gate for them.
  const engFin = new P0PolicyEngine({ allowFinancial: true })
  d = engFin.evaluate(plan('security_sensitive'))
  ok(d.allowed,
    'FIX D2: allowFinancial:true permits security_sensitive (financial) ops — flag now functional')
  // allowFinancial alone must NOT permit non-financial destructive ops:
  const engFinD = new P0PolicyEngine({ allowFinancial: true })
  ok(!engFinD.evaluate(plan('destructive')).allowed,
    'FIX D2: allowFinancial does NOT permit destructive (only financial/security_sensitive)')

  // D3 FIX: allowSecuritySensitive is no longer vetoed by the numeric threshold.
  const engSec = new P0PolicyEngine({ allowSecuritySensitive: true })
  d = engSec.evaluate(plan('security_sensitive'))
  ok(d.allowed,
    'FIX D3: allowSecuritySensitive:true permits security_sensitive — flag honored (overrides threshold)')

  // Regression: without the flags, security_sensitive stays denied.
  ok(!new P0PolicyEngine().evaluate(plan('security_sensitive')).allowed,
    'REG: security_sensitive still DENIED by default (no flags)')
  // Regression: maxRiskTier still caps destructive.
  ok(!new P0PolicyEngine({ allowDestructive: true, maxRiskTier: 2 }).evaluate(plan('destructive')).allowed,
    'REG: maxRiskTier:2 still blocks destructive (tier 3) even with allowDestructive')
  ok(new P0PolicyEngine({ allowDestructive: true, maxRiskTier: 3 }).evaluate(plan('destructive')).allowed,
    'REG: allowDestructive + maxRiskTier:3 permits destructive')

  console.log(`\n${fails === 0 ? 'ALL PASS (policy-engine fixes verified)' : fails + ' FAILURES'}`)
  process.exit(fails === 0 ? 0 : 1)
}
main().catch((e) => { console.error('ERR', e); process.exit(2) })
