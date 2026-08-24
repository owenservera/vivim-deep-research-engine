#!/usr/bin/env pwsh
# run_fleet.ps1 — Windows/PowerShell orchestration helper for research-cip
# Thin convenience wrapper; the real orchestration happens in the lead opencode session
# via the orchestration prompt (AGENTS.md / .opencode/command/research*.md).
# This script just confirms layout and optionally runs the budget checkpoint.

param(
  [switch]$Budget,
  [int]$Spent = 0,
  [int]$Total = 120
)

$Root = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
Set-Location -LiteralPath $Root

$requiredDirs = @("candidates", "verified", "scripts", ".opencode/agents", "repros", "state")
$requiredFiles = @("FRAMING.md", "deadends.md", "HAZARDS.md", "state/targets.json", "state/loop.json")

Write-Host "== Checking research-cip layout =="
foreach ($d in $requiredDirs) {
  if (-not (Test-Path -LiteralPath (Join-Path $Root $d))) { Write-Error "MISSING dir: $d"; exit 1 }
}
foreach ($f in $requiredFiles) {
  if (-not (Test-Path -LiteralPath (Join-Path $Root $f))) { Write-Error "MISSING file: $f"; exit 1 }
}
Write-Host "Layout OK. Target codebase: C:\0-BlackBoxProject-0\index"
$loopJson = Get-Content -LiteralPath (Join-Path $Root "state/loop.json") -Raw | ConvertFrom-Json
$cm = $loopJson.context_mode; if (-not $cm) { $cm = "standard" }
$ceil = $loopJson.context_ceiling; if (-not $ceil) { $ceil = 120000 }
$eff = $loopJson.context_effective; if (-not $eff) { $eff = $ceil }
if ($env:CIP_RESEARCH_CONTEXT) { $cm = "$env:CIP_RESEARCH_CONTEXT (env override)" }
Write-Host "Context: $cm — ceiling $ceil / effective $eff  (CONTEXT-BUDGET.md, set-context-budget.ps1)"
Write-Host "Queue:"
bun run scripts/research-loop.ts status
if ($Budget) {
  & (Join-Path $Root "scripts/check_budget.ps1") -Spent $Spent -Budget $Total -ShowContext
} else {
  & (Join-Path $Root "scripts/check_budget.ps1") -ShowContext
}
