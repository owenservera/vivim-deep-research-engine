#!/usr/bin/env pwsh
# check_budget.ps1 — PowerShell budget checkpoint for research-cip (Windows-first)
# Mirrors check_budget.sh but runs natively in pwsh without bash.
# Usage:
#   pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check_budget.ps1          # auto-reads state/loop.json
#   pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check_budget.ps1 45 120   # explicit spent/budget
#   bun run scripts/research-loop.ts status  # alternative: outer-loop driver shows same

param(
  [int]$Spent = -1,
  [int]$Budget = -1,
  [switch]$ShowContext,
  [string]$ContextMode = ""
)

$Root = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$loopPath = Join-Path $Root "state/loop.json"
$targetsPath = Join-Path $Root "state/targets.json"
$loop = Get-Content -LiteralPath $loopPath -Raw | ConvertFrom-Json
$targets = Get-Content -LiteralPath $targetsPath -Raw | ConvertFrom-Json

if ($Spent -lt 0 -or $Budget -lt 0) {
  $Budget = $loop.total
  $Spent = ($targets.targets | Where-Object { $_.status -eq "done" } | Measure-Object -Property budget -Sum).Sum
  if ($null -eq $Spent) { $Spent = 0 }
}

# Resolve active context mode: explicit param > env > loop.json > standard
if (-not $ContextMode) { $ContextMode = $env:CIP_RESEARCH_CONTEXT }
if (-not $ContextMode) { $ContextMode = $loop.context_mode }
if (-not $ContextMode) { $ContextMode = "standard" }
$ContextMode = $ContextMode.ToLower().Trim()
# Normalize aliases
if ($ContextMode -in @("1m","1000000","600k","600000","large","max")) { $ContextMode = "max" }
if ($ContextMode -in @("120k","120000","std","safe","default")) { $ContextMode = "standard" }

$ContextCeiling = $env:CIP_RESEARCH_CONTEXT_CEILING
if (-not $ContextCeiling) { $ContextCeiling = $loop.context_ceiling }
if (-not $ContextCeiling) { $ContextCeiling = ($ContextMode -eq "max" ? 1000000 : 120000) }
$ContextCeiling = [int]$ContextCeiling
$ContextEffective = $env:CIP_RESEARCH_CONTEXT_CEILING
if ($ContextEffective) { $ContextEffective = [int]$ContextEffective } else { $ContextEffective = $loop.context_effective }
if (-not $ContextEffective) { $ContextEffective = ($ContextMode -eq "max" ? 600000 : $ContextCeiling) }
$ContextEffective = [int]$ContextEffective

$pct = if ($Budget -gt 0) { [Math]::Floor(100 * $Spent / $Budget) } else { 0 }

Write-Host "=========================================="
Write-Host "BUDGET CHECKPOINT: $pct% of stated budget spent ($Spent/$Budget)."
Write-Host "This is a required go/no-go, not a status update."
Write-Host "Before continuing, explicitly state:"
Write-Host "  1. What has been tried so far (summarize candidates/ + deadends.md)"
Write-Host "  2. What's still genuinely promising"
Write-Host "  3. Continue as-is / narrow scope / stop and document"
Write-Host "=========================================="

# Ack-file forcing (mirrors check_budget.sh)
foreach ($threshold in @(25,50,75,100)) {
  $ack = Join-Path $Root ".budget_${threshold}_ack"
  if ($pct -ge $threshold -and -not (Test-Path -LiteralPath $ack)) {
    Write-Host "THRESHOLD ${threshold}% CROSSED — creation of $ack marks the required decision point."
    # Don't auto-create; lead session should consciously decide and then `New-Item $ack`
  }
}
if ($pct -ge 100) { Write-Host "BUDGET 100% — STOP. Require explicit human decision to extend." -ForegroundColor Red }

# Context budget bar (always show when -ShowContext or in max mode)
if ($ShowContext -or $ContextMode -eq "max") {
  Write-Host ""
  Write-Host "------------------------------------------"
  Write-Host "CONTEXT BUDGET (active mode: $ContextMode) — ceiling $ContextCeiling advertised, $ContextEffective effective safe"
  Write-Host "  40% = $([int]($ContextEffective*0.40))  60% = $([int]($ContextEffective*0.60))  80% = $([int]($ContextEffective*0.80)) MANDATORY CHECKPOINT  95% = $([int]($ContextEffective*0.95)) HARD STOP  100% = $ContextEffective"
  Write-Host "  Toggle: pwsh scripts/set-context-budget.ps1 max|standard  | env CIP_RESEARCH_CONTEXT=max"
  Write-Host "  See CONTEXT-BUDGET.md for guidance."
  Write-Host "------------------------------------------"
  if ($ContextMode -eq "max") {
    Write-Host "MAX mode active — you may run up to ~600K real tokens before compaction. Persist at 480K (80%)." -ForegroundColor Cyan
  }
}
