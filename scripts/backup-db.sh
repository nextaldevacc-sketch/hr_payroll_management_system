#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Nextal HR & Payroll — Sovereign Database Backup Script (30-Day Retention)
# =============================================================================

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/nextal_backup_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting PostgreSQL backup..."

# Extract connection details or use container execution
if [ -n "${DATABASE_URL:-}" ]; then
  pg_dump "${DATABASE_URL}" | gzip -9 > "${BACKUP_FILE}"
else
  # Default to local docker container if DATABASE_URL not set in shell
  docker exec -t nextal-postgres pg_dump -U postgres nextal_hr_payroll | gzip -9 > "${BACKUP_FILE}"
fi

BACKUP_SIZE=$(ls -lh "${BACKUP_FILE}" | awk '{print $5}')
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup created successfully: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Prune backups older than retention window (default 30 days)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Pruning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -type f -name "nextal_backup_*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup & retention cycle completed."

