#!/usr/bin/env sh
set -eu

# Nextal HR & Payroll — Production Healthcheck Monitor Probe
# Designed for external monitors (Uptime Kuma, Pingdom, BetterStack, Datadog)
# or local container health monitoring scripts.
#
# Usage:
#   ./deploy/healthcheck.sh [TARGET_URL] [--json] [--quiet]
# Example:
#   ./deploy/healthcheck.sh https://payroll.example.ae
#   ./deploy/healthcheck.sh https://localhost -k

TARGET_URL="${1:-https://localhost}"
CURL_OPTS="-s -S --max-time 10"

# Allow insecure TLS if -k flag passed or targeting localhost
for arg in "$@"; do
  if [ "$arg" = "-k" ] || [ "$arg" = "--insecure" ]; then
    CURL_OPTS="${CURL_OPTS} -k"
  fi
done

case "$TARGET_URL" in
  *localhost*|*127.0.0.1*)
    CURL_OPTS="${CURL_OPTS} -k"
    ;;
esac

HEALTH_ENDPOINT="${TARGET_URL}/api/v1/health"
LOGIN_ENDPOINT="${TARGET_URL}/login"

# 1. Probe API Health endpoint
HTTP_STATUS=$(curl ${CURL_OPTS} -o /tmp/health_body.json -w "%{http_code}" "$HEALTH_ENDPOINT" 2>/dev/null || echo "000")

if [ "$HTTP_STATUS" != "200" ]; then
  echo "FAIL: API healthcheck failed with HTTP status ${HTTP_STATUS} (endpoint: ${HEALTH_ENDPOINT})" >&2
  exit 1
fi

# Verify JSON payload confirms DB connectivity
if ! grep -q '"status":"ok"' /tmp/health_body.json 2>/dev/null || ! grep -q '"database":"connected"' /tmp/health_body.json 2>/dev/null; then
  echo "FAIL: API responded HTTP 200 but reported unhealthy state or disconnected database." >&2
  cat /tmp/health_body.json >&2
  exit 1
fi

# 2. Probe Web frontend login page
WEB_STATUS=$(curl ${CURL_OPTS} -o /dev/null -w "%{http_code}" "$LOGIN_ENDPOINT" 2>/dev/null || echo "000")

if [ "$WEB_STATUS" != "200" ]; then
  echo "FAIL: Frontend web server failed with HTTP status ${WEB_STATUS} (endpoint: ${LOGIN_ENDPOINT})" >&2
  exit 1
fi

rm -f /tmp/health_body.json

echo "OK: Nextal HR & Payroll cluster healthy at ${TARGET_URL} (API: 200/ok, Web: 200)"
exit 0
