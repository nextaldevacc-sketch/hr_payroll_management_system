#!/usr/bin/env sh
set -eu

# Nextal HR & Payroll — Production Automated Encrypted Backup Script
# Creates an encrypted bundle of PostgreSQL database dump + document storage volume.
# Retains 14 daily, 8 weekly, and 6 monthly archives.

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${BACKUP_DIR:-/backups}"
STORAGE_DIR="${STORAGE_DIR:-/storage}"
DB_HOST="${POSTGRES_HOST:-postgres}"
DB_USER="${POSTGRES_USER:-nextal_app}"
DB_NAME="${POSTGRES_DB:-nextal_hr_prod}"
PASSPHRASE="${BACKUP_ENCRYPTION_PASSPHRASE:-}"
OPS_EMAIL="${OPS_ALERT_EMAIL:-admin@nextal.ae}"

on_backup_failure() {
  ERR_CODE=$?
  if [ "$ERR_CODE" -ne 0 ]; then
    echo "[Backup] CRITICAL: Backup execution failed with error code ${ERR_CODE} at $(date)"
    if [ -f scripts/alert-backup-failure.mjs ]; then
      node scripts/alert-backup-failure.mjs "${OPS_EMAIL}" "Exit code ${ERR_CODE}" || true
    fi
  fi
}
trap on_backup_failure EXIT INT TERM

if ! command -v openssl >/dev/null 2>&1; then
  if command -v apk >/dev/null 2>&1; then
    apk add --no-cache openssl >/dev/null 2>&1 || true
  fi
fi

if [ -z "$PASSPHRASE" ]; then
  echo "FATAL: BACKUP_ENCRYPTION_PASSPHRASE is required for encrypted backups."
  exit 1
fi

mkdir -p "${BACKUP_DIR}/temp" "${BACKUP_DIR}/daily" "${BACKUP_DIR}/weekly" "${BACKUP_DIR}/monthly"

TEMP_PREFIX="${BACKUP_DIR}/temp/nextal_${TIMESTAMP}"
DUMP_FILE="${TEMP_PREFIX}.dump"
STORAGE_TAR="${TEMP_PREFIX}_storage.tar.gz"
BUNDLE_TAR="${TEMP_PREFIX}_bundle.tar.gz"
FINAL_ENCRYPTED="${BACKUP_DIR}/daily/nextal_backup_${TIMESTAMP}.enc"
LAST_SUCCESS_FILE="${LAST_SUCCESS_FILE:-${BACKUP_DIR}/last_success.txt}"

echo "[Backup] Starting production backup at ${TIMESTAMP}..."

