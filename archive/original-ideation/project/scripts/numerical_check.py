#!/usr/bin/env python3
"""numerical_check.py — domain-specific verification harness.

This is a STUB. The real runbook requires a domain-specific numerical /
empirical stress test per problem (Phase 3, check #4). Fill this in for the
actual problem before relying on it. A validator agent should RUN real checks,
not estimate them.

Conventions this stub sets up:
- Read the verification criterion from FRAMING.md (or take it as args).
- Iterate over many concrete cases, not a handful.
- Report PASS/FAIL counts and exit non-zero on failure so it's scriptable.

Replace the `check_one` function and the `cases` generator with your problem's
actual logic.
"""

import sys


def check_one(case):
    """Return True if `case` satisfies the claim. STUB: always returns True."""
    # TODO: implement the actual domain check for one case.
    raise NotImplementedError("numerical_check.py is a stub — implement check_one")


def cases():
    """Yield concrete test cases. STUB: yields nothing."""
    # TODO: yield many concrete cases (known values, edge cases, random draws).
    return iter(())


def main():
    passed = failed = 0
    for case in cases():
        try:
            if check_one(case):
                passed += 1
            else:
                failed += 1
                print(f"FAIL: {case!r}")
        except Exception as exc:  # noqa: BLE001
            failed += 1
            print(f"ERROR on {case!r}: {exc}")

    print(f"\n{passed} passed, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
