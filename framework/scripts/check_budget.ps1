# Framework script: budget checkpoint (PowerShell)
# Usage: .\framework\scripts\check_budget.ps1 -Spent 85 -Budget 120
param([int]$Spent=0, [int]$Budget=100)
if ($Spent -gt $Budget) {
    Write-Warning "Budget exceeded ($Spent% > $Budget%). See framework.json."
} else {
    Write-Host "Budget OK: $Spent% / $Budget%"
}