# 0. Check database readiness (skip cleanly if migrations not applied yet)
if command -v psql >/dev/null 2>&1; then
  MIGRATIONS_TABLE=$(PGPASSWORD="${POSTGRES_PASSWORD:-}" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -A -c \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_prisma_migrations';" 2>/dev/null || echo "0")
  if [ "$MIGRATIONS_TABLE" = "0" ] || [ -z "$MIGRATIONS_TABLE" ]; then
    echo "[Backup] Schema not initialized (no '_prisma_migrations' table). Skipping backup until initial migrations run."
    exit 0
  fi

  APPLIED_COUNT=$(PGPASSWORD="${POSTGRES_PASSWORD:-}" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -A -c \
    "SELECT count(*) FROM _prisma_migrations WHERE rolled_back_at IS NULL;" 2>/dev/null || echo "0")
  if [ "$APPLIED_COUNT" -eq 0 ] 2>/dev/null; then
    echo "[Backup] Zero applied migrations found in '_prisma_migrations'. Skipping backup until initial migrations finish."
    exit 0
  fi
fi

# 1. PostgreSQL Database Dump (Custom binary format)
echo "[Backup] Dumping PostgreSQL database '${DB_NAME}'..."
PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_dump -h "$DB_HOST" -U "$DB_USER" -Fc "$DB_NAME" > "$DUMP_FILE"

# 1b. Sanity checks on database dump (minimum size and pg_restore table listing)
DUMP_SIZE=$(wc -c < "$DUMP_FILE" | tr -d ' ')
MIN_SIZE="${MIN_BACKUP_SIZE_BYTES:-10240}" # 10KB minimum threshold
if [ "$DUMP_SIZE" -lt "$MIN_SIZE" ]; then
  echo "FATAL: Database dump size (${DUMP_SIZE} bytes) is below minimum required threshold (${MIN_SIZE} bytes). Aborting backup." >&2
  rm -f "$DUMP_FILE"
  exit 1
fi

TABLE_COUNT=$(pg_restore -l "$DUMP_FILE" | grep -E "TABLE DATA|TABLE [^ ]+" | wc -l | tr -d ' ')
if [ "$TABLE_COUNT" -lt 5 ]; then
  echo "FATAL: Sanity check failed via pg_restore -l: only found ${TABLE_COUNT} table entries in dump. Aborting backup." >&2
  rm -f "$DUMP_FILE"
  exit 1
fi
echo "[Backup] Dump validation passed: ${DUMP_SIZE} bytes, ${TABLE_COUNT} table entries verified."

# 2. Document Storage Volume Archive
echo "[Backup] Archiving stored documents..."
if [ -d "$STORAGE_DIR" ] && [ "$(ls -A "$STORAGE_DIR" 2>/dev/null)" ]; then
  tar -czf "$STORAGE_TAR" -C "$STORAGE_DIR" .
else
  echo "[Backup] Storage directory empty; creating placeholder..."
  mkdir -p "${TEMP_PREFIX}_empty"
  tar -czf "$STORAGE_TAR" -C "${TEMP_PREFIX}_empty" .
  rmdir "${TEMP_PREFIX}_empty"
fi

# 3. Combine into single tar archive
echo "[Backup] Bundling database dump and storage..."
tar -czf "$BUNDLE_TAR" -C "${BACKUP_DIR}/temp" "nextal_${TIMESTAMP}.dump" "nextal_${TIMESTAMP}_storage.tar.gz"

# 4. Encrypt using AES-256-CBC with PBKDF2 (100,000 iterations)
echo "[Backup] Encrypting backup bundle with AES-256-CBC..."
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
  -in "$BUNDLE_TAR" \
  -out "$FINAL_ENCRYPTED" \
  -pass "pass:${PASSPHRASE}"

# 5. Clean up unencrypted temporary files
rm -f "$DUMP_FILE" "$STORAGE_TAR" "$BUNDLE_TAR"
rmdir "${BACKUP_DIR}/temp" 2>/dev/null || true

# 6. Weekly and Monthly Rotation
DAY_OF_WEEK=$(date +%u) # 1-7, 7 is Sunday
DAY_OF_MONTH=$(date +%d) # 01-31

if [ "$DAY_OF_WEEK" = "7" ]; then
  cp "$FINAL_ENCRYPTED" "${BACKUP_DIR}/weekly/"
fi

if [ "$DAY_OF_MONTH" = "01" ]; then
  cp "$FINAL_ENCRYPTED" "${BACKUP_DIR}/monthly/"
fi

# 7. Retention Enforcement:
# Keep last 14 daily backups
find "${BACKUP_DIR}/daily" -name "*.enc" -type f -mtime +14 -delete 2>/dev/null || true
# Keep last 8 weekly backups (56 days)
find "${BACKUP_DIR}/weekly" -name "*.enc" -type f -mtime +56 -delete 2>/dev/null || true
# Keep last 6 monthly backups (180 days)
find "${BACKUP_DIR}/monthly" -name "*.enc" -type f -mtime +180 -delete 2>/dev/null || true

# 8. Optional Remote Replication (S3 or rsync)
if [ -n "${BACKUP_S3_URI:-}" ]; then
  echo "[Backup] Syncing encrypted archive to remote S3: ${BACKUP_S3_URI}..."
  # If aws-cli / s3cmd is available
  if command -v aws >/dev/null 2>&1; then
    aws s3 cp "$FINAL_ENCRYPTED" "${BACKUP_S3_URI}/"
  fi
fi

# 9. Record Last Success Timestamp File
cat <<EOF > "$LAST_SUCCESS_FILE"
timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
archive=${FINAL_ENCRYPTED}
size_bytes=$(wc -c < "${FINAL_ENCRYPTED}" | tr -d ' ')
status=SUCCESS
tables_count=${TABLE_COUNT}
dump_size_bytes=${DUMP_SIZE}
EOF
echo "[Backup] Recorded success metadata to ${LAST_SUCCESS_FILE}."

echo "[Backup] Backup completed successfully: ${FINAL_ENCRYPTED} ($(ls -lh "$FINAL_ENCRYPTED" | awk '{print $5}'))"

