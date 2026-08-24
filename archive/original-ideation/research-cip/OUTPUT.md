# Output — latest research run summary (research-cip)

This file is overwritten each time a target completes. For the full history see `INDEX.md`.

## Status

Harness initialized. No target has been executed yet.

## Next step

Run the iteration plan for the highest-priority pending target:

```powershell
bun run scripts/research-loop.ts next
# then in an agent session:
#  read FRAMING.md, spawn generators, validators, blindspot, synthesizer
#  deposit repros/cip-*.py + candidates/*.md + verified/*.md
bun run scripts/research-loop.ts done cip-indexer-incremental "outcome text"
```

## Last harness check

Run from research-cip dir (PowerShell):

```powershell
.\scripts\run_fleet.ps1
python repros/README.py  # if you add a harness self-check
```

