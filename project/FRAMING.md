# Framing Template — Generic Workspace

This is the active framing file for the CURRENT audit session in `project/`.

When starting a NEW project audit:
1. Replace this file with the new problem definition.
2. Update `framework.json` `target_repo_path` to point to the new repo.
3. Initialize `session/00-framing/FRAMING.md` with the new question.
4. Clear `session/deadends.md` (or keep it empty until failures occur).

Previous audit (vivim-final) preserved at: `projects/vivim-final/archived-session/FRAMING.md`.

---

## Template fields

**Question:** [Describe the exact problem / repo / engine under audit]

**Verification criterion:** [Machine-checkable test, property test, numerical check, or comparative analysis]

**Scope boundaries:** [What is explicitly out of scope]

**Budget:** [Estimated budget percentage / time]

**Known prior work:** [Reference preserved patterns from `archive/` or `projects/`]

**Codebase / how to run checks:** [Path to target code + how to execute verification harnesses]
