# AGENTS.md — Generic Workspace Reference

**Status:** This workspace is configured via `framework.json`.  
**Previous session:** `projects/vivim-final/archived-session/` (independent).  
**Current session:** `session/` (initialized but empty until new audit starts).

---

## Running a new audit cycle

1. Configure `framework.json` (`target_repo_path` points to new repo).
2. Create `session/00-framing/FRAMING.md` with the new question.
3. Use `/research` command (from `.opencode/`) to start Phase 0.
4. Follow phase sequence: framing → exploration → fan-out → verification → blindspot → human review.

---

## Agent roles (from `framework/core/agents/`)

See `framework/core/agents/` for master definitions:
- `generator.md` (new ideas, ~20%)
- `extender.md` (push partial ideas, ~20%)
- `validator.md` (adversarial attack, ~20%)
- `literature.md` (prior art, ~15%)
- `synthesizer.md` (verified write-ups, ~5%)
- `blindspot.md` (systematic gap check, ~5%)

---

## Independence from past

This workspace does NOT load any artifacts from `projects/vivim-final/archived-session/` by default. The framework reads only from:
- `framework/` (engine)
- `framework.json` (configuration)
- `session/` (current working session — initialized empty for new audits)
- `archive/` (evidence preservation — read-only)

To reference a past audit (e.g., to reuse hazard patterns), read `archive/manifest.md` and copy relevant patterns to `session/deadends.md` or `project/HAZARDS.md` as needed.
