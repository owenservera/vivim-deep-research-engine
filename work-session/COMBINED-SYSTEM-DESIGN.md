# COMBINED SYSTEM DESIGN — Research Framework Around vivim-final

**Session:** vivim-final-deep-research-2026-08-24  
**Agent owner:** Kilo (first ownership, build mode)  
**Status:** WORKING — preserved in `C:\0-BlackBoxProject-0\ideation\work-session\`  
**CRITICAL DISCLOSURE:** This is NOT a sub-module inside vivim-final. It is a research framework that uses the ideation/deep-research methodology to identify improvement areas for vivim. See "What This Is / Is Not" below.

---

## What This System IS and IS NOT

### IS ✅
- A portable multi-agent audit + improvement-identification framework
- Uses the `ideation/` deep-research methodology (Phase 0→4 + outer loop) as its research protocol
- Produces: `candidates/` (improvement ideas), `repros/` (runnable proof harnesses), `verified/` (survived validation), `deadends.md` (tagged never-re-attempt log), audit outputs (`OUTPUT.md` or `AUDIT_OUTPUT-*.md`)
- Targets any repo via `framework.json` customization (single point of override)
- Enforces evidence chain rules (every claim → evidence file by exact relative path)
- Supports two context modes: `standard` (120K ceiling) and `max` (1M advertised / 600K real effective)

### IS NOT ❌
- A sub-module, engine, or component of vivim-final itself
- A replacement for vivim-final's runtime (Bun + Next.js + Tauri + Prisma)
- A modification to vivim-final source code (it audits from outside, via harnesses)
- A shipping feature of the application — it is the **artifact/research layer**

---

## Source Intel — What Was Read This Session

| Source File | Path | What It Contributes |
|---|---|---|
| Original ideation docs | `C:\0-BlackBoxProject-0\ideation\01-what-actually-happened.md` | Riemann zeta result pattern (synthesis + adversarial verification) |
| General runbook | `C:\0-BlackBoxProject-0\ideation\02-general-runbook.md` | 5-phase process + budget checkpoints + blind-spot hedge |
| Claude Code implementation | `C:\0-BlackBoxProject-0\ideation\03-claude-code-implementation.md` | Subagent definitions (`generator.md`, `validator.md`, etc.), `deadends.md` schema, `FRAMING.md` template |
| Project audit workspace | `C:\0-BlackBoxProject-0\ideation\project/` | Completed loop (10 targets, H1-H15 hazards, FIXES.md, INDEX.md) |
| Research-CIP workspace | `C:\0-BlackBoxProject-0\ideation\research-cip/` | External target framework (CIP indexer), 10 queued targets, Python harnesses |
| Vivim-final AGENTS.md | `C:\0-BlackBoxProject-0\vivim-final\AGENTS.md` | Project conventions, binary optimization, desktop devops, provider system, code conventions |
| Vivim-final design docs | `docs/` (architecture, modules, decisions) | 13-engine architecture, 11 critical invariants, capability taxonomy chain, sandbox execution |
| Deep-research skill | `.opencode/skill/devops-research/SKILL.md` | Research-first intelligence layer: phase classification, iterative convergence (max 6 iterations), brief/report/code-path/evidence tiers, A5/A6/A7 gates |
| Framework ownership | `C:\0-BlackBoxProject-0\ideation\OWNER.md` | Explicit ownership rules, customization protocol, evidence chain, maintenance calendar |
| Framework design doc | `C:\0-BlackBoxProject-0\ideation\DESIGN.md` | 4-layer architecture (`framework/` → `session/` → `project/` → `archive/`), portability contract |
| Audit output (archive) | `archive/AUDIT_OUTPUT-2026-08-24.md` | 5 findings (CVEs, no-op CI, route-sync tier divergence, Prisma bloat, denylist gap) — preserved |

---

## Combined System Design (What We Designed)

The combined framework merges:

1. **Ideation framework** (from `project/` + `research-cip/`) — multi-agent deep-research, evidence chain, 4-layer portability
2. **Vivim-final target** (`vivim-final` repo) — the repo under audit, referenced via `framework.json` (not embedded)
3. **Context budget management** (`standard` 120K / `max` 1M→600K) — controls fan-out size (6-8 vs 14-20 generators)
4. **Invariants from HAZARDS.md** (H1-H15) — translated into `FRAMING.md` seeds per target
5. **Devops-research SKILL.md** — provides the research protocol (brief/report/code-path/evidence tiers, A5/A6/A7 gates)

### Architecture (4-Layer Model — From DESIGN.md)

```
work-session/           # This session's workspace (NEW — our temp folder)
├── devops-research-SKILL.md  # Ported research skill (preserved)
├── COMBINED-SYSTEM-DESIGN.md # This file (our session intel, preserved)
└── (future artifacts during build mode: candidates/, repros/, verified/, output.md)

framework/              # Portable engine (not inside vivim — outside it)
├── core/  # Phase 0-4 logic, agent role definitions (master definitions)
├── scripts/  # Budget/check loops (normalized with framework.json tokens)
├── templates/  # FRAMING.md, AGENTS.md, .opencode/ stubs
└── framework.json  # Single customization point (repo path, budget, agent ratios, hazard seeds)

