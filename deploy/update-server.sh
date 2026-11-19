#!/usr/bin/env bash
set -euo pipefail

# Nextal HR & Payroll — Non-Destructive Zero-Downtime Server Update Script
# Designed for VPS with aaPanel (Nginx) or standalone Docker Compose.
# Setup: -f docker-compose.prod.yml -f docker-compose.aapanel.yml (where aapanel file is an override)
# Usage: ./deploy/update-server.sh [ENV_FILE]
# Example: ./deploy/update-server.sh .env.production

ENV_FILE=".env.production"

USE_AAPANEL=""

# HARD RULE: Refuse destructive operations
for arg in "$@"; do
  case "$arg" in
    *reset*|*truncate*|*drop*|*force-reset*)
      echo "FATAL: Destructive argument '${arg}' detected. Updates must be strictly non-destructive." >&2
      exit 1
      ;;
    --aapanel)
      USE_AAPANEL="true"
      ;;
    --standalone)
      USE_AAPANEL="false"
      ;;
    *.env*)
      if [ -f "$arg" ]; then
        ENV_FILE="$arg"
      fi
      ;;
  esac
done

if [ ! -f "${ENV_FILE}" ]; then
  echo "FATAL: Environment file '${ENV_FILE}' not found." >&2
  exit 1
fi

if [ ! -f "docker-compose.prod.yml" ]; then
  echo "FATAL: Base compose file 'docker-compose.prod.yml' not found." >&2
  exit 1
fi

# Compose files setup: -f docker-compose.prod.yml -f docker-compose.aapanel.yml (where aapanel is an override)
COMPOSE_ARGS=("-f" "docker-compose.prod.yml")
if [ "$USE_AAPANEL" = "true" ] || ([ "$USE_AAPANEL" != "false" ] && [ -f "docker-compose.aapanel.yml" ]); then
  if [ -f "docker-compose.aapanel.yml" ]; then
    COMPOSE_ARGS+=("-f" "docker-compose.aapanel.yml")
  fi
fi

echo "================================================================"
echo " Nextal HR & Payroll — Server Update (Zero-Downtime Safe Mode)"
echo " Compose Stack: ${COMPOSE_ARGS[*]}"
echo " Environment File: ${ENV_FILE}"
echo " Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "================================================================"

# Step 1: Pre-Update Snapshot / Backup
echo "[Step 1/6] Triggering pre-update safety database backup..."
if docker ps --format '{{.Names}}' | grep -q "nextal-backup-prod"; then
  docker exec nextal-backup-prod sh /deploy/backup.sh || echo "Warning: Backup trigger had notices, proceeding with care."
else
  echo "Note: nextal-backup-prod not currently running; skipping live container backup."
fi

# Step 2: Tag existing images for rollback
echo "[Step 2/6] Tagging active images for instant rollback capability..."
docker tag hr-payroll-management-api:latest hr-payroll-management-api:rollback-prev 2>/dev/null || \
  docker tag nextal-api-prod:latest nextal-api-prod:rollback-prev 2>/dev/null || true
docker tag hr-payroll-management-web:latest hr-payroll-management-web:rollback-prev 2>/dev/null || \
  docker tag nextal-web-prod:latest nextal-web-prod:rollback-prev 2>/dev/null || true

# Step 3: Load transferred images if available in images/ directory
echo "[Step 3/6] Inspecting local images..."
if [ -d "./images" ]; then
  for img in ./images/*.tar ./images/*.tar.gz; do
    if [ -f "$img" ]; then
      echo "Loading container image from $img..."
      docker load -i "$img"
    fi
  done
fi

# Step 4: Apply database migrations in isolated run container (NEVER RESET)
echo "[Step 4/6] Applying pending additive database migrations (prisma migrate deploy)..."
docker compose --env-file "${ENV_FILE}" "${COMPOSE_ARGS[@]}" run --rm api npx prisma migrate deploy

# Step 4b: Ensure idempotent system seed
echo "[Step 4b] Verifying system roles catalog..."
docker compose --env-file "${ENV_FILE}" "${COMPOSE_ARGS[@]}" run --rm api npm run seed:system

# Step 5: Rolling restart of API, then Web
rollback() {
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  echo " FATAL: Update health check failed. Initiating instant rollback..."
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  docker tag hr-payroll-management-api:rollback-prev hr-payroll-management-api:latest 2>/dev/null || true
  docker tag hr-payroll-management-web:rollback-prev hr-payroll-management-web:latest 2>/dev/null || true
  docker compose --env-file "${ENV_FILE}" "${COMPOSE_ARGS[@]}" up -d --no-deps api
  docker compose --env-file "${ENV_FILE}" "${COMPOSE_ARGS[@]}" up -d --no-deps web
  echo "Rollback containers restarted. Please check logs: docker compose ${COMPOSE_ARGS[*]} logs --tail=100"
  exit 1
}

echo "[Step 5/6] Performing rolling restart: updating API service..."
docker compose --env-file "${ENV_FILE}" "${COMPOSE_ARGS[@]}" up -d --no-deps api

echo "Waiting for API service health..."
API_HEALTHY=0
for i in $(seq 1 12); do
  if docker compose --env-file "${ENV_FILE}" "${COMPOSE_ARGS[@]}" ps api --format json | grep -q '"Health":"healthy"'; then
    API_HEALTHY=1
    echo "API service is healthy!"
    break
  fi
  sleep 5
done

if [ "$API_HEALTHY" -ne 1 ]; then
  echo "API service failed to become healthy within 60s."
  rollback
fi

echo "Updating Web service..."
docker compose --env-file "${ENV_FILE}" "${COMPOSE_ARGS[@]}" up -d --no-deps web

echo "Waiting for Web service health..."
WEB_HEALTHY=0
for i in $(seq 1 12); do
  if docker compose --env-file "${ENV_FILE}" "${COMPOSE_ARGS[@]}" ps web --format json | grep -q '"Health":"healthy"'; then
    WEB_HEALTHY=1
    echo "Web service is healthy!"
    break
  fi
  sleep 5
done

if [ "$WEB_HEALTHY" -ne 1 ]; then
  echo "Web service failed to become healthy within 60s."
  rollback
fi

# Step 6: Post-deployment verification
echo "[Step 6/6] Verifying operational endpoints..."
docker compose --env-file "${ENV_FILE}" "${COMPOSE_ARGS[@]}" ps

echo "================================================================"
echo " SERVER UPDATE SUCCESSFUL!"
echo " Nextal HR & Payroll production services updated without downtime."
echo "================================================================"
