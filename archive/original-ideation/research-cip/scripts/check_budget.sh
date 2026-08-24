#!/usr/bin/env bash
# Usage: ./check_budget.sh <spent> <budget> [--context-mode max|standard]
# Prints a checkpoint prompt at 25/50/75/100% thresholds.
# Also prints context-budget bar (120K standard vs 1M/600K max) — see CONTEXT-BUDGET.md
# Env override: CIP_RESEARCH_CONTEXT=max|standard

spent=$1
budget=$2
# Optional 3rd arg: context mode (or read CIP_RESEARCH_CONTEXT / state/loop.json)
ctx_mode="${3:-${CIP_RESEARCH_CONTEXT:-}}"
if [ -z "$ctx_mode" ] && [ -f "state/loop.json" ]; then
  ctx_mode="$(python3 -c "import json;print(json.load(open('state/loop.json')).get('context_mode','standard'))" 2>/dev/null || echo standard)"
fi
ctx_mode="$(echo "$ctx_mode" | tr '[:upper:]' '[:lower:]')"
case "$ctx_mode" in 1m|1000000|600k|600000|large|max) ctx_mode="max" ;; 120k|120000|std|safe|default|"") ctx_mode="standard" ;; esac
if [ "$ctx_mode" = "max" ]; then ctx_ceiling=1000000; ctx_eff=600000; else ctx_ceiling=120000; ctx_eff=120000; fi
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
# Context budget bar
echo "------------------------------------------"
echo "CONTEXT BUDGET (active: $ctx_mode) — ceiling $ctx_ceiling advertised, $ctx_eff effective safe"
echo "  40%=$((ctx_eff*40/100))  60%=$((ctx_eff*60/100))  80%=$((ctx_eff*80/100)) MANDATORY  95%=$((ctx_eff*95/100))  100%=$ctx_eff"
echo "  Toggle: ./scripts/set-context-budget.sh max|standard  | CIP_RESEARCH_CONTEXT=max ./scripts/check_budget.sh"
echo "  See CONTEXT-BUDGET.md"
echo "------------------------------------------"
