#!/usr/bin/env bash
set -euo pipefail

# Nextal HR & Payroll — Production Rollback Script (rollback.sh)
# Usage: ./deploy/rollback.sh [.env.production]

ENV_FILE="${1:-.env.production}"

echo "================================================================"
echo " Nextal HR & Payroll — Initiating Production Rollback"
echo " Environment File: ${ENV_FILE}"
echo "================================================================"

if [ ! -f "${ENV_FILE}" ]; then
  echo "FATAL: Environment file '${ENV_FILE}' not found."
  exit 1
fi

if ! docker image inspect nextal-api-prod:previous >/dev/null 2>&1; then
  echo "FATAL: No previous image tag found for nextal-api-prod:previous. Cannot auto-rollback."
  exit 1
fi

echo "Rolling back image tags..."
docker tag nextal-api-prod:previous nextal-api-prod:latest
docker tag nextal-web-prod:previous nextal-web-prod:latest

echo "Restarting services with previous images..."
docker compose --env-file "${ENV_FILE}" -f docker-compose.prod.yml up -d --no-build

echo "Waiting for health checks..."
sleep 10
docker compose --env-file "${ENV_FILE}" -f docker-compose.prod.yml ps

echo "================================================================"
echo " Rollback completed. Please verify service health and review logs."
echo "================================================================"

