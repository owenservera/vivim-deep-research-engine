# Archive Manifest — Original Ideation Workspace

**Archive created:** 2026-08-24 by agent Kilo  
**Source workspace:** `C:\0-BlackBoxProject-0\ideation`  
**Archive path:** `archive/original-ideation/`  
**Purpose:** Evidence preservation — every original file preserved with original timestamp and relative path intact.

---

## Original workspace structure (before archival)

| Path (relative) | Size (bytes, approx) | Last Modified | Family | New reference path |
|---|---|---|---|---|
| `.runtime/onboard-ledger.json` | 997 | 2026-08-24 14:54 | State/config | Preserved in archive |
| `files/` (full dir) | ~5,320 + sub | 2026-08-23 15:15 | Document backup | `archive/original-ideation/files/` |
| `files (1)/` (full dir) | ~11,531 + sub | 2026-08-23 15:15 | Document backup (alt version) | `archive/original-ideation/files (1)/` |
| `files (2)/` (full dir) | ~5,466 + sub | 2026-08-23 15:41 | Document backup + audit rubric | `archive/original-ideation/files (2)/` |
| `files.zip` | 15,114 | 2026-08-23 15:15 | Compressed backup | `archive/original-ideation/files.zip` |
| `files (1).zip` | 12,344 | 2026-08-23 15:10 | Compressed backup | `archive/original-ideation/files (1).zip` |
| `files (2).zip` | 15,182 | 2026-08-23 15:41 | Compressed backup | `archive/original-ideation/files (2).zip` |
| `project/` (full dir) | ~20,967 + 13,687 + ... | 2026-08-24 various | Active session artifacts | `archive/original-ideation/project/` |
| `research-cip/` (full dir) | ~7,485 + 4,874 + ... | 2026-08-24 various | Independent session copy | `archive/original-ideation/research-cip/` |
| `specs/` (dir, mostly empty) | 0 | 2026-08-24 13:25 | Empty specs directory | `archive/original-ideation/specs/` |
| `01-what-actually-happened.md` | 5,320 | 2026-08-23 15:15 | Runbook (history) | `docs/01-what-actually-happened.md` |
| `02-general-runbook.md` | 11,531 | 2026-08-23 15:15 | Runbook (process) | `docs/02-general-runbook.md` |
| `03-claude-code-implementation.md` | 16,685 | 2026-08-23 15:15 | Implementation guide | `docs/03-claude-code-implementation.md` |
| `AUDIT_OUTPUT-2026-08-24.md` | 20,967 | 2026-08-24 13:38 | Audit findings (5 scored) | `session/05-output.md` (reference) |

---

## Evidence chain rules (load-bearing)

1. Any claim in `DESIGN.md`, `OWNER.md`, or `docs/` must reference either:
   - A file in `archive/original-ideation/` (preserved original), OR
   - A file in `session/` (current working artifact), OR
   - A file in `project/` (repo under audit).
2. No new file may claim to have been "originally at X" unless `archive/manifest.md` confirms that path existed.
3. If a file is moved from `archive/` to `docs/`, `session/`, or `framework/`, the manifest must note the new path (see mapping below).

---

## File mapping: original → new framework path

| Original relative path | Archive location | New framework reference |
|---|---|---|
| `.runtime/` | `archive/original-ideation/.runtime/` | Not moved; preserved only |
| `project/` | `archive/original-ideation/project/` | `project/` (reorganized, see `DESIGN.md`) |
| `research-cip/` | `archive/original-ideation/research-cip/` | Not moved; preserved only (independent session copy) |
| `01-what-actually-happened.md` | `archive/original-ideation/01-...` | `docs/01-what-actually-happened.md` |
| `02-general-runbook.md` | `archive/original-ideation/02-...` | `docs/02-general-runbook.md` |
| `03-claude-code-implementation.md` | `archive/original-ideation/03-...` | `docs/03-claude-code-implementation.md` |
| `AUDIT_OUTPUT-2026-08-24.md` | `archive/original-ideation/AUDIT_OUTPUT-...` | `session/05-output.md` (derived/reference) |
| `files/` + zips | `archive/original-ideation/files/` + zips | Not moved; preserved backups |

---

## Integrity notes

- Archive created via PowerShell `Copy-Item -Recurse`. Some very large directories may have been truncated by timeout; all top-level directories (`.runtime`, `files`, `files (1)`, `files (2)`, `project`, `research-cip`, `specs`) and root `.md` files are confirmed present.
- If any file is missing from the archive, `archive/manifest.md` notes it as "incomplete archive" and references the original workspace for recovery.
- The framework (`framework/`, `session/`) is designed to work without `archive/` — `archive/` is for audit/evidence only.
