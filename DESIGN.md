# OWNERSHIP & FORMALIZATION PLAN — VIVIM Deep-Research Engine

**Agent owner:** Kilo (first agent taking full ownership)  
**Workspace:** `C:\0-BlackBoxProject-0\ideation`  
**Date:** 2026-08-24  
**Status:** START FRESH — complete redesign from current chaotic state

---

## What this actually is (honest version)

This is not a generic "project template." It is the **artifact layer** of a multi-agent deep-research and repository-audit framework used to:
- Scan a code repository (e.g., `vivim-final`) for critical defects
- Run adversarial subagent fleets (generator → extender → validator → synthesizer → blindspot)
- Deposit reproducible proof harnesses (`repros/`), candidate ideas (`candidates/`), verified fixes (`verified/`), dead-end logs (`deadends.md`)
- Produce human-reviewable audit outputs (`AUDIT_OUTPUT-*.md`)
- Manage an outer loop (`state/targets.json`, `scripts/research-loop.ts`, budget checkpoints)

The chaos in the current directory (`files/`, `files (1)/`, `files (2)/`, zips, duplicate docs, `.opencode/` versions in both `project/` and `research-cip/`) is a **real working session** that never got formalized.

---

## Design principles (load-bearing)

1. **No magic.** Every file must have a documented purpose and a documented consumer (another file, a script, a human, or a subagent prompt).
2. **Portability.** The entire framework must be deployable to any repo by copying one directory and changing one config file (`framework.json`).
3. **Customization is first-class.** Every role agent definition, every script, every verification harness must read from `framework.json` or `custom/` overrides — never hardcode paths like `C:\0-BlackBoxProject-0\vivim-final`.
4. **Evidence chain is unbroken.** Any claim (audit finding, fix proposal, verified result) must point to its evidence file by exact relative path.
5. **Fresh start does not mean discard.** We reorganize, not delete. Every file from the original workspace gets a deterministic new path.

---

## New architecture (4-layer model)

```
<project-root>/
├── framework/              # Portable engine (can be copied anywhere)
│   ├── core/                # Phase 0–4 process logic, agent role definitions
│   ├── scripts/             # Budget, loop, numerical checks (language-agnostic entry points)
│   ├── templates/           # FRAMING.md, AGENTS.md, .opencode agent stubs
│   └── framework.json       # Single customization point
│
├── session/                 # A single deep-research TARGET (e.g., capability-resolution)
│   ├── 00-framing/
│   ├── 01-deadends.md
│   ├── 02-candidates/
│   ├── 03-repros/
│   ├── 04-verified/
│   ├── 05-output.md
│   └── .opencode/
│
├── project/                 # The REPO under audit (cloned or symlinked)
│   ├── AGENTS.md            # Rendered from session + framework templates
│   ├── HAZARDS.md            # Cross-loop memory (hazard patterns H1–H15+)
│   ├── FIXES.md              # Confirmed fixes (links to verified/ files)
│   ├── INDEX.md              # Per-target outcome accumulator
│   ├── OUTPUT.md             # Human-facing audit report (rendered from verified/)
│   ├── state/
│   │   ├── loop.json         # Global budget + target queue
│   │   └── targets.json      # Priority-ordered target queue
│   └── .opencode/
│       ├── agents/          # Role definitions (generator, extender, validator, synthesizer, blindspot)
│       ├── command/         # /research, /research-loop, /keep-going, etc.
│       └── opencode.json    # CLI bindings
│
├── archive/                 # Original chaotic workspace preserved for reference
│   ├── original-ideation/
│   │   ├── files/
│   │   ├── files (1)/
│   │   ├── files (2)/
│   │   ├── 01-what-actually-happened.md ...
│   │   ├── zips/
│   │   └── .runtime/
│   └── manifest.md          # Every original file, its new path, and a hash/checksum
│
├── deploy/                  # Portable deployment bundle
│   ├── deploy.sh / deploy.ps1
│   ├── install.sh
│   ├── custom-overrides/      # User-specific agent prompts, budget rules
│   └── README.md
│
└── docs/                    # All documentation (replaces scattered .md files at root)
    ├── 01-what-actually-happened.md
    ├── 02-general-runbook.md
    ├── 03-claude-code-implementation.md
    ├── 04-framework-design.md       # This file + architecture diagrams
    ├── 05-usage-guide.md
    └── 06-customization-guide.md
```

---

## Step-by-step execution plan (what I will do, in order)

### Phase A — Lock and catalog (evidence preservation)
- [A1] Create `archive/original-ideation/` with exact copy of current workspace.
- [A2] Generate `archive/manifest.md`: original path → new path mapping, with file size + timestamp. This is the unbreakable evidence chain.
- [A3] Read every file in `project/`, `research-cip/`, `.runtime/`, `files/`, `specs/` (if non-empty) and tag it by content family (runbook / agent definition / audit output / repro / script / state).

