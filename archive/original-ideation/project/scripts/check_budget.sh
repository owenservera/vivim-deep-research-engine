#!/usr/bin/env bash
# Usage: ./check_budget.sh <spent> <budget>
# Prints a checkpoint prompt at 25/50/75/100% thresholds.

spent=$1
budget=$2
pct=$(( 100 * spent / budget ))

for threshold in 25 50 75 100; do
  if [ "$pct" -ge "$threshold" ] && [ ! -f ".budget_${threshold}_ack" ]; then
    echo "=========================================="
    echo "BUDGET CHECKPOINT: ${pct}% of stated budget spent (${spent}/${budget})."
    echo "This is a required go/no-go, not a status update."
    echo "Before continuing, explicitly state:"
    echo "  1. What has been tried so far (summarize candidates/ + deadends.md)"
    echo "  2. What's still genuinely promising"
    echo "  3. Continue as-is / narrow scope / stop and document"
    echo "=========================================="
    touch ".budget_${threshold}_ack"
  fi
done
