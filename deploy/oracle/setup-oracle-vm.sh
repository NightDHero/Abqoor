#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
    echo "Run this script as root or with sudo."
    exit 1
fi

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "${SCRIPT_DIR}/../.." && pwd)

APP_USER=${APP_USER:-abqoor}
APP_DIR=${APP_DIR:-/opt/abqoor/app}
STORAGE_DIR=${STORAGE_DIR:-/var/lib/abqoor}
ENV_DIR=${ENV_DIR:-/etc/abqoor}
ENV_FILE=${ENV_FILE:-${ENV_DIR}/abqoor.env}
SERVICE_NAME=${SERVICE_NAME:-abqoor}
NGINX_SITE=${NGINX_SITE:-/etc/nginx/sites-available/abqoor}

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y python3 python3-venv python3-pip nginx nodejs npm rsync curl

if ! id -u "${APP_USER}" >/dev/null 2>&1; then
    useradd --system --create-home --home-dir /opt/abqoor --shell /usr/sbin/nologin "${APP_USER}"
fi

mkdir -p "${APP_DIR}" "${STORAGE_DIR}/data" "${STORAGE_DIR}/uploads" "${ENV_DIR}"

rsync -a --delete \
    --exclude '.git' \
    --exclude '.venv' \
    --exclude '__pycache__' \
    --exclude 'data/study.db' \
    --exclude 'uploads/' \
    "${REPO_ROOT}/" "${APP_DIR}/"

python3 -m venv "${APP_DIR}/.venv"
"${APP_DIR}/.venv/bin/pip" install --upgrade pip
"${APP_DIR}/.venv/bin/pip" install -r "${APP_DIR}/requirements.txt"

if [[ -f "${APP_DIR}/package.json" ]]; then
    pushd "${APP_DIR}" >/dev/null
    npm install
    npm run build
    popd >/dev/null
fi

if [[ ! -f "${ENV_FILE}" ]]; then
    cp "${APP_DIR}/deploy/oracle/abqoor.env.example" "${ENV_FILE}"
fi

python3 - "${ENV_FILE}" "${STORAGE_DIR}" <<'PY'
from pathlib import Path
import sys

env_path = Path(sys.argv[1])
storage_dir = sys.argv[2]
text = env_path.read_text(encoding="utf-8")
if "ABQOOR_STORAGE_DIR=/var/lib/abqoor" in text:
    text = text.replace("ABQOOR_STORAGE_DIR=/var/lib/abqoor", f"ABQOOR_STORAGE_DIR={storage_dir}")
env_path.write_text(text, encoding="utf-8")
PY

python3 - "${APP_DIR}/deploy/oracle/abqoor.service" "/etc/systemd/system/${SERVICE_NAME}.service" "${APP_USER}" "${APP_DIR}" "${ENV_FILE}" <<'PY'
from pathlib import Path
import sys

template_path = Path(sys.argv[1])
target_path = Path(sys.argv[2])
app_user = sys.argv[3]
app_dir = sys.argv[4]
env_file = sys.argv[5]

text = template_path.read_text(encoding="utf-8")
text = text.replace("__APP_USER__", app_user)
text = text.replace("__APP_DIR__", app_dir)
text = text.replace("__ENV_FILE__", env_file)
target_path.write_text(text, encoding="utf-8")
PY

cp "${APP_DIR}/deploy/oracle/nginx-abqoor.conf" "${NGINX_SITE}"
ln -sf "${NGINX_SITE}" /etc/nginx/sites-enabled/abqoor
rm -f /etc/nginx/sites-enabled/default

chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}" "${STORAGE_DIR}"
chmod 640 "${ENV_FILE}"
chown root:"${APP_USER}" "${ENV_FILE}"

nginx -t
systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
systemctl restart nginx

if grep -q 'replace-with-' "${ENV_FILE}"; then
    echo
    echo "The service was installed but not started because ${ENV_FILE} still contains placeholder secrets."
    echo "Edit the file first, then run: systemctl restart ${SERVICE_NAME}"
    exit 0
fi

systemctl restart "${SERVICE_NAME}"

echo
echo "Oracle VM deployment files are installed."
echo "1. Edit ${ENV_FILE} and add your real TELEGRAM_BOT_TOKEN and ADMIN_PASSWORD."
echo "2. Run: systemctl restart ${SERVICE_NAME}"
echo "3. Check: systemctl status ${SERVICE_NAME} --no-pager"
