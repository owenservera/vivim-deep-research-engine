#!/usr/bin/env pwsh
# set-context-budget.ps1 — toggle research-cip context ceiling between standard (120K) and max (1M / 600K real)
# Usage:
#   pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/set-context-budget.ps1 max
#   pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/set-context-budget.ps1 standard
#   pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/set-context-budget.ps1 status
param(
  [string]$Mode = "status"
)

$Root = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$LoopPath = Join-Path $Root "state/loop.json"
$Loop = Get-Content -LiteralPath $LoopPath -Raw | ConvertFrom-Json

function Write-Status {
  $cm = $Loop.context_mode; if (-not $cm) { $cm = "standard" }
  $ceil = $Loop.context_ceiling; if (-not $ceil) { $ceil = 120000 }
  $eff = $Loop.context_effective; if (-not $eff) { $eff = ($ceil -eq 1000000 ? 600000 : 120000) }
  Write-Host "Context mode   : $cm"
  Write-Host "Ceiling (adv.) : $ceil tokens"
  Write-Host "Effective safe : $eff tokens (hard stop before autocompact)"
  Write-Host "File           : $LoopPath"
  Write-Host "Env override   : CIP_RESEARCH_CONTEXT=$env:CIP_RESEARCH_CONTEXT CIP_RESEARCH_CONTEXT_CEILING=$env:CIP_RESEARCH_CONTEXT_CEILING"
}

$Mode = $Mode.ToLower().Trim()
if ($Mode -in @("status","show","get")) { Write-Status; exit 0 }

if ($Mode -in @("max","1m","1000000","1M","600k","600000","large")) {
  $Loop | Add-Member -NotePropertyName context_mode -NotePropertyValue "max" -Force
  $Loop | Add-Member -NotePropertyName context_ceiling -NotePropertyValue 1000000 -Force
  $Loop | Add-Member -NotePropertyName context_effective -NotePropertyValue 600000 -Force
  $Loop | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $LoopPath -Encoding utf8
  Write-Host "Switched to MAX — ceiling 1,000,000 (effective safe 600,000)." -ForegroundColor Green
  Write-Status
  Write-Host ""
  Write-Host "Next: pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check_budget.ps1 -ShowContext"
  exit 0
}
if ($Mode -in @("standard","std","120k","120000","safe","default")) {
  $Loop | Add-Member -NotePropertyName context_mode -NotePropertyValue "standard" -Force
  $Loop | Add-Member -NotePropertyName context_ceiling -NotePropertyValue 120000 -Force
  $Loop | Add-Member -NotePropertyName context_effective -NotePropertyValue 120000 -Force
  $Loop | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $LoopPath -Encoding utf8
  Write-Host "Switched to STANDARD — ceiling 120,000." -ForegroundColor Green
  Write-Status
  exit 0
}
Write-Error "Unknown mode '$Mode'. Use: max | standard | status"
exit 1
