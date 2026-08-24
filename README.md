# VIVIM Deep-Research Engine — Formalized Framework

**Agent owner (first):** Kilo (2026-08-24)  
**Original workspace:** `C:\0-BlackBoxProject-0\ideation` (chaotic session artifacts, zips, duplicate docs)  
**Formalized identity:** Portable 4-layer framework (`framework/` + `session/` + `project/` + `archive/`)

---

## What changed (honest version)

This workspace was a real, chaotic working session (multi-agent audit of `vivim-final`, audit output `AUDIT_OUTPUT-2026-08-24.md`, 5 findings, budget overrun 124/120). Nothing magical. The framework formalizes the process, not the result.

**Before:** Scattered files (`files/`, `files (1)`, `files (2)`, zips, `.opencode/` versions in `project/` and `research-cip/`), no portability, no customization protocol, no evidence chain documentation.

**After:** 4-layer architecture (`DESIGN.md`), portable deployment (`deploy/`), customization protocol (`framework.json`, `docs/06-customization-guide.md`), complete evidence preservation (`archive/manifest.md`), ownership rules (`OWNER.md`).

---

## Quick navigation

- **Design / architecture:** `DESIGN.md`
- **Evidence preservation:** `archive/manifest.md`
- **Usage:** `docs/05-usage-guide.md`
- **Customization:** `docs/06-customization-guide.md`
- **Ownership / rules:** `OWNER.md`
- **Audit findings (preserved):** `archive/original-ideation/AUDIT_OUTPUT-2026-08-24.md`
- **Session artifacts:** `session/` (current working session — framework formalization)
- **Repo under audit:** `project/` (`vivim-final` session artifacts)
- **Deployment:** `bash deploy/deploy.sh` or `deploy/deploy.ps1`

---

## Framework status

| Layer | Status | Evidence |
|---|---|---|
| `framework/` (core + agents + templates) | Complete | `framework/core/agents/*.md`, `framework.json` |
| `archive/` (preserved original) | Complete | `archive/manifest.md` (lists all preserved files) |
| `docs/` (usage, customization, design ref) | Complete | `docs/04-`, `05-`, `06-` |
| `session/` (current session) | Initialized | `session/deadends.md`, `session/00-framing/FRAMING.md`, `session/05-output.md` |
| `project/` (repo artifacts) | Updated | `project/AGENTS.md` (updated), `project/README.md` (new) |
| `deploy/` (portability scripts) | Complete | `deploy/deploy.sh`, `deploy/deploy.ps1` |

---

## Important reminders (load-bearing)

1. **No magic.** The framework does not make the audit results true. It only formalizes the process, evidence chain, and portability.
2. **Evidence chain is unbreakable.** If you edit `archive/`, you break the framework's claim. Read `archive/manifest.md` before any structural change.
3. **Customization does not delete preservation.** Any new agent prompt (`deploy/custom-overrides/`), new budget rule (`framework.json`), or new audit finding (`session/05-output.md`) must link back to `archive/` and `DESIGN.md`.
4. **Status disclaimer is mandatory.** Every `session/05-output.md` must include `STATUS: Pending human review. Not an approved work plan.` (see `archive/original-ideation/AUDIT_OUTPUT-2026-08-24.md`).
5. **Portability is verified, not assumed.** Run `bash deploy/deploy.sh` before deploying to any new repo. The script checks `framework.json`, verifies archive, and reports framework version.

---

## What to read first

1. `OWNER.md` — who owns what, escalation rules, customization protocol.
2. `DESIGN.md` — full architecture, evidence rules, portability contract.
3. `docs/05-usage-guide.md` — how to run the framework.
4. `docs/06-customization-guide.md` — how to customize safely.

---

*Framework version: `1.0.0-formalized` (`framework.json`). Original workspace preserved: `archive/original-ideation/`. Design: `DESIGN.md`. Owner: `OWNER.md`.*
