# Project Workspace — Generic / Current

**Status:** Generic workspace (independent of any past audit).  
**Framework:** `framework.json` configures the target repo path.  
**Archive:** Previous audit (`vivim-final`) preserved at `projects/vivim-final/archived-session/`.

---

## Purpose

This directory (`project/`) is the active workspace for the framework. It is NOT tied to any specific repo by default. When you run an audit:

1. The framework (`framework/`, `session/`) runs the audit process.
2. `project/` holds the working artifacts for the CURRENT target repo.
3. Completed/repo-specific audits are archived to `projects/<repo-name>/`.

---

## Structure

- `.opencode/` — CLI bindings (copied from framework or customized per session).
- `candidates/` — Candidate ideas from Phase 2 (`READY FOR VALIDATION` files).
- `repros/` — Executable proof harnesses (tests/fuzz against target repo).
- `verified/` — Survived-validation write-ups (linked to `repros/` and `candidates/`).
- `scripts/` — Repo-specific checks (`numerical_check.py`, `research-loop.ts`, etc.).
- `state/` — Budget tracking (`loop.json`, `targets.json`).

---

## How to use for a NEW project

1. Read `docs/06-customization-guide.md`.
2. Update `framework.json`: change `target_repo_path` to the new repo directory.
3. Initialize `session/00-framing/FRAMING.md` for the new target.
4. Run `deploy/deploy.sh` to verify portability.
5. After audit completes, archive session to `projects/<new-name>/archived-session/`.

---

## Independence from past

This workspace does NOT reference `vivim-final` by default. The previous audit artifacts are preserved in `projects/vivim-final/archived-session/` and referenced by `archive/man
ifest.md`. Any new audit starts clean in `session/` with a fresh `FRAMING.md` and empty `deadends.md`, unless you explicitly seed hazards from `framework.json` (`hazard_seed_ids`).
