#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
    echo "Run this script as root or with sudo."
    exit 1
fi

if [[ $# -lt 2 ]]; then
    echo "Usage: sudo bash deploy/oracle/enable-https.sh <domain> <email>"
    echo "Example: sudo bash deploy/oracle/enable-https.sh app.example.com admin@example.com"
    exit 1
fi

DOMAIN=$1
EMAIL=$2
NGINX_SITE=${NGINX_SITE:-/etc/nginx/sites-available/abqoor}
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
DOMAIN_TEMPLATE="${SCRIPT_DIR}/nginx-abqoor-domain.conf"

if [[ ! -f "${DOMAIN_TEMPLATE}" ]]; then
    echo "Missing template: ${DOMAIN_TEMPLATE}"
    exit 1
fi

apt-get update
apt-get install -y certbot python3-certbot-nginx

python3 - "${DOMAIN_TEMPLATE}" "${NGINX_SITE}" "${DOMAIN}" <<'PY'
from pathlib import Path
import sys

template_path = Path(sys.argv[1])
target_path = Path(sys.argv[2])
domain = sys.argv[3]

text = template_path.read_text(encoding="utf-8")
text = text.replace("__DOMAIN__", domain)
target_path.write_text(text, encoding="utf-8")
PY

nginx -t
systemctl reload nginx

certbot --nginx --non-interactive --agree-tos --redirect -m "${EMAIL}" -d "${DOMAIN}"

nginx -t
systemctl reload nginx

echo
echo "HTTPS is now configured for ${DOMAIN}."
echo "Check the certificate and live site in the browser."
