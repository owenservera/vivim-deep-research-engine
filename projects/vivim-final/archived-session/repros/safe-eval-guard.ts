// repros/safe-eval-guard.ts
// Fix-verification for safe-eval.ts. After the fix, assertTrustedExpressionSource
// must BLOCK dangerous globals (case-insensitively) and still ALLOW benign DSL
// expressions that reference no forbidden token.
// Run: bun run repros/safe-eval-guard.ts
import { assertTrustedExpressionSource } from 'C:/0-BlackBoxProject-0/vivim-final/src/engines/safe-eval.ts'

async function main() {
  let fails = 0
  const ok = (cond: boolean, msg: string) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) fails++ }

  // sanity: a genuinely-forbidden token is still blocked
  let threw = false
  try { assertTrustedExpressionSource('return process', 'test') } catch { threw = true }
  ok(threw, 'sanity: guard still blocks "process"')

  // after fix: dangerous globals must be BLOCKED (case-insensitive)
  const dangerousGlobals = [
    'WebSocket', 'EventSource', 'localStorage', 'sessionStorage', 'indexedDB',
    'navigator', 'location', 'Blob', 'TextEncoder', 'structuredClone',
    'MessageChannel', 'crypto', 'XMLSerializer', 'DOMParser', 'BroadcastChannel',
    'Function', 'eval', 'fetch', 'Proxy', 'Reflect', 'Worker',
  ]
  for (const g of dangerousGlobals) {
    let blocked = false
    try { assertTrustedExpressionSource(`return ${g}`, 'test') } catch { blocked = true }
    ok(blocked, `FIXED: "${g}" is now blocked by the guard`)
  }

  // case-insensitive: uppercase variants must also be blocked (H3 closed)
  let upperThrew = false
  try { assertTrustedExpressionSource('return PROCESS', 'test') } catch { upperThrew = true }
  ok(upperThrew, 'FIXED (H3): "PROCESS" (uppercase) now blocked')
  let funcUpper = false
  try { assertTrustedExpressionSource('return FUNCTION', 'test') } catch { funcUpper = true }
  ok(funcUpper, 'FIXED (H3): "FUNCTION" (uppercase) now blocked')

  // benign DSL expression with no forbidden token must still be allowed
  let benignThrew = false
  try { assertTrustedExpressionSource('return value * 2 + offset', 'test') } catch { benignThrew = true }
  ok(!benignThrew, 'regression: benign expression without forbidden tokens is allowed')

  console.log(`\n${fails === 0 ? 'ALL PASS (safe-eval fix verified)' : fails + ' FAILURES'}`)
  process.exit(fails === 0 ? 0 : 1)
}
main().catch((e) => { console.error('ERR', e); process.exit(2) })
