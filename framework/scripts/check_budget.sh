#!/bin/bash
# Framework script: budget checkpoint
# Usage: bash framework/scripts/check_budget.sh <spent> <budget>
# See docs/05-usage-guide.md for budget tracking rules.

SPENT="${1:-0}"
BUDGET="${2:-100}"

if (( $(echo "$SPENT > 100" | bc -l) )); then
  echo "WARNING: Budget exceeded ($SPENT% > $BUDGET%). See framework.json budget settings."
else
  echo "Budget OK: $SPENT% / $BUDGET%"
fi
