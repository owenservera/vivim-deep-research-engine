// scripts/research-loop.ts
// Outer-loop driver for the multi-agent deep-research process.
// Manages a target queue + global budget + cross-loop hazard memory, and prints
// the exact plan for each iteration. Run with bun:
//   bun run scripts/research-loop.ts next            # plan next target + budget checkpoint
//   bun run scripts/research-loop.ts start <id>      # mark in_progress
//   bun run scripts/research-loop.ts done <id> "<outcome>"   # close + log to INDEX.md
//   bun run scripts/research-loop.ts block <id> "<reason>"   # give up, log deadend-worthy
//   bun run scripts/research-loop.ts hazard "<text>" [targetId]  # append to HAZARDS.md
//   bun run scripts/research-loop.ts status          # queue + budget
//   bun run scripts/research-loop.ts render          # write targets.md from state
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const TARGETS = join(ROOT, 'state', 'targets.json')
const LOOP = join(ROOT, 'state', 'loop.json')
const HAZARDS = join(ROOT, 'HAZARDS.md')
const INDEX = join(ROOT, 'INDEX.md')

function load<T>(p: string, fallback: T): T {
  return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as T) : fallback
}
const targets = load<{ targets: any[] }>(TARGETS, { targets: [] })
const loop = load<{ total: number; iteration: number }>(LOOP, { total: 120, iteration: 0 })
loop.iteration = loop.iteration ?? 0
loop.total = loop.total ?? 120

function save() {
  writeFileSync(TARGETS, JSON.stringify(targets, null, 2))
  writeFileSync(LOOP, JSON.stringify(loop, null, 2))
}
function spent(): number {
  return targets.targets.filter((t) => t.status === 'done').reduce((s, t) => s + (t.budget ?? 0), 0)
}
function pct(): number {
  return Math.floor((spent() / loop.total) * 100)
}

const cmd = process.argv[2]
const arg = process.argv[3]
const arg2 = process.argv[4]

if (cmd === 'status') {
  console.log(`Budget: ${spent()}/${loop.total} (${pct()}%)  iteration=${loop.iteration}`)
  for (const t of [...targets.targets].sort((a, b) => a.priority - b.priority)) {
    console.log(`  [${t.status.padEnd(10)}] ${t.id.padEnd(22)} pri=${t.priority} budget=${t.budget}`)
  }
  process.exit(0)
}

if (cmd === 'next') {
  if (pct() >= 100) { console.log('BUDGET 100% — STOP. Run /keep-going only if human directs.'); process.exit(0) }
  const next = [...targets.targets].sort((a, b) => a.priority - b.priority).find((t) => t.status === 'pending')
  if (!next) { console.log('QUEUE EMPTY — all targets resolved or blocked. Stop.'); process.exit(0) }
  const inv = (next.invariants ?? []).join(', ')
  console.log(`=== ITERATION PLAN: ${next.id} (pri ${next.priority}, budget ${next.budget}) ===`)
  console.log(`Target: ${next.path}`)
  console.log(`Rationale: ${next.rationale}`)
  console.log(`Seed invariants from HAZARDS: ${inv}`)
  console.log('')
  console.log('Run /research-loop for this target, OR execute inline:')
  console.log('  Phase 0  Frame -> FRAMING.md (question + "Codebase / how to run checks" = path above + seed invariants)')
  console.log('  Phase 1  generator fan-out (dozens; ~90% log deadends; execute, don\'t reason)')
  console.log('  Phase 2  extender deepens; validator WRITES+RUNS an executed check, deposits repros/, marks READY FOR VALIDATION')
  console.log('  Phase 3  verification gate: counterexample / re-derivation / edge-case / executed stress')
  console.log('  Phase 3.5 blindspot agent: what category of approach is the fleet missing?')
  console.log('  Phase 4  synthesizer -> verified/ (SURVIVED VALIDATION, not "confirmed")')
  console.log(`  Budget checkpoint @ ${pct()}%: run scripts/check_budget.sh ${spent()} ${loop.total}`)
  console.log('Then: bun run scripts/research-loop.ts done <id> "<outcome>"')
  process.exit(0)
}

if (cmd === 'start') {
  const t = targets.targets.find((x) => x.id === arg)
  if (!t) { console.error('no such target', arg); process.exit(1) }
  t.status = 'in_progress'
  save()
  console.log(`started ${arg}`)
  process.exit(0)
}

if (cmd === 'done' || cmd === 'block') {
  const t = targets.targets.find((x) => x.id === arg)
  if (!t) { console.error('no such target', arg); process.exit(1) }
  t.status = cmd === 'done' ? 'done' : 'blocked'
  t.outcome = arg2 ?? '(no outcome recorded)'
  loop.iteration++
  save()
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
  const section = `\n## [${stamp}] ${t.id} — ${t.status}\n**Path**: ${t.path}\n**Outcome**: ${t.outcome}\n**Hazards exercised**: ${(t.invariants ?? []).join(', ')}\n`
  appendFileSync(INDEX, section)
  console.log(`${cmd} ${arg}; iteration=${loop.iteration}; INDEX updated`)
  process.exit(0)
}

if (cmd === 'hazard') {
  const text = arg ?? ''
  if (!text) { console.error('usage: hazard "<text>" [targetId]'); process.exit(1) }
  const body = readFileSync(HAZARDS, 'utf8')
  const m = body.match(/- \*\*H(\d+)/g) ?? []
  const nextN = (m.length ? Math.max(...m.map((x) => parseInt(x.replace(/\D/g, ''), 10))) : 0) + 1
  const ref = arg2 ? ` (found in ${arg2})` : ''
  appendFileSync(HAZARDS, `- **H${nextN} — ${text}**${ref}\n`)
  console.log(`appended H${nextN}`)
  process.exit(0)
}

if (cmd === 'render') {
  const lines = ['# Research targets', '', '| id | path | priority | budget | status |', '|---|---|---|---|---|']
  for (const t of [...targets.targets].sort((a, b) => a.priority - b.priority)) {
    lines.push(`| ${t.id} | ${t.path} | ${t.priority} | ${t.budget} | ${t.status} |`)
  }
  writeFileSync(join(ROOT, 'targets.md'), lines.join('\n') + '\n')
  console.log('rendered targets.md')
  process.exit(0)
}

console.log('usage: next | start <id> | done <id> "<outcome>" | block <id> "<reason>" | hazard "<text>" [id] | status | render')
process.exit(1)
