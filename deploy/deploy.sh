#!/usr/bin/env bash
set -euo pipefail

# Nextal HR & Payroll — Production Deployment Script (deploy.sh)
# Usage: ./deploy/deploy.sh [.env.production]

ENV_FILE="${1:-.env.production}"

echo "================================================================"
echo " Nextal HR & Payroll — Starting Idempotent Production Deployment"
echo " Environment File: ${ENV_FILE}"
echo " Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "================================================================"

if [ ! -f "${ENV_FILE}" ]; then
  echo "FATAL: Environment file '${ENV_FILE}' not found."
  echo "Copy .env.production.example to ${ENV_FILE} and run node scripts/gen-secrets.mjs."
  exit 1
fi

# Step 1: Preflight Verification
echo "[Step 1/6] Running preflight configuration verification..."
node scripts/preflight-prod.mjs "${ENV_FILE}"

# Step 2: Backup image tags for rollback capability
echo "[Step 2/6] Tagging current running containers for rollback..."
docker tag nextal-api-prod:latest nextal-api-prod:previous 2>/dev/null || true
docker tag nextal-web-prod:latest nextal-web-prod:previous 2>/dev/null || true

# Step 3: Build & start production stack
echo "[Step 3/6] Building and launching production containers with Docker Compose..."
docker compose --env-file "${ENV_FILE}" -f docker-compose.prod.yml build
docker compose --env-file "${ENV_FILE}" -f docker-compose.prod.yml up -d

# Step 4: Run Prisma migrations (NEVER RESET)
echo "[Step 4/6] Applying pending database migrations (prisma migrate deploy)..."
docker compose --env-file "${ENV_FILE}" -f docker-compose.prod.yml exec -T api npx prisma migrate deploy

# Step 4b: Ensure canonical system roles are seeded on fresh databases
echo "[Step 4b] Ensuring system roles catalog is initialized (seed:system)..."
docker compose --env-file "${ENV_FILE}" -f docker-compose.prod.yml exec -T api npm run seed:system

# Step 5: Wait for service health
echo "[Step 5/6] Waiting for services to become healthy..."
MAX_WAIT=60
COUNTER=0
HEALTHY=0
while [ $COUNTER -lt $MAX_WAIT ]; do
  UNHEALTHY=$(docker compose --env-file "${ENV_FILE}" -f docker-compose.prod.yml ps --format json 2>/dev/null | grep -v '"Health":"healthy"' | grep -v '"Health":""' || true)
  if [ -z "$UNHEALTHY" ]; then
    echo "All production services are healthy!"
    HEALTHY=1
    break
  fi
  echo "Waiting for services... ($((COUNTER + 5))s / ${MAX_WAIT}s)"
  sleep 5
  COUNTER=$((COUNTER + 5))
done

if [ "$HEALTHY" -ne 1 ]; then
  echo "FATAL: services not healthy after ${MAX_WAIT}s. Check: docker compose -f docker-compose.prod.yml ps && docker compose -f docker-compose.prod.yml logs --tail=100"
  exit 1
fi

# Step 6: Smoke test production endpoint
echo "[Step 6/6] Executing production smoke test..."
BASE_URL="http://localhost"
if grep -q "DOMAIN=" "${ENV_FILE}"; then
  DOMAIN_VAL=$(grep "^DOMAIN=" "${ENV_FILE}" | cut -d '=' -f2 | tr -d '"' | tr -d "'")
  if [ -n "$DOMAIN_VAL" ] && [ "$DOMAIN_VAL" != "localhost" ]; then
    BASE_URL="https://${DOMAIN_VAL}"
  fi
fi

node scripts/smoke-test-prod.mjs "${BASE_URL}"

echo "================================================================"
echo " DEPLOYMENT SUCCESSFUL!"
echo " Nextal HR & Payroll production stack is operational."
echo "================================================================"

