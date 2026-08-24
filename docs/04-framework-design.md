# Framework Design Reference

**This file is a reference to `DESIGN.md`.** The design is fully documented there. This file only highlights the most critical design decisions for quick lookup.

---

## 4-Layer Architecture

```
framework/ (portable engine) → session/ (single target) → project/ (repo under audit) → archive/ (evidence)
```

- `framework/`: Never edited during an audit session. Only customized via `framework.json` or master agent definitions.
- `session/`: Reset/recreated for each new target. Preserves previous targets via cross-loop memory (`project/HAZARDS.md`, `project/INDEX.md`, `project/deadends.md`).
- `project/`: Points to the repo under audit (`vivim-final`). Contains session-rendered artifacts (`AGENTS.md`, `OUTPUT.md`).
- `archive/`: Immutable. Evidence chain. Never edited after creation.

---

## Load-Bearing Evidence Rules

From `DESIGN.md`:

1. Every claim links to `archive/manifest.md` entry or `session/` artifact.
2. Every repro harness (`repros/*.ts`) links to candidate (`candidates/*.md`) and audit output (`05-output.md`).
3. Every verified fix (`verified/*.md`) links to harness + output.
4. No absolute paths in portable layers.
5. `archive/` is never edited; customization does not modify archive.

---

## Agent Contract (minimum viable set)

From `framework/core/agents/`:

- Generator: 1 proposal + verification criterion.
- Extender: Fresh eyes on generator's partial idea.
- Validator: Active attack (not polite review) + proof in `repros/`.
- Synthesizer: Internal consistency check + evidence links.
- Blindspot: Concrete different angle + reference to dead-ends.

---

## Portability Contract

From `DESIGN.md` and `framework.json`:

- `framework/` + `deploy/` can be copied to any directory and work without absolute paths.
- `framework.json` is the single customization point for repo path, budget, agent ratios, hazard seeds.
- `deploy/deploy.sh` and `deploy/deploy.ps1` provide cross-platform initialization.

---

## Audit Continuity Reference

The audit output for this workspace is preserved at:

- Original: `archive/original-ideation/AUDIT_OUTPUT-2026-08-24.md`
- Framework reference: `DESIGN.md` (design decisions for formalization)
- Session output reference: `session/05-output.md`
- Evidence manifest: `archive/manifest.md`
- Ownership rules: `OWNER.md`
