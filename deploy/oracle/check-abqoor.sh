#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME=${SERVICE_NAME:-abqoor}
HEALTH_URL=${HEALTH_URL:-http://127.0.0.1:8000/healthz}

echo "Service status"
sudo systemctl status "${SERVICE_NAME}" --no-pager || true

echo
echo "Health endpoint"
curl --fail --silent --show-error "${HEALTH_URL}"
echo

echo
echo "Recent service logs"
sudo journalctl -u "${SERVICE_NAME}" -n 40 --no-pager || true

echo
echo "Nginx config test"
sudo nginx -t
