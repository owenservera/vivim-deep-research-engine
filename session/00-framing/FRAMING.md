# Framing — Session: vivim-final Deep Research 2026-08-24

**Reference:** `archive/manifest.md` (evidence chain)  
**Audit reference:** `archive/original-ideation/AUDIT_OUTPUT-2026-08-24.md`  
**Design reference:** `DESIGN.md`  
**Ownership:** `OWNER.md`

---

## Question

Does the framework design (`DESIGN.md`, `framework.json`, `archive/manifest.md`) provide a portable, deployable, customizable, and well-documented system for multi-agent deep-research and repository audit?

Concretely:
- Can `framework/` + `deploy/` be copied to any repo without absolute path references?
- Does `archive/` preserve all original files with evidence chain intact?
- Does `session/` have all required artifacts (`deadends.md`, `candidates/`, `repros/`, `verified/`, `05-output.md`)?
- Does `docs/` fully document the framework and customization rules?

---

## Verification criterion

Manual review of framework files (not an automated test — this is the formalization session, not an audit of `vivim-final`). The verification is: every load-bearing claim in `DESIGN.md` must be traceable to a file in `archive/`, `session/`, `framework/`, or `docs/`.

---

## Scope boundaries

- Only the framework formalization (`DESIGN.md`, `framework/`, `archive/`, `docs/`, `deploy/`), not new audit findings for `vivim-final`.
- The audit findings (`archive/original-ideation/AUDIT_OUTPUT-2026-08-24.md`) are preserved but not re-validated in this session.

---

## Budget

Small: single session focused on framework organization and documentation. No subagent fan-out required.

---

## Known prior work (preserved from archive)

- `archive/original-ideation/02-general-runbook.md`: Multi-agent process phases (0–4 + 3.5 + 5).
- `archive/original-ideation/01-what-actually-happened.md`: Riemann zeta synthesis result; transferable patterns.
- `archive/original-ideation/project/AGENTS.md`: Agent roles, budget, loop status (`ALL 10 targets DONE`, budget `124/120`).
- `archive/original-ideation/project/FRAMING.md`: Capability resolution engine invariants (I1–I4).
- `archive/original-ideation/project/HAZARDS.md`: H1–H15 patterns.
- `archive/original-ideation/AUDIT_OUTPUT-2026-08-24.md`: 5 scored findings (dependency CVEs #1, CI no-op #2, route-sync divergence #3, Prisma bloat #4, safe-eval denylist #5), plus 5 blind spots and 12 ruled-out candidates.

---

## Codebase / how to run checks

- Framework verification: `bash deploy/deploy.sh` (or PowerShell `deploy/deploy.ps1`).
- Evidence chain check: `cat archive/manifest.md`.
- Customization check: edit `framework.json`, verify no absolute paths introduced.
