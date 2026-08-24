// repros/capability-store-search-real.ts
// Real-code verification for the capability-resolution-store-impl search fix:
//   (1) the LIKE pattern must ESCAPE % and _ metacharacters (query "50%" must
//       not treat `%` as a wildcard), and
//   (2) the SQL must NOT apply a premature LIMIT 20 before the engine's precise
//       filter runs.
// We instantiate the REAL CapabilityResolutionStoreImpl with a fake Prisma that
// captures the SQL + params handed to $queryRawUnsafe. No DB required.
import { CapabilityResolutionStoreImpl } from 'C:/0-BlackBoxProject-0/vivim-final/src/storage/impl/capability-resolution-store-impl.ts'

async function main() {
  let fails = 0
  const ok = (cond: boolean, msg: string) => {
    console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`)
    if (!cond) fails++
  }

  let capturedSql = ''
  let capturedParams: unknown[] = []
  const fakePrisma: any = {
    $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
      capturedSql = sql
      capturedParams = params
      return [] as unknown[]
    },
  }

  const store = new CapabilityResolutionStoreImpl(fakePrisma)

  // (1) escape check
  await store.searchCapabilities('p1', 'free', '50%')
  const pattern = capturedParams[2] as string
  ok(pattern === '%50\\%%', `FIX: pattern for query "50%" is escaped -> ${pattern} (was %50%%)`)
  ok(!capturedSql.includes('LIMIT 20'), 'FIX: SQL no longer contains premature LIMIT 20')
  ok(capturedSql.toUpperCase().includes('LIMIT') === false, 'FIX: no LIMIT applied before the precise filter')

  // (2) an underscore query must also be escaped
  await store.searchCapabilities('p1', 'free', 'a_b')
  const pattern2 = capturedParams[2] as string
  ok(pattern2 === '%a\\_b%', `FIX: underscore escaped -> ${pattern2}`)

  console.log(`\n${fails === 0 ? 'ALL PASS (capability search fix verified)' : fails + ' FAILURES'}`)
  process.exit(fails === 0 ? 0 : 1)
}
main().catch((e) => { console.error('ERR', e); process.exit(2) })
