#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Nextal HR & Payroll — Disaster Recovery Restore Script (Bash)
# =============================================================================

BACKUP_FILE="${1:-}"

if [ -z "${BACKUP_FILE}" ] || [ ! -f "${BACKUP_FILE}" ]; then
  echo "Usage: ./scripts/restore-db.sh <path-to-backup.sql.gz>"
  exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restoring database from: ${BACKUP_FILE}"

if [[ "${BACKUP_FILE}" == *.gz ]]; then
  gunzip -c "${BACKUP_FILE}" | docker exec -i nextal-postgres psql -U postgres nextal_hr_payroll
else
  docker exec -i nextal-postgres psql -U postgres nextal_hr_payroll < "${BACKUP_FILE}"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Database restoration completed successfully."
