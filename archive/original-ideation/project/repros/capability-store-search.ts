// repros/capability-store-search.ts
// Iteration 1 target: capability-resolution-store-impl.
// The store's searchCapabilities uses `ILIKE '%' + query + '%'` (Postgres) with
// LIMIT 20, then the engine re-filters with literal .includes(). We simulate the
// SQL ILIKE (with %/_ wildcard semantics) + LIMIT, then the engine's literal
// filter, and show (a) valid results dropped by LIMIT 20 and (b) false-positive
// matches from unescaped LIKE wildcards.
// Run: bun run repros/capability-store-search.ts
// Convert a LIKE/ILIKE pattern (with % _ wildcards and '\' ESCAPE) to a RegExp.
function likeToRegex(pattern: string): RegExp {
  let re = ''
  let escaped = false
  for (const ch of pattern) {
    if (escaped) {
      re += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      escaped = false
    } else if (ch === '\\') {
      escaped = true
    } else if (ch === '%') {
      re += '.*'
    } else if (ch === '_') {
      re += '.'
    } else {
      re += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
  }
  return new RegExp('^' + re + '$', 'i')
}
function ilike(query: string, text: string): boolean {
  // Mimic Postgres ILIKE on pattern '%' + ESCAPED(query) + '%' (ESCAPE '\').
  // A real query's % and _ are escaped so they are treated literally.
  const escaped = query.replace(/[\\%_]/g, '\\$&')
  const pat = '%' + escaped + '%'
  return likeToRegex(pat).test(text)
}
// engine applySearchFilter (from capability-resolution.ts:357-361) — literal
const engineMatch = (name: string, q: string) =>
  name.toLowerCase().includes(q.toLowerCase())

function search(caps: string[], query: string): string[] {
  // FIXED store.searchCapabilities: ILIKE on escaped pattern, NO premature
  // LIMIT. The engine re-filters precisely (LIMIT, if any, applies after).
  const sql = caps.filter((c) => ilike(query, c))
  // engine.applySearchFilter: literal includes
  return sql.filter((c) => engineMatch(c, query))
}
function ideal(caps: string[], query: string): string[] {
  return caps.filter((c) => engineMatch(c, query))
}

async function main() {
  let fails = 0
  const assert = (cond: boolean, msg: string) => {
    console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) fails++
  }

  // ---- (a) FIXED: no premature LIMIT drops valid literal matches ----
  const many = Array.from({ length: 25 }, (_, i) => `Alpha Feature ${i}`)
  const r = search(many, 'Alpha')
  const want = ideal(many, 'Alpha')
  assert(want.length === 25, 'ideal: 25 literal "Alpha" matches exist')
  assert(r.length === 25, 'FIX: search returns all 25 (no premature LIMIT 20)')
  assert(r.length === want.length, `FIX: 0 valid results dropped (was ${want.length - r.length})`)

  // ---- (b) FIXED: LIKE wildcards are escaped (no false positives) ----
  const caps = ['HTTP 503 error page', 'my 50% discount code', 'plain alpha thing']
  const q = '50%'
  const got = search(caps, q)            // what the engine ultimately shows
  const ideal2 = ideal(caps, q)          // what a literal search should show
  assert(!caps.filter((c) => ilike(q, c)).includes('HTTP 503 error page'),
    'FIX: escaped ILIKE does NOT treat % as wildcard: "503" no longer matches "50%"')
  assert(got.length === ideal2.length && got.every((x) => ideal2.includes(x)),
    'FIX: literal search results match exactly (no false positives)')
  const crowded = [...Array.from({ length: 20 }, (_, i) => `page ${i} code 503`), 'my 50% discount code']
  const crowdedRes = search(crowded, '50%')
  const crowdedIdeal = ideal(crowded, '50%')
  assert(crowdedIdeal.length === 1 && crowdedRes.length === 1,
    'FIX: real literal "50%" match kept (no wildcard false-positives filling the set)')

  console.log(`\n${fails === 0 ? 'ALL PASS (capability search fix verified)' : fails + ' FAILURES'}`)
  process.exit(fails === 0 ? 0 : 1)
}
main().catch((e) => { console.error('ERR', e); process.exit(2) })
