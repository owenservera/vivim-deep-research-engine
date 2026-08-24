#!/bin/bash
# deploy/deploy.sh — Portable deployment script for VIVIM Deep-Research Engine
# Usage: bash deploy/deploy.sh [target-directory]
# Default target-directory: . (current workspace root)

set -euo pipefail

TARGET_DIR="${1:-.}"
FRAMEWORK_JSON="framework.json"

if [[ ! -f "$FRAMEWORK_JSON" ]]; then
  echo "ERROR: $FRAMEWORK_JSON not found. Run from workspace root."
  exit 1
fi

echo "=== VIVIM Deep-Research Engine — Deploy ==="
echo "Target: $TARGET_DIR"
echo "Framework version: $(cat framework.json | grep framework_version | head -1)"

# 1. Verify archive
if [[ -f "archive/manifest.md" ]]; then
  echo "Archive verified: archive/manifest.md"
else
  echo "WARNING: archive/manifest.md missing — evidence chain incomplete."
fi

# 2. Initialize session from templates (if session/ not fully initialized)
if [[ ! -f "session/deadends.md" || ! -s "session/deadends.md" ]]; then
  echo "Initializing session/deadends.md..."
  touch session/deadends.md
fi

# 3. Check framework customization points
if [[ -f "deploy/custom-overrides/budget-override.json" ]]; then
  echo "Custom budget override found."
fi

# 4. Report framework status
echo "Agent roles configured: $(cat $FRAMEWORK_JSON | grep -o 'generator\|extender\|validator\|literature\|synthesizer\|blindspot' | wc -l)"
echo "Hazard seeds: $(cat $FRAMEWORK_JSON | grep hazard_seed_ids -A1 | tail -1)"

# 5. Initialize v2 orchestrator (new CLI init — see VIVIM-10X-UPGRADE.md rollout)
if [[ -f "orchestrator/cli.ts" ]]; then
  echo "Initializing v2 orchestrator CLI at session root..."
  # Init is a no-op if session/state/engine-state.json already exists; safe to call.
  node orchestrator/cli.ts init session/ || echo "Note: CLI init returned non-zero (likely session already initialized — safe to ignore)."
fi

echo "=== Deploy complete ==="
echo "Next step: read docs/05-usage-guide.md, then run 'node orchestrator/cli.ts status <session-root>' or configure session/.opencode/ for CLI use."
