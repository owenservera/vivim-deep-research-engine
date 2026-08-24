#!/usr/bin/env bash
# set-context-budget.sh — bash counterpart to set-context-budget.ps1
# Usage: ./scripts/set-context-budget.sh max|standard|status
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOOP="$ROOT/state/loop.json"
MODE="${1:-status}"
MODE="$(echo "$MODE" | tr '[:upper:]' '[:lower:]')"

status() {
  python3 -c "
import json,os
p=os.path.join('$ROOT','state/loop.json')
d=json.load(open(p))
cm=d.get('context_mode','standard')
ceil=d.get('context_ceiling',120000)
eff=d.get('context_effective',120000)
print(f'Context mode   : {cm}')
print(f'Ceiling (adv.) : {ceil} tokens')
print(f'Effective safe : {eff} tokens')
print(f'File           : {p}')
import os as _os
print(f\"Env override   : CIP_RESEARCH_CONTEXT={_os.environ.get('CIP_RESEARCH_CONTEXT','')} CIP_RESEARCH_CONTEXT_CEILING={_os.environ.get('CIP_RESEARCH_CONTEXT_CEILING','')}\")
"
}

case "$MODE" in
  max|1m|1000000|600k|600000|large)
    python3 -c "
import json
p='$LOOP'
d=json.load(open(p))
d['context_mode']='max'
d['context_ceiling']=1000000
d['context_effective']=600000
open(p,'w').write(json.dumps(d,indent=2))
print('Switched to MAX — ceiling 1,000,000 (effective safe 600,000)')
"
    status
    echo "Next: ./scripts/check_budget.sh 0 120  # and: pwsh -File scripts/check_budget.ps1 -ShowContext"
    ;;
  standard|std|120k|120000|safe|default)
    python3 -c "
import json
p='$LOOP'
d=json.load(open(p))
d['context_mode']='standard'
d['context_ceiling']=120000
d['context_effective']=120000
open(p,'w').write(json.dumps(d,indent=2))
print('Switched to STANDARD — ceiling 120,000')
"
    status
    ;;
  status|show|get)
    status
    ;;
  *)
    echo "Unknown mode '$MODE'. Use: max | standard | status" >&2
    exit 1
    ;;
esac
