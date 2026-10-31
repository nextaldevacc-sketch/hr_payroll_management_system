# =============================================================================
# Nextal HR & Payroll — Disaster Recovery Restore Script (PowerShell)
# =============================================================================
param(
  [Parameter(Mandatory=$true)]
  [string]$BackupFile,
  [string]$TargetDatabase = "nextal_hr_payroll"
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $BackupFile)) {
  Write-Error "Backup file not found at path: $BackupFile"
  exit 1
}

Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Restoring target database '$TargetDatabase' from: $BackupFile"

# 1. Reset public schema to cleanly receive dump
Write-Host "Resetting target schema on '$TargetDatabase'..."
docker exec -i nextal-postgres psql -U postgres -d $TargetDatabase -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"

# 2. Feed SQL backup stream into container's psql
Get-Content -Raw $BackupFile | docker exec -i nextal-postgres psql -U postgres -d $TargetDatabase

Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Database restoration finished successfully."
