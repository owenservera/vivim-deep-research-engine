"""repros/cip-indexer-incremental.py — TEMPLATE harness for T0 indexer invariants I1-I4.

This is a seeded template (not a real finding). Copy/adapt per candidate.
Run: python repros/cip-indexer-incremental.py  (from research-cip dir, PowerShell)

Invariants:
  I1 idempotence: sync twice with no changes -> dirty==0 second run
  I2 missed-change freeness: bytes-changed but mtime-held file is still dirtied (hash fallback)
  I3 deletion cascade: deleted file's rows gone from 6 tables
  I4 tier-aware chunking: .md -> doc, .py -> code with symbols

Fill in real cases or hand to generator/validator subagents to flesh out.
"""
import sys, os, tempfile, pathlib, time

CIP_LIB = "C:/0-BlackBoxProject-0/index/lib"
if CIP_LIB not in sys.path:
    sys.path.insert(0, CIP_LIB)

fails = 0
passes = 0

def assert_eq(cond, msg):
    global fails, passes
    if cond:
        passes += 1
        print(f"PASS  {msg}")
    else:
        fails += 1
        print(f"FAIL  {msg}")

def main():
    global fails, passes
    # Smoke-check that imports work (so the harness itself is not dead)
    try:
        from cipkg import store, indexer  # noqa: F401
        assert_eq(True, "imports cipkg.store + cipkg.indexer")
    except Exception as e:
        print(f"FAIL  import cipkg ({e})")
        fails += 1
        print(f"\n{passes} passed, {fails} failed")
        raise SystemExit(1)

    # --- I1/I2/I3/I4 skeleton using a temp isolated repo ---
    # The real harness would:
    #   with tempfile.TemporaryDirectory() as tmp:
    #       con = store.connect(tmp)  # creates tmp/.cip/index.db
    #       pathlib.Path(tmp, "hello.py").write_text("def foo(): pass\n")
    #       s1 = indexer.sync(root=tmp, do_embed=False)
    #       assert_eq(s1["dirty"] == 1, "I1 first sync dirties new file")
    #       s2 = indexer.sync(root=tmp, do_embed=False)
    #       assert_eq(s2["dirty"] == 0, "I1 second sync is idempotent")
    #   ... plus I2 (hold mtime, mutate bytes), I3 (unlink, verify SELECTs), I4 (write .md vs .py, check files.tier + symbols count)
    #
    # This template intentionally leaves those as a TODO for generators/validators
    # so the fleet has a runnable skeleton that at least proves wiring, not a vacuous PASS.
    print("TEMPLATE: I1-I4 skipped — extend this file with real temp-repo cases (see repros/README.md)")
    # To make the template pass CI while still being useful as scaffolding, count it as inconclusive, not a finding:
    print(f"\n{passes} passed, {fails} failed (template — not a verdict)")
    raise SystemExit(0 if fails == 0 else 1)

if __name__ == "__main__":
    main()