session/                 # Active working session (normalized from original chaos)
├── 00-framing/
├── 01-deadends.md
├── 02-candidates/
├── 03-repros/
├── 04-verified/
├── 05-output.md
└── .opencode/  # Canonical session instance (replaces duplicate project/ + research-cip/ versions)

project/                  # The actual repo under audit (vivim-final)
├── AGENTS.md         # Rendered from session + framework templates (normalized paths)
├── HAZARDS.md         # Cross-loop memory (translated from H1-H15 + new patterns)
├── FIXES.md           # Confirmed fixes (links to verified/ + repros/)
├── INDEX.md           # Per-target outcome accumulator
├── OUTPUT.md          # Human-facing audit (rendered from verified/)
├── state/
│   ├── loop.json     # Budget + target queue
│   └── targets.json  # Priority-ordered target queue
└── .opencode/
    ├── agents/      # Role definitions (generator, extender, validator, synthesizer, blindspot)
    ├── command/     # /research, /research-loop, /keep-going
    └── opencode.json  # CLI bindings

archive/                 # Original workspace preserved (evidence chain unbroken)
├── original-ideation/  # Exact mirror of chaotic workspace (before cleanup)
│   ├── files/, files (1)/, files (2)/
│   ├── .opencode/
│   ├── .runtime/
│   ├── 01-what-actually-happened.md ... 03-claude-code-implementation.md
│   └── zips/
└── manifest.md       # Every original file → new path mapping + checksum

deploy/                  # Portable deployment (copy anywhere, change framework.json)
├── deploy.sh / deploy.ps1
├── install.sh
├── custom-overrides/
└── README.md

