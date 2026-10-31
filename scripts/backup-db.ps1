# =============================================================================
# Nextal HR & Payroll — Sovereign Database Backup Script (PowerShell)
# =============================================================================
param(
  [string]$BackupDir = "./backups",
  [int]$RetentionDays = 30
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

if (!(Test-Path $BackupDir)) {
  New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$backupFile = Join-Path $BackupDir "nextal_backup_$timestamp.sql"
Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Starting PostgreSQL database backup..."

# Execute pg_dump inside running Docker postgres container
docker exec -t nextal-postgres pg_dump -U postgres nextal_hr_payroll > $backupFile

$fileInfo = Get-Item $backupFile
Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Backup created successfully: $backupFile ($([math]::Round($fileInfo.Length / 1KB, 2)) KB)"

# Prune older than retention days
$cutoffDate = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $BackupDir -Filter "nextal_backup_*.sql*" | Where-Object { $_.LastWriteTime -lt $cutoffDate } | Remove-Item -Force

Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Pruned backups older than $RetentionDays days. Backup cycle complete."