### Phase B — Design documentation
- [B1] Write `docs/04-framework-design.md` (this file, expanded with layer diagrams, script interfaces, agent contracts).
- [B2] Write `docs/05-usage-guide.md` (how a user deploys to a new repo, runs one target, reads output).
- [B3] Write `docs/06-customization-guide.md` (how to override agent prompts, add new hazard patterns to HAZARDS.md, change budget rules).
- [B4] Write `OWNER.md` at root: who owns what, escalation path (human-in-the-loop at Phase 4), maintenance schedule.

### Phase C — Build `framework/` (portable core)
- [C1] Create `framework/core/` with phase logic (0–4), role definitions, evidence-chain rules.
- [C2] Rewrite `scripts/research-loop.ts` to read from `framework.json` and write to `session/state/`.
- [C3] Rewrite `scripts/check_budget.sh` and create `scripts/check_budget.ps1` (Windows portability — this workspace is on `C:\...`).
- [C4] Create `framework/templates/` with clean `FRAMING.md`, `AGENTS.md`, `.opencode/` stubs.
- [C5] Build `framework.json`: single customization point for repo path, budget, agent count ratios, hazard seed list.

### Phase D — Build `session/` (active working session)
- [D1] Copy `project/` contents into `session/` but normalize paths (remove absolute `C:\...` references, replace with relative `$(project)/` tokens).
- [D2] Move `.opencode/` from both `project/` and `research-cip/` into a single canonical `session/.opencode/` and document which version is authoritative.
- [D3] Normalize `candidates/`, `repros/`, `verified/` — ensure every file has a matching `README.md` or `MANIFEST.md` explaining its purpose.
- [D4] Move `project/AGENTS.md`, `FRAMING.md`, `HAZARDS.md`, `FIXES.md`, `INDEX.md`, `deadends.md`, `PROPOSALS.md`, `targets.md` to `session/` with cleaned headers.

### Phase E — Build `archive/` (preservation)
- [E1] Create exact mirror of current workspace under `archive/original-ideation/`.
- [E2] Create `archive/manifest.md` with checksums/checks and path mapping.
- [E3] Write `archive/README.md` explaining why the archive exists (evidence chain for audit/review).

### Phase F — Build `project/` (audited repo symlink/reference)
- [F1] Create `project/` as the canonical workspace for the actual repo under audit (`vivim-final`). Currently it contains `AGENTS.md`, `deadends.md`, etc. We will reorganize it to point to `session/` artifacts by relative link.
- [F2] Update `project/AGENTS.md` to reference `../session/` for current artifacts, not absolute paths.
- [F3] Keep `project/scripts/` for repo-specific checks (`numerical_check.py`, `research-loop.ts`) but normalize paths.

### Phase G — Deploy layer (`deploy/`)
- [G1] Create `deploy/deploy.sh` (bash) and `deploy/deploy.ps1` (PowerShell) that:
  1. Read `framework.json`
  2. Copy `framework/` to target directory
  3. Initialize `session/` from templates
  4. Set up `.opencode/` bindings
- [G2] Create `deploy/install.sh` that verifies dependencies (`bun`, `node`, or whatever the framework needs) and reports version gaps.
- [G3] Create `deploy/custom-overrides/` with example `agent-prompt-override.md`, `budget-override.json`.

### Phase H — Root documentation
- [H1] Rewrite root `README.md` (currently scattered across `01-...`, `02-...`, `03-...`, `project/README.md` if exists).
- [H2] Create `OWNER.md` with ownership rules, customization rules, and maintenance calendar.
- [H3] Create `MANIFEST.md` at root that maps every file in the new design to its purpose.

---

## Customization rules (assume future agent takes over after me)

If another agent (or I, after a fresh session) needs to customize this for a different repo:

1. Edit `framework.json` — change `target_repo_path`, `budget_tokens`, `agent_ratio`, `hazard_seed_ids`.
2. Add new agent definitions under `framework/core/agents/` (not `.opencode/agents/` — `.opencode/` is session-specific, `framework/core/agents/` is the master definition).
3. If you find a new hazard pattern (like H1 permissive `??`), append to `session/deadends.md` AND `session/state/hazards.json` (machine-readable), AND copy to `project/HAZARDS.md` (human-readable).
4. Any verification harness (`repros/*.ts`) must include a comment header: `// Evidence for: <candidate-file> / <audit-output-file>` — no orphan harnesses.
5. Every fix (`verified/*.md`) must link back to its audit reference (`AUDIT_OUTPUT-...` or `OUTPUT.md`) and its repro harness (`repros/*.ts`).

---

## Immediate next actions (I will execute these now)

I will start with Phase A (lock/catalog) and Phase B (design docs), then build `framework/` and `archive/` in parallel.
