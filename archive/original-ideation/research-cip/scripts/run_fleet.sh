#!/usr/bin/env bash
# run_fleet.sh — orchestration helper for the multi-agent research process.
#
# This is a thin convenience wrapper. The real orchestration happens in the
# lead Claude Code session via the orchestration prompt in 03-claude-code-
# implementation.md. This script is here to (a) confirm the project layout is
# intact and (b) provide a single place to wire check_budget.sh into a loop.
#
# Usage:
#   ./run_fleet.sh            # just sanity-checks the layout
#   ./run_fleet.sh --budget N # runs check_budget.sh against a rolling tally
#
# It does NOT spawn subagents itself — Claude Code's Task tool / agent files in
# .claude/agents/ do that. This script is scaffolding, not the engine.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

required_dirs=(candidates verified scripts .claude/agents)
required_files=(FRAMING.md deadends.md)

echo "== Checking project layout =="
for d in "${required_dirs[@]}"; do
  [ -d "$d" ] || { echo "MISSING dir: $d"; exit 1; }
done
for f in "${required_files[@]}"; do
  [ -f "$f" ] || { echo "MISSING file: $f"; exit 1; }
done
echo "Layout OK."

if [ "${1:-}" = "--budget" ]; then
  spent="${2:-0}"
  budget="${3:-100}"
  ./scripts/check_budget.sh "$spent" "$budget"
fi
