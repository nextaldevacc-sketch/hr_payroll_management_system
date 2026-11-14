#!/usr/bin/env sh
set -eu

# Nextal HR & Payroll — Offsite Encrypted Backup Transfer Script
# Securely transfers AES-256 encrypted archives to a remote secondary host.
# Must refuse any unencrypted database dumps.
#
# Required Environment Variables:
#   OFFSITE_BACKUP_HOST  - Remote secondary hostname or IP
#   OFFSITE_BACKUP_USER  - Remote SSH username
#   OFFSITE_BACKUP_DIR   - Remote destination directory (e.g. /srv/backups/nextal/)
#
# Optional Environment Variables:
#   OFFSITE_BACKUP_PORT     - SSH port (default: 22)
#   OFFSITE_BACKUP_SSH_KEY  - Path to private SSH key

echo "================================================================"
echo " Nextal HR & Payroll — Offsite Backup Transfer"
echo " Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "================================================================"

# Validate target archive
ARCHIVE="${1:-}"

if [ -z "$ARCHIVE" ]; then
  # Find latest encrypted daily backup
  BACKUP_BASE="${BACKUP_DIR:-./backups}"
  if [ -d "${BACKUP_BASE}/daily" ]; then
    ARCHIVE=$(ls -t "${BACKUP_BASE}/daily"/*.enc 2>/dev/null | head -n 1 || true)
  fi
fi

if [ -z "$ARCHIVE" ] || [ ! -f "$ARCHIVE" ]; then
  echo "FATAL: No encrypted backup archive found to transfer." >&2
  echo "Usage: $0 [path/to/backup.enc]" >&2
  exit 1
fi

# HARD SECURITY RULE: Refuse unencrypted files
case "$ARCHIVE" in
  *.enc)
    ;;
  *)
    echo "FATAL: Refusing to transfer unencrypted file '${ARCHIVE}'." >&2
    echo "Offsite backups MUST be AES-256 encrypted archives ending in .enc." >&2
    exit 1
    ;;
esac

# Verify file does not contain plain SQL or unencrypted tar header
FIRST_BYTES=$(head -c 8 "$ARCHIVE" 2>/dev/null || true)
if echo "$FIRST_BYTES" | grep -q -E "^(PGDMP|--|CREATE|INSERT|\x1f\x8b)"; then
  echo "FATAL: Security check failed. Archive header indicates unencrypted contents. Transfer aborted." >&2
  exit 1
fi

# Validate remote connection environment variables
if [ -z "${OFFSITE_BACKUP_HOST:-}" ]; then
  echo "FATAL: OFFSITE_BACKUP_HOST environment variable is required." >&2
  exit 1
fi

if [ -z "${OFFSITE_BACKUP_USER:-}" ]; then
  echo "FATAL: OFFSITE_BACKUP_USER environment variable is required." >&2
  exit 1
fi

if [ -z "${OFFSITE_BACKUP_DIR:-}" ]; then
  echo "FATAL: OFFSITE_BACKUP_DIR environment variable is required." >&2
  exit 1
fi

PORT="${OFFSITE_BACKUP_PORT:-22}"
SSH_OPTS="-p ${PORT} -o BatchMode=yes -o StrictHostKeyChecking=accept-new"
if [ -n "${OFFSITE_BACKUP_SSH_KEY:-}" ] && [ -f "${OFFSITE_BACKUP_SSH_KEY}" ]; then
  SSH_OPTS="${SSH_OPTS} -i ${OFFSITE_BACKUP_SSH_KEY}"
fi

FILE_NAME=$(basename "$ARCHIVE")
FILE_SIZE=$(wc -c < "$ARCHIVE" | tr -d ' ')

# Compute checksum
CHECKSUM="unknown"
if command -v sha256sum >/dev/null 2>&1; then
  CHECKSUM=$(sha256sum "$ARCHIVE" | awk '{print $1}')
elif command -v shasum >/dev/null 2>&1; then
  CHECKSUM=$(shasum -a 256 "$ARCHIVE" | awk '{print $1}')
fi

echo "[Offsite] Source Archive: ${ARCHIVE}"
echo "[Offsite] Size: ${FILE_SIZE} bytes"
echo "[Offsite] SHA-256: ${CHECKSUM}"
echo "[Offsite] Destination: ${OFFSITE_BACKUP_USER}@${OFFSITE_BACKUP_HOST}:${OFFSITE_BACKUP_DIR}"

# Create companion sha256 file
TMP_SHA="/tmp/${FILE_NAME}.sha256"
echo "${CHECKSUM}  ${FILE_NAME}" > "$TMP_SHA"

# Transfer via rsync (preferred) or scp
if command -v rsync >/dev/null 2>&1; then
  echo "[Offsite] Transferring via rsync..."
  rsync -avz -e "ssh ${SSH_OPTS}" "$ARCHIVE" "$TMP_SHA" "${OFFSITE_BACKUP_USER}@${OFFSITE_BACKUP_HOST}:${OFFSITE_BACKUP_DIR}/"
else
  echo "[Offsite] Transferring via scp..."
  scp ${SSH_OPTS} "$ARCHIVE" "$TMP_SHA" "${OFFSITE_BACKUP_USER}@${OFFSITE_BACKUP_HOST}:${OFFSITE_BACKUP_DIR}/"
fi

rm -f "$TMP_SHA"

echo "================================================================"
echo " OFFSITE BACKUP TRANSFER SUCCESSFUL!"
echo " Archive: ${FILE_NAME}"
echo " Verified SHA-256: ${CHECKSUM}"
echo "================================================================"
