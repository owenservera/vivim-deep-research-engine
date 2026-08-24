# Customization Guide — VIVIM Deep-Research Engine

**Purpose:** Define how to customize the framework for any repo without breaking the evidence chain or portability contract.

---

## What can be customized (explicit list)

| Component | Customization method | Evidence impact |
|---|---|---|
| Agent role ratios (`generator`, `extender`, etc.) | Edit `framework.json` → `agent_roles` | None — ratios are framework-level |
| Agent role definitions (`master_path`) | Edit `framework/core/agents/*.md` (master) and `session/.opencode/agents/*.md` (session) | Must document any change in `DESIGN.md` or `OWNER.md` |
| Budget rules (`total_budget_percent`, `checkpoints`) | Edit `framework.json` → `budget` | Must append to `session/state/loop.json` and `project/state/loop.json` |
| Hazard seed list (`hazard_seed_ids`) | Edit `framework.json` → `hazard_seed_ids` and `project/HAZARDS.md` | Must append pattern to `session/deadends.md` (with `<family>` tag) |
| Repo path (`target_repo_path`) | Edit `framework.json` → `target_repo_path` | Must update `archive/manifest.md` if archive path changes |
| Verification harness format (`repros/*.ts`) | Add new `.ts` under `session/03-repros/` with header: `// Evidence for: <candidate> / <output>` | Must link in `session/05-output.md` |
| Framing template (`FRAMING.md`) | Copy from `framework/templates/FRAMING.md` to `session/00-framing/FRAMING.md` | None — session-local |
| Audit output format (`OUTPUT.md`) | Use `framework/templates/OUTPUT.md` as base; customize `session/05-output.md` | Must preserve `STATUS: Pending human review.` disclaimer |

---

## What CANNOT be customized (load-bearing constraints)

1. No absolute paths (`C:\...`, `/home/user/...`) in `framework/core/`, `framework/scripts/`, `deploy/`.
2. No deletion of `archive/` files — `archive/` is the evidence chain. If you delete or modify `archive/manifest.md`, the framework's audit claim is broken.
3. No removal of `session/deadends.md` or `session/state/loop.json` — these are load-bearing for cross-loop memory.
4. No customization of agent roles without updating both `framework/core/agents/` (master) and `session/.opencode/agents/` (session instance).
5. Every new audit finding (`session/05-output.md`) must include the `STATUS: Pending human review.` disclaimer and link to `archive/manifest.md`.

---

## Customization protocol (step-by-step)

1. Read `OWNER.md` → confirm you understand ownership rules.
2. Read `DESIGN.md` § Customization rules.
3. Make the change in `framework.json` or the appropriate master/session file.
4. Document the change in `docs/` (`05-usage-guide.md` or `06-customization-guide.md`) and `OWNER.md` (if structural).
5. Update `archive/manifest.md` if any file paths or evidence links changed.
6. Test portability: run `bash deploy/deploy.sh` (or PowerShell equivalent) in a new temporary directory.

---

## Example customization: adding a new hazard pattern

**Scenario:** During a new audit, you find a new defect pattern similar to H1 (`??` permissive), but for numeric defaults.

**Steps:**

1. Add the pattern to `project/HAZARDS.md` with a new ID (e.g., `H16`).
2. Append `H16` to `framework.json` → `hazard_seed_ids`.
3. Log any dead-end related to `H16` in `session/deadends.md` with `<family> H16 numeric-default-failopen`.
4. Create or reference a repro harness in `session/03-repros/` and link it in `session/05-output.md`.
5. Document the new pattern in `docs/` (add a note to `05-usage-guide.md` or create a new section).

---

## Example customization: overriding agent prompts

**Scenario:** You want the `generator` agent to focus on security vulnerabilities rather than capability tier logic.

**Steps:**

1. Create `deploy/custom-overrides/agent-prompt-override.md` with the new prompt focus.
2. Update `session/.opencode/agents/generator.md` to reference the override (or embed it directly, with a comment pointing to the override file).
3. Document the override in `framework.json` (optional custom field) and `docs/`.
4. Ensure the override does not remove the evidence chain requirements (counterexample search, independent re-derivation, prior-art check).
