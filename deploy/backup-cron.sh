#!/usr/bin/env sh
set -eu

# Nextal HR & Payroll — Backup Cron Daemon
# Runs scheduled backups daily at 02:00 Asia/Dubai (22:00 UTC).
# Does NOT execute backup at startup to prevent empty unmigrated dumps.

echo "================================================================"
echo " Nextal Backup Daemon Initialized"
echo " Schedule: Daily at 02:00 Asia/Dubai (22:00 UTC)"
echo " Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "================================================================"

trap 'echo "Stopping backup daemon..."; exit 0' TERM INT

# Configure crontab for root
CRON_FILE="/etc/crontabs/root"
mkdir -p /etc/crontabs /var/log
echo "0 22 * * * sh /deploy/backup.sh >> /var/log/backup.log 2>&1" > "$CRON_FILE"
touch /var/log/backup.log

echo "Starting background cron daemon..."
exec crond -f -l 2

