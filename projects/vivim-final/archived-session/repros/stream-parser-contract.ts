// repros/stream-parser-contract.ts
// Regression test for the stream-parser completion-contract fix (P2).
// The footgun: with the old `detectCompletion: () => true` default, the natural
// per-chunk loop `if (detectCompletion(p)) parse(p)` fired on the FIRST chunk
// and committed partial content. Now detectCompletion is conservative (false)
// unless a real sentinel is seen OR the caller passes isFinal=true.
// Run: bun run repros/stream-parser-contract.ts
import { StreamParserEngine } from 'C:/0-BlackBoxProject-0/vivim-final/src/engines/stream-parser.ts'

async function main() {
  let fails = 0
  const ok = (cond: boolean, msg: string) => {
    console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`)
    if (!cond) fails++
  }

  // Fake store with no parsers -> engine falls back to the error module, whose
  // detectCompletion MUST now be conservative (false) on a prefix.
  const fakeStore: any = {
    getParserByProviderAndVersion: async () => null,
    getParserById: async () => null,
  }
  const eng = new StreamParserEngine(fakeStore)

  const partial = 'data: {"de' // a clearly-incomplete SSE prefix (the T2 hazard case)

  // FIX: a partial prefix is NOT reported complete by default.
  const d1 = await eng.detectCompletion(partial, 'claude')
  ok(d1 === false, 'FIX: detectCompletion(partial prefix) === false (no premature commit)')

  // isFinal forces completion (the only legitimate "commit now" path).
  const d2 = await eng.detectCompletion(partial, 'claude', true)
  ok(d2 === true, 'detectCompletion(partial, isFinal=true) === true (forced commit allowed)')

  // parse still works (whole-body) and does not require isFinal to function.
  const res: any = await eng.parse(partial, 'claude')
  ok(res && Array.isArray(res.blocks), 'parse() returns a ParseResult with blocks (unchanged whole-body behavior)')

  // The full (would-be-complete) body also must NOT auto-complete without isFinal,
  // because no real sentinel parser is loaded here.
  const full = 'data: {"delta":"hi"}\n\ndata: [DONE]\n'
  const d3 = await eng.detectCompletion(full, 'claude')
  ok(d3 === false, 'FIX: even a full-looking body is not "complete" without a real sentinel parser or isFinal')

  console.log(`\n${fails === 0 ? 'ALL PASS (stream-parser contract fix verified)' : fails + ' FAILURES'}`)
  process.exit(fails === 0 ? 0 : 1)
}
main().catch((e) => { console.error('ERR', e); process.exit(2) })
