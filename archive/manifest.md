# Archive Manifest — Original Ideation Workspace

**Archive created:** 2026-08-24 by agent Kilo  
**Source workspace:** `C:\0-BlackBoxProject-0\ideation`  
**Archive path:** `archive/original-ideation/`  
**Purpose:** Evidence preservation — every original file preserved with original timestamp and relative path intact.

## Integrity

The load-bearing archive integrity record is `archive/sha256sums.txt`. It is generated from the actual bytes of **every file** under `archive/original-ideation/` by `archive/generate-sha256-manifest.ts`:

```bash
node archive/generate-sha256-manifest.ts
```

Do not substitute Git blob SHA-1 values for these hashes. The generated file contains lowercase SHA-256 digests and normalized archive-relative paths. Regenerate it whenever the archive itself is intentionally changed.

## Original workspace structure (before archival)

| Path (relative) | Size (bytes, approx) | Last Modified | Family | New reference path | Hash (SHA-256) |
|---|---:|---|---|---|---|
| `.runtime/onboard-ledger.json` | 997 | 2026-08-24 14:54 | State/config | Preserved in archive | See `sha256sums.txt` |
| `files/` (full dir) | ~5,320 + sub | 2026-08-23 15:15 | Document backup | `archive/original-ideation/files/` | See `sha256sums.txt` |
| `files (1)/` (full dir) | ~11,531 + sub | 2026-08-23 15:15 | Document backup (alt version) | `archive/original-ideation/files (1)/` | See `sha256sums.txt` |
| `files (2)/` (full dir) | ~5,466 + sub | 2026-08-23 15:41 | Document backup + audit rubric | `archive/original-ideation/files (2)/` | See `sha256sums.txt` |
| `files.zip` | 15,114 | 2026-08-23 15:15 | Compressed backup | `archive/original-ideation/files.zip` | See `sha256sums.txt` |
| `files (1).zip` | 12,344 | 2026-08-23 15:10 | Compressed backup | `archive/original-ideation/files (1).zip` | See `sha256sums.txt` |
| `files (2).zip` | 15,182 | 2026-08-23 15:41 | Compressed backup | `archive/original-ideation/files (2).zip` | See `sha256sums.txt` |
| `project/` (full dir) | ~20,967 + ... | 2026-08-24 various | Active session artifacts | `archive/original-ideation/project/` | See `sha256sums.txt` |
| `research-cip/` (full dir) | ~7,485 + ... | 2026-08-24 various | Independent session copy | `archive/original-ideation/research-cip/` | See `sha256sums.txt` |
| `specs/` (dir, mostly empty) | 0 | 2026-08-24 13:25 | Empty specs directory | `archive/original-ideation/specs/` | N/A |
| `01-what-actually-happened.md` | 5,320 | 2026-08-23 15:15 | Runbook (history) | `docs/01-what-actually-happened.md` | See `sha256sums.txt` |
| `02-general-runbook.md` | 11,531 | 2026-08-23 15:15 | Runbook (process) | `docs/02-general-runbook.md` | See `sha256sums.txt` |
| `03-claude-code-implementation.md` | 16,685 | 2026-08-23 15:15 | Implementation guide | `docs/03-claude-code-implementation.md` | See `sha256sums.txt` |
| `AUDIT_OUTPUT-2026-08-24.md` | 20,967 | 2026-08-24 13:38 | Audit findings (5 scored) | `session/05-output.md` (reference) | See `sha256sums.txt` |

## Evidence chain rules (load-bearing)

1. Any claim in `DESIGN.md`, `OWNER.md`, or `docs/` must reference either an archived original, a current session artifact, or the audited project.
2. No new file may claim to have been "originally at X" unless this manifest confirms that path existed.
3. If a file is moved from `archive/` to `docs/`, `session/`, or `framework/`, the manifest must note the new path.
4. Archived evidence is byte-integrity protected by the SHA-256 records in `sha256sums.txt`.

## File mapping: original → new framework path

| Original relative path | Archive location | New framework reference |
|---|---|---|
| `.runtime/` | `archive/original-ideation/.runtime/` | Not moved; preserved only |
| `project/` | `archive/original-ideation/project/` | `project/` (reorganized, see `DESIGN.md`) |
| `research-cip/` | `archive/original-ideation/research-cip/` | Not moved; preserved only |
| `01-what-actually-happened.md` | `archive/original-ideation/01-...` | `docs/01-what-actually-happened.md` |
| `02-general-runbook.md` | `archive/original-ideation/02-...` | `docs/02-general-runbook.md` |
| `03-claude-code-implementation.md` | `archive/original-ideation/03-...` | `docs/03-claude-code-implementation.md` |
| `AUDIT_OUTPUT-2026-08-24.md` | `archive/original-ideation/AUDIT_OUTPUT-...` | `session/05-output.md` (derived/reference) |
| `files/` + zips | `archive/original-ideation/files/` + zips | Not moved; preserved backups |

## Archive notes

The archive was created via PowerShell `Copy-Item -Recurse`; some very large directories may have been truncated by timeout. The manifest records that limitation rather than pretending the archive is complete. The framework is designed to work without the archive; the archive exists for audit/evidence preservation.
