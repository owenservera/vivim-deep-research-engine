// repros/incremental-contract-gap.ts
// Executed verification for candidate "incremental-contract-gap".
// Run from the research project dir:  bun run repros/incremental-contract-gap.ts
// Imports the REAL engine by absolute path so we don't pollute the target repo.
const ENGINE_PATH = 'C:/0-BlackBoxProject-0/vivim-final/src/engines/stream-parser.ts'
const STORE_PATH = 'C:/0-BlackBoxProject-0/vivim-final/src/storage/contracts/parser-store.ts'

const { StreamParserEngine } = await import(ENGINE_PATH)
const { } = await import(STORE_PATH)
type ParserStore = any
type ProviderParserRow = any

const claudeSSE = `exports.default = {
  name: 'claude-sse', version: 1, providerId: 'claude',
  parse(raw) {
    const blocks = [];
    for (const line of raw.split('\\n')) {
      const t = line.trim();
      if (!t.startsWith('data:')) continue;
      const json = t.slice(5).trim();
      if (!json || json === '[DONE]') continue;
      try { const o = JSON.parse(json); const d = o.delta?.text ?? o.text ?? '';
        if (d) blocks.push({ type: 'text', text: d }); } catch (e) {}
    }
    return blocks;
  },
  detectCompletion(raw) { return raw.includes('[DONE]'); },
  getConfidence(raw) { return raw.includes('data:') ? 0.95 : 0.1; }
};`

const alwaysComplete = `exports.default = {
  name: 'always-complete', version: 1, providerId: 'generic',
  parse(raw) { return [{ type: 'text', text: raw }]; },
  detectCompletion() { return true; },
  getConfidence() { return 0.4; }
};`

function row(id: string, providerId: string, code: string): ProviderParserRow {
  return { id, providerId, name: `${providerId}-p`, version: 1, logicType: 'inline',
    filePath: null, logicCode: code, hash: `h-${id}`, sampleBody: null,
    isActive: 1, fallbackParserId: null, createdAt: 0, updatedAt: 0 }
}
function mockStore(claude: string, generic: string): ParserStore {
  const c = row('c', 'claude', claude); const g = row('g', 'generic', generic)
  return { getParserByProviderAndVersion: async (p: string) => p === 'claude' ? c : p === 'generic' ? g : null,
    getParserById: async () => null, getActiveParser: async () => null, getParser: async () => null,
    upsertParser: async () => {}, listParsers: async () => [], getParserByFile: async () => null,
    getParserByHash: async () => null, getGenericParser: async () => g, getSystemFallbackParser: async () => null }
}

function partitions(s: string, n: number): string[] {
  if (s.length === 0) return ['']
  const cuts = new Set<number>([0, s.length])
  while (cuts.size < Math.min(n, s.length) + 1) cuts.add(1 + Math.floor(Math.random() * (s.length - 1)))
  const xs = [...cuts].sort((a, b) => a - b)
  return xs.slice(1).map((end, i) => s.slice(xs[i], end))
}
const concat = (cs: string[]) => cs.join('')
const textOf = (bs: any[]) => bs.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('')

async function main() {
  const sseEng = new StreamParserEngine(mockStore(claudeSSE, alwaysComplete))
  const genEng = new StreamParserEngine(mockStore(claudeSSE, alwaysComplete))
  const R_sse = ['data: {"delta":{"text":"Hello"}}', 'data: {"delta":{"text":" world"}}', 'data: [DONE]'].join('\n')

  let t1fail = 0
  const oracle = await sseEng.parse(R_sse, 'claude')
  for (let i = 0; i < 100; i++) {
    const r = await sseEng.parse(concat(partitions(R_sse, 6 + (i % 5))), 'claude')
    if (JSON.stringify(r.blocks) !== JSON.stringify(oracle.blocks)) t1fail++
  }
  console.log(`T1 determinism: ${t1fail === 0 ? 'PASS' : 'FAIL'} (${t1fail}/100)`)

  const full = await genEng.parse(R_sse, 'generic')
  const fullText = textOf(full.blocks)
  let hazard = 0; const examples: string[] = []
  let acc = ''
  for (const ch of partitions(R_sse, 7)) {
    acc += ch
    if (await genEng.detectCompletion(acc, 'generic')) {
      const t = textOf((await genEng.parse(acc, 'generic')).blocks)
      if (t !== fullText && t.length > 0) { hazard++; if (examples.length < 3) examples.push(`prefix=${JSON.stringify(acc.slice(-30))} -> ${JSON.stringify(t)} (final=${JSON.stringify(fullText)})`) }
    }
  }
  console.log(`T2 hazard (always-complete parser): ${hazard > 0 ? 'HAZARD PRESENT (' + hazard + ')' : 'NONE'}`)
  examples.forEach((e) => console.log('   e.g. ' + e))
}
main().then(() => process.exit(0)).catch((e) => { console.error('ERR', e); process.exit(1) })
