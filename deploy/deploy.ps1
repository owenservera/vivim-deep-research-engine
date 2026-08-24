# deploy/deploy.ps1 — Portable deployment script (Windows / PowerShell)
# Usage: .\deploy\deploy.ps1 [-TargetDir "."]

param(
    [string]$TargetDir = "."
)

$FrameworkJson = "framework.json"

if (-not (Test-Path $FrameworkJson)) {
    Write-Error "ERROR: $FrameworkJson not found. Run from workspace root."
    exit 1
}

Write-Host "=== VIVIM Deep-Research Engine — Deploy (PowerShell) ==="
Write-Host "Target: $TargetDir"

# Read framework version
$fwVersion = (Get-Content $FrameworkJson | Select-String 'framework_version').ToString().Split(':')[1].Trim('" ,')
Write-Host "Framework version: $fwVersion"

# Verify archive
if (Test-Path "archive/manifest.md") {
    Write-Host "Archive verified: archive/manifest.md"
} else {
    Write-Host "WARNING: archive/manifest.md missing."
}

# Initialize session artifacts if missing
if (-not (Test-Path "session/deadends.md") -or (Get-Item "session/deadends.md").Length -eq 0) {
    Write-Host "Initializing session/deadends.md..."
    New-Item -Path "session/deadends.md" -ItemType File -Force | Out-Null
}

# Report agent roles
$agentCount = (Get-Content $FrameworkJson | Select-String 'agent_roles').Count
Write-Host "Agent roles configured: $agentCount"

# Initialize v2 orchestrator (new CLI init — see VIVIM-10X-UPGRADE.md rollout)
if (Test-Path "orchestrator/cli.ts") {
    Write-Host "Initializing v2 orchestrator CLI at session root..."
    # Init is safe to call even if session already initialized.
    node orchestrator/cli.ts init session/ 2>$null
}

Write-Host "=== Deploy complete ==="
Write-Host "Next: read docs/05-usage-guide.md, then run 'node orchestrator/cli.ts status session/'"
