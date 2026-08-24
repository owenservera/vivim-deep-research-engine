# OWNER.md — VIVIM Deep-Research Engine

**First agent taking full ownership:** Kilo (this session, 2026-08-24)  
**Project origin:** `C:\0-BlackBoxProject-0\ideation` (chaotic original workspace)  
**Formalized identity:** Portable multi-agent audit + fix framework  
**Code/repo reference:** `vivim-final` (TypeScript/Bun + Next.js 16 + Tauri V2 + Prisma 6)

---

## What I own (explicit)

1. **The framework architecture** — 4-layer model (`framework/`, `session/`, `project/`, `archive/`), documented in `DESIGN.md` and `docs/04-framework-design.md`.
2. **Evidence preservation** — Every original file from the chaotic workspace is preserved in `archive/original-ideation/` with a manifest (`archive/manifest.md`). Nothing from the original session is deleted.
3. **Portability contract** — `framework/` + `deploy/` can be copied to any repo, customized via `framework.json`, and run without referencing absolute `C:\...` paths.
4. **Customization protocol** — Documented in `docs/06-customization-guide.md`: how to override agent prompts, add hazard patterns, change budget rules, and register new repro harnesses.
5. **Audit output continuity** — `session/05-output.md` (and its rendered version `project/OUTPUT.md`) maintains the evidence chain from `AUDIT_OUTPUT-2026-08-24.md` (5 findings: dependency CVEs, no-op CI guards, route-sync tier divergence, Prisma bloat, safe-eval denylist). All 5 findings are preserved and linked.

---

## What I do NOT own (explicit disclaimers)

- **The source repo (`vivim-final`)** — I design the audit framework, not the application. Any fix to `vivim-final` requires a separate PR/review cycle, not this framework.
- **Human expert sign-off** — The framework mandates Phase 4 (human-in-the-loop) before any finding graduates to production. I am an agent; the audit output (`AUDIT_OUTPUT-...`) explicitly states: `STATUS: Pending human review. Not an approved work plan.`
- **Production load / chaos tests** — The framework flags blind spots (load, production blind spots) but does not claim to have run them. See `docs/04-framework-design.md` § "Blind spot findings."
- **Dependency updates** — The framework can propose `bun update` (Finding #1) but does not execute it automatically. Execution requires a blocking CI gate and human approval.

---

## Customization rules for future agents

If you take over after me:

- Read `DESIGN.md` first. Do not redesign the 4-layer model without updating `DESIGN.md`.
- Read `archive/manifest.md` before moving any file — it is the evidence chain.
- If you customize agent roles, update both `framework/core/agents/` (master) and `session/.opencode/agents/` (session instance). Never edit `.opencode/` without updating the master.
- If you add a new audit finding, create a new `session/05-output.md` section (do not overwrite the previous audit — preserve history in `archive/` or a dated file).
- If you run a budget cycle, append to `session/state/loop.json` and `project/state/loop.json`, and update `docs/05-usage-guide.md` with any new budget rules.

---

## Maintenance calendar (suggested, not enforced)

| Interval | Action | Evidence file to check |
|---|---|---|
| Every session start | Read `DESIGN.md` + `OWNER.md` | Confirm framework version matches archive |
| After any audit run | Update `archive/manifest.md` | Confirm all new artifacts are mapped |
| After any customization | Update `framework.json` + `docs/06-customization-guide.md` | Confirm override is documented |
| Before deploying to new repo | Run `deploy/install.sh` + `deploy/deploy.sh` | Confirm `framework.json` points to correct repo path |
| After any fix verified | Link `verified/*.md` → `repros/*.ts` → `session/05-output.md` | Confirm evidence chain is unbroken |

---

## Contact / escalation (simulated)

Since I am an agent, there is no human contact. The framework's designed escalation path is:

1. Agent detects issue → logs to `session/deadends.md` + `session/state/loop.json`
2. Agent produces `session/05-output.md` (audit output)
3. Human expert reviews `session/05-output.md` (mandated Phase 4)
4. If approved, fix is applied to `project/` (the repo under audit) via a separate PR
5. Framework updates (`framework/`, `docs/`) are maintained independently

If I am replaced by another agent, the next agent must read this file (`OWNER.md`) before making any structural change.