docs/                    # All documentation (replaces scattered root .md files)
├── 01-what-actually-happened.md
├── 02-general-runbook.md
├── 03-claude-code-implementation.md
├── 04-framework-design.md
├── 05-usage-guide.md
└── 06-customization-guide.md
```

---

## Integration Points (How This Uses Vivim-Final Without Being Inside It)

### 1. Research Targeting (What We Research IN Vivim-Final)

The framework does NOT modify vivim-final source. It selects targets from the 13-engine architecture:

| Engine / Area | Why It Would Be Researched | Example Invariant (From Project FRAMING.md) |
|---|---|---|
| `CapabilityResolutionEngine` | Core tier-gating + existential + dependency logic | I1: Tier monotonicity; I2: Tier gating actually gates; I3: Existential correctness; I4: Search ⊂ resolve |
| `StreamParserEngine` | Parser DB execution + fallback chain + sandbox execution | Parser logic from DB only; no engine-level parser files |
| `ProviderRegistrar` | 16-provider onboarding + manifest wiring | Each provider declares `fallback`; 2-pass upsert |
| `safe-eval` / `safe-expression` | Code execution boundary (denylist gap → H9) | Allowlist required; `vm` mode selectable but weaker |
| `sandbox-runner` (quickjs) | WASM isolation (not isolated-vm) + audit shape exact | `SandboxAuditRow` exact shape (`id, handlerSlug, ok, error, permissions, ts`) |
| `conversation-manager` (40k LOC) | God file risk; capture patterns + response parsing | Provider-specific patterns; auth via cookie, not DB |
| Any of 185 `src/engines/*` | Thin coverage (~16% direct test); manual QA dependency | Store contracts (`contracts/*.ts`, never `impl/*.ts`) |

**How the framework connects:**  
- `framework.json` points `target_repo_path` to the repo (e.g., `C:\0-BlackBoxProject-0\vivim-final`)  
- `FRAMING.md` (generated from `session/00-framing/` or `framework/templates/`) states the exact vivim-final file (`src/engines/capability-resolution.ts`) and the verification harness command  
- `repros/` contains runnable TypeScript/Python harnesses that import the real engine and assert invariants  
- `verified/` contains SURVIVED VALIDATION write-ups (pending Phase 4 human review — NOT confirmed)

### 2. Evidence Chain (Every Finding Must Point Back)

Per `OWNER.md` rules and `DESIGN.md` principles:

- Every audit claim (`OUTPUT.md` or `AUDIT_OUTPUT-*.md`) links to `archive/manifest.md` entry  
- Every repro harness (`repros/*.ts`) links to `session/03-repros/` (or `repros/` in session template)  
- Every verified fix (`verified/*.md`) links to `repros/*.ts` + `session/05-output.md`  
- No orphan harnesses (`repros/*.ts`) — must include `// Evidence for: <candidate-file> / <audit-output-file>` header  
- No orphan findings (`verified/*.md`) — must link back to audit reference (`AUDIT_OUTPUT-2026-08-24.md` or `OUTPUT.md`)  

### 3. Context Budget Management (How We Run Without Overloading Context)

As documented in `CONTEXT-BUDGET.md` (read from `research-cip/`) and `AGENTS.md` (CIP / vivim rules):

| Mode | Ceiling (Advertised) | Real Safe | Fan-Out Size | Checkpoint (Mandatory) |
|---|---|---|---|---|
| `standard` | 120K | ~110K | 6-8 generators | 80% → 96K |
| `max` | 1M | **~600K** | 14-20 generators | 80% → 480K |

**Integration with combined design:**
- The framework reads `state/loop.json` or env `CIP_RESEARCH_CONTEXT` to determine active mode  
- Before spawning subagents, estimates token cost (`~750 tokens / 100 lines of TypeScript + 500 / candidate write + 300 / deadends entry`)  
- `scripts/check_budget.ps1` (PowerShell — this workspace is Windows-based at `C:\...`) runs both `spent/total` budget and `context used / ceiling`  
- `Read → Act → Persist → Drop` — never hold large code in context; complete bounded unit before accumulating more  

---

## What We Persisted In This Session (Intel Not Lost)

### In `work-session/` (our temp folder — created during build mode):
- `work-session/` — new directory (`New-Item -ItemType Directory`)
- `work-session/devops-research-SKILL.md` — ported from `.opencode/skill/devops-research/SKILL.md` (full 489-line skill file preserved)
- `work-session/COMBINED-SYSTEM-DESIGN.md` — this file (captures our session's design work, clarifies it's a framework around vivim, not a sub-module)

### Intent of the Design (From Our Conversation):
- **Clarified with user interjection** (during session): The framework is for identifying improvement areas in vivim — features, capabilities, algorithms — NOT a sub-module embedded in VIVIM.
- **Source of truth for design:** `DESIGN.md` (existing framework design), `OWNER.md` (ownership rules), `framework.json` (configuration), `CONTEXT-BUDGET.md` (budget rules), `AGENTS.md` (subagent roles)
- **Custom rules for future agent:** If another agent takes over, they must read `OWNER.md` + this design file before making structural changes. Customizations must update `framework.json` + `docs/06-customization-guide.md`. Any new audit finding requires `archive/manifest.md` update.

---

## Next Actions (If Continuing)

Given we're in build mode (`plan` → `build` transition happened), and we've created the temp workspace + preserved intel, these are natural continuations (pending user direction):

1. **If user wants to start a research target:** Set up `session/00-framing/` pointing to a specific vivim-final engine (e.g., `capability-resolution` with invariants I1-I4)
2. **If user wants to customize framework:** Modify `framework.json` (repo path, agent ratios, budget rules, hazard seeds) and document in `docs/06-customization-guide.md`
3. **If user wants to run first generator pass:** Execute generator subagents against a framed question (expect ~90% dead; log to `session/01-deadends.md` with `<family>` tag)
4. **If user wants to review evidence chain:** Confirm `archive/manifest.md` links to preserved original files (`archive/original-ideation/`) and `session/repros/` harnesses reference real engine paths

---

## References (All Read During This Session)

- `C:\0-BlackBoxProject-0\ideation\01-what-actually-happened.md` (92 lines)
- `C:\0-BlackBoxProject-0\ideation\02-general-runbook.md` (200 lines)
- `C:\0-BlackBoxProject-0\ideation\03-claude-code-implementation.md` (377 lines)
- `C:\0-BlackBoxProject-0\ideation\project/FRAMING.md` (invariant text I1-I4, target `capability-resolution`)
- `C:\0-BlackBoxProject-0\ideation\project/HAZARDS.md` (46 lines — H1-H15 patterns)
- `C:\0-BlackBoxProject-0\ideation\project/AGENTS.md` (loop status, 10 targets done)
- `C:\0-BlackBoxProject-0\ideation\project/INDEX.md` (55 lines — 55 outcomes, H1-H15 exercised)
- `C:\0-BlackBoxProject-0\ideation\research-cip/FRAMING.md` (CIP indexer target, context budget standard/max)
- `C:\0-BlackBoxProject-0\ideation\research-cip/AGENTS.md` (context budget rules, 120K canonical / 600K real max)
- `C:\0-BlackBoxProject-0\ideation\research-cip/CONTEXT-BUDGET.md` (70 lines — mode tables, fan-out scaling, checkpoint thresholds)
- `C:\0-BlackBoxProject-0\ideation\framework.json` (version `1.0.0-formalized`, session config, budget 124/120, agent ratios)
- `C:\0-BlackBoxProject-0\ideation\OWNER.md` (explicit ownership rules, customization protocol, evidence chain, maintenance calendar)
- `C:\0-BlackBoxProject-0\ideation\DESIGN.md` (4-layer architecture, portability contract, customization rules, execution phases A-H)
- `.opencode/skill/devops-research/SKILL.md` (489 lines — full research skill, A5/A6/A7 gates, 6-iteration convergence cap)
- `C:\0-BlackBoxProject-0\vivim-final\AGENTS.md` (56k lines — architecture, 11 critical invariants, 13 engines, provider system, code conventions)

---

*This file is preserved in `work-session/` as part of the research framework around vivim-final (not a sub-module inside it). If another agent takes over, the customization protocol (per `OWNER.md`) requires updating `framework.json` + `docs/06-customization-guide.md` for any structural change.*
