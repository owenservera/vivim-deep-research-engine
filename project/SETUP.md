# Setup / Configuration — Generic Workspace

**Framework:** `DESIGN.md`, `framework.json`, `framework/core/agents/`  
**Usage:** `docs/05-usage-guide.md`  
**Customization:** `docs/06-customization-guide.md`

---

## Setup steps for a NEW project (independent of past)

1. **Verify framework intact.** Confirm `archive/` exists (evidence chain), `framework/` has agent definitions, `docs/` has guides.

2. **Configure `framework.json`.** Change:
   - `target_repo_path`: path to new repo (e.g., `projects/my-new-repo/` or external directory).
   - `session_id`: new session identifier.
   - `budget`: adjust for new scope.

3. **Initialize `session/` for new audit.**
   - Write `session/00-framing/FRAMING.md` (use `framework/templates/FRAMING.md` as base).
   - Clear `session/deadends.md` (start fresh).
   - Ensure `session/02-candidates/`, `03-repros/`, `04-verified/` are empty.

4. **Run deploy script.** `bash deploy/deploy.sh` verifies portability and reports framework version.

5. **Run first audit cycle.** Use `/research` or manual phase sequence. Log failures to `session/deadends.md`. Write candidates to `session/02-candidates/`. Verify with harnesses in `session/03-repros/`. Write verified results to `session/04-verified/`. Produce `session/05-output.md` with `STATUS: Pending human review.`

6. **Archive completed audit (optional).** After audit finishes, copy `session/` artifacts to `projects/<repo-name>/archived-session/` and add reference to `archive/manifest.md`.

---

## Independence from `vivim-final`

- The previous `vivim-final` audit session is preserved at `projects/vivim-final/archived-session/`.
- `project/` no longer contains any `vivim-final` references (`FRAMING.md` is generic, `AGENTS.md` references framework only).
- `framework.json` points `target_repo_path` to `project/` (generic workspace), not to a specific repo path.
- `archive/` contains the original workspace (`01-` docs, zips, `.runtime`, audit output) but is read-only.
