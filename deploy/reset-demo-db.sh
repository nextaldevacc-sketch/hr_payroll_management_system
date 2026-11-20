#!/usr/bin/env bash
set -euo pipefail

# Nextal HR & Payroll — VPS Database Reset Script for Demo Showcase
# Usage: ./deploy/reset-demo-db.sh --yes-wipe-database [.env.production]

CONFIRM_FLAG="${1:-}"
ENV_FILE="${2:-.env.production}"

# Handle case where env file is passed first or flag anywhere
if [ "$CONFIRM_FLAG" != "--yes-wipe-database" ]; then
  if [ "${2:-}" = "--yes-wipe-database" ]; then
    CONFIRM_FLAG="$2"
    ENV_FILE="$1"
  else
    echo "================================================================================"
    echo " [REFUSED] Dangerous operation: Database Wipe"
    echo " This script drops and recreates the application database in docker-compose.prod.yml."
    echo " You must explicitly pass --yes-wipe-database to execute."
    echo ""
    echo " Usage:"
    echo "   ./deploy/reset-demo-db.sh --yes-wipe-database [.env.production]"
    echo "================================================================================"
    exit 1
  fi
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "FATAL: Environment configuration file '$ENV_FILE' not found."
  exit 1
fi

COMPOSE_FILE="docker-compose.prod.yml"
if [ ! -f "$COMPOSE_FILE" ]; then
  echo "FATAL: Docker Compose file '$COMPOSE_FILE' not found."
  exit 1
fi

echo "================================================================================"
echo " Nextal HR & Payroll — Wiping and Resetting Application Database"
echo " Environment File: ${ENV_FILE}"
echo " Compose File    : ${COMPOSE_FILE}"
echo " Timestamp       : $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "================================================================================"

# Extract database credentials safely
DB_NAME=$(grep -E '^[[:space:]]*POSTGRES_DB=' "$ENV_FILE" | head -n 1 | cut -d '=' -f2- | tr -d '"'\'' ' || true)
DB_USER=$(grep -E '^[[:space:]]*POSTGRES_USER=' "$ENV_FILE" | head -n 1 | cut -d '=' -f2- | tr -d '"'\'' ' || true)
DB_NAME="${DB_NAME:-nextal_hr_prod}"
DB_USER="${DB_USER:-nextal_app}"

echo "[Step 1/5] Stopping web and api application containers..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" stop web api

echo "[Step 2/5] Terminating active connections and recreating database '${DB_NAME}'..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres psql -U postgres -c "
  SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();
" || true

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS \"${DB_NAME}\";"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres psql -U postgres -c "CREATE DATABASE \"${DB_NAME}\" OWNER \"${DB_USER}\";"

echo "[Step 3/5] Starting web and api application containers..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d api web

echo "[Step 4/5] Waiting for API container to become healthy..."
MAX_WAIT=30
COUNT=0
while [ $COUNT -lt $MAX_WAIT ]; do
  if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T api node -e "process.exit(0)" 2>/dev/null; then
    break
  fi
  sleep 2
  COUNT=$((COUNT + 2))
done

echo "[Step 5/5] Running migrations and seeding system roles catalog..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T api npx prisma migrate deploy
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T api npm run seed:system

echo ""
echo "================================================================================"
echo " ✅ DATABASE RESET COMPLETE"
echo "  - Application Database: ${DB_NAME} (clean state, migrations applied)"
echo "  - System Roles: Initialized (8 canonical roles)"
echo "  - Preserved: .env.production, Caddy certificates, backup volume"
echo "  - Ready for demo company provisioning and employee bulk import"
echo "================================================================================"
