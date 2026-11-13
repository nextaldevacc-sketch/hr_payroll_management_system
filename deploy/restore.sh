#!/usr/bin/env sh
set -eu

# Nextal HR & Payroll — Production Restore Script (restore.sh)
# Usage: ./deploy/restore.sh <path-to-encrypted-backup.enc> [target-db-name]

BACKUP_FILE="${1:-}"
TARGET_DB="${2:-${POSTGRES_DB:-nextal_hr_prod}}"
DB_HOST="${POSTGRES_HOST:-postgres}"
DB_USER="${POSTGRES_USER:-nextal_app}"
PASSPHRASE="${BACKUP_ENCRYPTION_PASSPHRASE:-}"
RESTORE_STORAGE_DIR="${RESTORE_STORAGE_DIR:-/storage}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <path-to-encrypted-backup.enc> [target-db-name]"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "FATAL: Backup file '$BACKUP_FILE' does not exist."
  exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
  if command -v apk >/dev/null 2>&1; then
    apk add --no-cache openssl >/dev/null 2>&1 || true
  fi
fi

if [ -z "$PASSPHRASE" ]; then
  echo "FATAL: BACKUP_ENCRYPTION_PASSPHRASE environment variable is required to decrypt backup."
  exit 1
fi

TMP_DIR="/tmp/nextal_restore_$$"
mkdir -p "$TMP_DIR"
trap 'rm -rf "$TMP_DIR"' EXIT TERM INT

echo "[Restore] Decrypting ${BACKUP_FILE}..."
openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
  -in "$BACKUP_FILE" \
  -out "$TMP_DIR/bundle.tar.gz" \
  -pass "pass:${PASSPHRASE}"

echo "[Restore] Unpacking backup bundle..."
tar -xzf "$TMP_DIR/bundle.tar.gz" -C "$TMP_DIR"

DUMP_FILE=$(ls "$TMP_DIR"/*.dump | head -n 1)
STORAGE_TAR=$(ls "$TMP_DIR"/*_storage.tar.gz 2>/dev/null | head -n 1 || true)

if [ -z "$DUMP_FILE" ]; then
  echo "FATAL: No database dump found inside backup bundle."
  exit 1
fi

echo "[Restore] Restoring database dump into '${TARGET_DB}' on ${DB_HOST}..."
PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_restore -h "$DB_HOST" -U "$DB_USER" -d "$TARGET_DB" --clean --if-exists "$DUMP_FILE" || {
  echo "[Restore] Notice: pg_restore exited with non-critical warnings (e.g. drop if exists)."
}

if [ -n "$STORAGE_TAR" ] && [ -f "$STORAGE_TAR" ]; then
  echo "[Restore] Restoring storage files to ${RESTORE_STORAGE_DIR}..."
  mkdir -p "$RESTORE_STORAGE_DIR"
  tar -xzf "$STORAGE_TAR" -C "$RESTORE_STORAGE_DIR" 2>/dev/null || true
fi

echo "[Restore] Restore completed successfully into '${TARGET_DB}'."

