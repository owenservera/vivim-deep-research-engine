# Framing

> This file is a *template*. For each new target, replace the sections below but
> keep the **Codebase / how to run checks** field — generators and validators must read that code and RUN checks against it.
> The body below is the active problem for this session (priority 0).

## Question

CIP's incremental indexer (`C:\0-BlackBoxProject-0\index\lib\cipkg\indexer.py:sync`) promises content-hash idempotence and mtime-fast-path correctness plus scoped edge rebuild.

Does `sync` satisfy its core correctness invariants, and where does it silently break? Concretely, for any repo state R and second `sync` call S with no disk changes:

- **(I1) Idempotence**: `sync(R)` then `sync(R)` with zero file changes yields `stats.dirty == 0`, `stats.deleted == 0`, and `files.hash` unchanged for every file.
- **(I2) Missed-change freeness**: a file whose bytes changed but whose `mtime` was artificially held constant is still detected (hash fallback), so `dirty` includes it and its symbols/chunks are refreshed.
- **(I3) Deletion cascade completeness**: deleting a file from disk then `sync` removes its rows from `files`, `symbols`, `chunks`, `vectors`, `edges(file_imports/symbol_calls)` — no orphan rows remain.
- **(I4) Tier-aware chunking correctness**: a `.md` file is tier `doc` with markdown-chunked chunks, a `.py` file is tier `code` with AST-aware chunks + symbol edges, a `prisma/schema.prisma` config file is not mis-tiered as `code` (no spurious symbols).

## Verification criterion

EXECUTED Python harness against the real `indexer` + `store` over a **temp repo with ephemeral `.cip/index.db`** (never the real CIP DB — use `tempfile.TemporaryDirectory` + `store.connect(tmp_root)` + synthetic files). Each invariant I1-I4 is a machine-checked assertion over a crafted file corpus. A finding = an invariant that FAILS, with the exact file + observed vs expected `stats`/`SELECT` result. Re-run after any fix.

## Scope boundaries

- Only `indexer.py` sync path: scan → hash/mtime dirty detection → `_bulk_write` → `link_imports`/`resolve_symbol_edges`/`build_tested_by` → `embed_pending` (embed phase may be skipped with `do_embed=False` for speed, but the invariants above must hold regardless).
- Not: embedding model correctness, reranking quality, or UI/dashboard.
- We test the indexer logic, not production data scale — but DO probe Windows spawn safety (ProcessPoolExecutor) and `DEFAULT_EXCLUDES` vs repo config interaction.

## Budget

Priority 0 of 10-target loop. Budget 14 (of global 120). One generator per invariant, 1 validator pass, one executed harness.

## Context budget (active mode)

- **Mode**: `standard` = 120K hard ceiling (default, follows CIP canonical). `max` = 1M advertised / 600K real (Muse Spark maximize). Read `state/loop.json:context_mode` or env `CIP_RESEARCH_CONTEXT`.
- Active for this target: **`max` (1M / 600K real)** — enabled via `pwsh scripts/set-context-budget.ps1 max` (revert with `standard`). MAX fans out 14-20 generators vs 6-8 in standard.
- Mandatory checkpoint at 80% of active ceiling (96K standard / 480K max) — see `CONTEXT-BUDGET.md`.

## Known prior work (fill in as literature agents find things)

- Scan uses `iter_files_smart(root,cfg)` with `max_file_size`, `exclude_patterns`, `DEFAULT_EXCLUDES` + `BACKUP_DIR_PREFIXES`; `tier` derived there.
- Dirty detection: `mtime` fast path first (`st.mtime`), then content `sha()` fallback; `known = SELECT path,hash,mtime FROM files`.
- Writes are batched via `_bulk_write` + `bulk_delete_paths`; `remove_file` cascades 6 tables.
- Edge linking has two phases: `link_imports` (file_imports → edges imports) then `resolve_symbol_edges` (symbols.body → edges calls/references scoped by `imports_by_file`), then `build_tested_by`.
- Previous loop hazards seeded: H1 permissive `??`/default fail-open, H3 case sensitivity, H5 paired-read divergence, H8 truncation-before-filter, H11 silent no-op on empty, H14 missing-data defaults to trusted. CIP analogs: `DEFAULT_CONFIG` permissive defaults, Windows case-insensitive paths vs SQLite case-sensitive `LIKE`, paired `sync` vs `retrieve.search` divergence.
- Context ceiling: `standard` 120K (default) vs `max` 1M/600K real — see `CONTEXT-BUDGET.md`. Harness must persist to `repros/` + `candidates/`, not hold whole index in context, at either ceiling.

## Invariants to test (seeded from HAZARDS.md)

H1, H3, H5, H8, H11 — see HAZARDS.md for pattern text.

## Codebase / how to run checks

- Target: `C:\0-BlackBoxProject-0\index\lib\cipkg\indexer.py` + `C:\0-BlackBoxProject-0\index\lib\cipkg\store.py` + `C:\0-BlackBoxProject-0\index\lib\cipkg\base.py`
- Run a check from this workspace (PowerShell):
  ```powershell
  python repros/cip-indexer-incremental.py
  # or
  python -m pytest repros/cip-indexer-incremental.py -v
  ```
  The harness must import via absolute path or `sys.path.insert(0, "C:/0-BlackBoxProject-0/index/lib")` and use a temp `.cip/` (see `repros/README.md`).

