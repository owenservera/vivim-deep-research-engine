# Usage Guide — VIVIM Deep-Research Engine

**Version:** 1.0.0-formalized  
**Owner reference:** `OWNER.md`  
**Archive reference:** `archive/manifest.md`  
**Audit reference:** `archive/original-ideation/AUDIT_OUTPUT-2026-08-24.md` (5 findings: dependency CVEs, CI no-op, route-sync tier divergence, Prisma bloat, safe-eval denylist)

---

## Quick start (5 minutes)

1. Verify workspace root: `pwd` should show the directory containing `framework.json`, `archive/`, `docs/`, `deploy/`.
2. Verify archive: `cat archive/manifest.md` (or `Get-Content archive/manifest.md` on Windows).
3. Verify framework config: `cat framework.json` (should point `target_repo_path` to your repo).
4. Read design: `cat docs/04-framework-design.md` or `DESIGN.md`.
5. Read ownership: `cat OWNER.md`.

---

## Running one audit target

The framework supports two modes:

**A. CLI mode (recommended, portable)**
- Configure `.opencode/` bindings in `session/.opencode/` (or `project/.opencode/`).
- Use the `/research` command (as defined in `AGENTS.md`) to start a target.
- The `scripts/research-loop.ts` script drives the outer loop: `bun run scripts/research-loop.ts next`.

**B. Manual mode (custom, no CLI)**
- Edit `session/00-framing/FRAMING.md` (copy from `framework/templates/FRAMING.md`) to define the exact question.
- Spawn agent roles manually (or use subagent calls) according to ratios in `framework.json` (`agent_roles`).
- Log failures to `session/deadends.md`.
- Write candidates to `session/02-candidates/`.
- Run repro harnesses in `session/03-repros/`.
- Verify and write `session/04-verified/`.
- Produce `session/05-output.md` (rendered to `project/OUTPUT.md`).

---

## Reading audit output

The canonical audit output is `session/05-output.md`. It should reference:
- `archive/manifest.md` for evidence chain.
- `archive/original-ideation/AUDIT_OUTPUT-*.md` for prior audit findings.
- `session/03-repros/` for executable proof harnesses.
- `session/04-verified/` for verified fixes.
- `project/HAZARDS.md` and `project/INDEX.md` for cross-loop memory.

**Important:** The framework does NOT claim any audit finding is approved for production merge. Every `session/05-output.md` must include the disclaimer: `STATUS: Pending human review. Not an approved work plan.` (see `archive/original-ideation/AUDIT_OUTPUT-2026-08-24.md` for the exact format).

---

## Budget tracking

- `project/state/loop.json` (and `session/state/loop.json`) track the budget.
- `scripts/check_budget.sh` (and `.ps1`) enforce checkpoints at 25/50/75/100%.
- The framework allows budget overruns (`budget.total_budget_percent` > 100) only with explicit documentation in `session/state/loop.json` and `OWNER.md`. See `DESIGN.md` § Budget.

---

## Deployment to a new repo

1. Copy `framework/` and `deploy/` to the new workspace.
2. Run `bash deploy/deploy.sh` (or `deploy/deploy.ps1`).
3. Edit `framework.json`: set `target_repo_path` to the new repo.
4. Initialize `session/` from templates: copy `framework/templates/FRAMING.md` to `session/00-framing/FRAMING.md`.
5. Update `.opencode/` bindings if using CLI mode.
6. Read `docs/06-customization-guide.md` before changing agent roles.

---

## What to read next

- `DESIGN.md` — architecture and evidence chain rules.
- `docs/04-framework-design.md` — expanded architecture diagrams (planned, to be written if design is updated).
- `docs/06-customization-guide.md` — customization protocol.
- `archive/manifest.md` — complete inventory of preserved original files.
