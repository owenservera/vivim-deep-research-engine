# Project / Session Workspace — vivim-final Deep Research

**Framework reference:** `DESIGN.md`, `OWNER.md`, `framework.json`  
**Archive (evidence):** `archive/manifest.md`  
**Audit reference:** `archive/original-ideation/AUDIT_OUTPUT-2026-08-24.md` (5 findings)  
**Usage guide:** `docs/05-usage-guide.md`  
**Customization guide:** `docs/06-customization-guide.md`

---

## What lives here

This directory (`project/`) contains the session artifacts for the `vivim-final` deep-research audit cycle. It is organized to work with the framework (`framework/`, `session/`, `archive/`).

Key files (preserved from original workspace, updated with framework references):
- `AGENTS.md` — agent role definitions, loop status (`ALL 10 targets DONE`, budget `124/120`).
- `HAZARDS.md` — hazard patterns H1–H15 (cross-loop memory).
- `FIXES.md` — confirmed fixes (links to verified harnesses).
- `INDEX.md` — per-target outcome accumulator.
- `FRAMING.md` — active problem framing (capability resolution engine invariants I1–I4).
- `OUTPUT.md` — rendered audit output (`archive/original-ideation/AUDIT_OUTPUT-2026-08-24.md` reference).
- `PROPOSALS.md`, `deadends.md`, `targets.md` — session management artifacts.
- `.opencode/` — CLI bindings (`opencode.json`, agent definitions, commands `/research`, `/keep-going`).
- `candidates/`, `repros/`, `verified/`, `scripts/`, `state/` — active session subdirectories.

---

## How to use this workspace with the framework

1. Read `docs/05-usage-guide.md`.
2. Verify `framework.json` points to this project (`target_repo_path`: `project/`).
3. If running a new audit cycle, update `session/00-framing/FRAMING.md` (not `project/FRAMING.md` — the framework separates session and project).
4. After any customization, read `docs/06-customization-guide.md` and `OWNER.md`.
5. Before deploying findings, confirm `STATUS: Pending human review.` is preserved in any output.
