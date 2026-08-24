# repros/ — executed verification harnesses for research-cip

Every candidate that claims a defect (or clean) must have an **executed Python harness** in this directory that **imports the real CIP code** under `C:\0-BlackBoxProject-0\index` and prints machine-checkable PASS/FAIL.

## Pattern (MANDATORY — copy this)

All harnesses run from the **research-cip** workspace dir, never from inside `index`. Use a temp `.cip/index.db` so you don't mutate the real index.

```python
# repros/cip-indexer-incremental.py — example header
import sys, os, tempfile, pathlib
sys.path.insert(0, "C:/0-BlackBoxProject-0/index/lib")   # so `import cipkg.*` works

from cipkg import store, indexer
from cipkg.base import sha

def assert_eq(cond, msg):
    # simple TAP-style: print PASS/FAIL, count, exit non-zero on failure
    global fails
    print(f"{'PASS' if cond else 'FAIL'}  {msg}")
    if not cond:
        fails += 1

fails = 0

def main():
    global fails
    with tempfile.TemporaryDirectory() as tmp:
        # tmp is a fake repo root with an isolated .cip DB
        # Option A: initialize as a new repo
        #   os.makedirs(os.path.join(tmp, ".cip"))
        #   con = store.connect(tmp)
        # Option B: just test pure functions without DB: call indexer.resolve_import directly
        # Write synthetic files into tmp:
        #   pathlib.Path(tmp, "a.py").write_text("def foo(): pass\n", encoding="utf-8")
        # Call the target:
        #   stats = indexer.sync(root=tmp, do_embed=False)
        # Check invariants I1..In:
        #   assert_eq(stats["dirty"] == 1, "I1 first sync dirties new file")
        #   stats2 = indexer.sync(root=tmp, do_embed=False)
        #   assert_eq(stats2["dirty"] == 0, "I1 second sync is idempotent")
        pass
    print(f"\n{fails} failures")
    raise SystemExit(0 if fails == 0 else 1)

if __name__ == "__main__":
    main()
```

## Run

From `research-cip` dir (PowerShell):

```powershell
python repros/cip-indexer-incremental.py
# or with pytest if you prefer:
python -m pytest repros/cip-indexer-incremental.py -v
# bundled harness runner for all repros:
python -m pytest repros/ -v
```

## Rules

- **Never** edit `C:\0-BlackBoxProject-0\index` source from a `repros/` file. The repro is a *test*, not a fix.
- **Always** print `PASS` / `FAIL` per invariant. A repro that only prints prose is not machine-checkable.
- **Always** use an isolated temp `.cip` DB. Reading the real `.cip/index.db` is OK for negative checks; writing to it is not.
- One repro per candidate idea (or per target if bundling invariants). Name: `cip-<target-id>.py` or `cip-<invariant>.py`.

## Target-to-repro mapping for the 10 CIP targets

| target id | canonical repro | imports under test |
|---|---|---|
| cip-indexer-incremental | `repros/cip-indexer-incremental.py` | `indexer.sync`, `store.connect`, `store.vector_signature` |
| cip-store-vector-cache | `repros/cip-store-vector-cache.py` | `store.vector_matrix`, `store.bulk`, `lancedb_store`, `vecstore.knn` |
| cip-retrieve-hybrid | `repros/cip-retrieve-hybrid.py` | `retrieve.search`, `retrieve.lex_search`, `retrieve.vec_search`, `rerank.rerank` |
| cip-embed-daemon | `repros/cip-embed-daemon.py` | `embed.get_embedder`, `embed.service_port`, `daemon.daemon` |
| cip-audit-precision | `repros/cip-audit-precision.py` | `stack.rules.*`, `stack.audit.audit`, `stack.audit.findings` |
| cip-import-resolution | `repros/cip-import-resolution.py` | `indexer.resolve_import`, `tsconfig.TSResolver` |
| cip-gapfill-health | `repros/cip-gapfill-health.py` | `gapfill.score`, `gapfill.coverage`, `analysis.repo_health_report` |
| cip-watcher-sync | `repros/cip-watcher-sync.py` | `watcher`, `lock.WriteLock`, `indexer.sync` concurrency |
| cip-memory-consolidation | `repros/cip-memory-consolidation.py` | `memory.temporal_graph`, `memory.episodic`, `memory.consolidation` |
| cip-server-mcp | `repros/cip-server-mcp.py` | `server`, `web_bridge`, `cli.dispatch_command`, `base.repo_root` |

See `FRAMING.md` "Codebase / how to run checks" for the active target's exact command.

