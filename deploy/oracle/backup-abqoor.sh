#!/usr/bin/env bash
set -euo pipefail

STORAGE_DIR=${STORAGE_DIR:-/var/lib/abqoor}
BACKUP_DIR=${BACKUP_DIR:-/var/backups/abqoor}
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DB_SOURCE="${STORAGE_DIR}/data/study.db"
DB_BACKUP="${BACKUP_DIR}/study-${TIMESTAMP}.db"
UPLOADS_DIR="${STORAGE_DIR}/uploads"
UPLOADS_BACKUP="${BACKUP_DIR}/uploads-${TIMESTAMP}.tar.gz"

mkdir -p "${BACKUP_DIR}"

if [[ -f "${DB_SOURCE}" ]]; then
    python3 - "${DB_SOURCE}" "${DB_BACKUP}" <<'PY'
import sqlite3
import sys

source_path = sys.argv[1]
backup_path = sys.argv[2]

source = sqlite3.connect(source_path)
try:
    backup = sqlite3.connect(backup_path)
    try:
        source.backup(backup)
    finally:
        backup.close()
finally:
    source.close()
PY
    ln -sfn "${DB_BACKUP}" "${BACKUP_DIR}/latest-study.db"
    echo "Database backup created: ${DB_BACKUP}"
else
    echo "Database file not found at ${DB_SOURCE}; skipping database backup."
fi

if [[ -d "${UPLOADS_DIR}" ]]; then
    tar -czf "${UPLOADS_BACKUP}" -C "${STORAGE_DIR}" uploads
    ln -sfn "${UPLOADS_BACKUP}" "${BACKUP_DIR}/latest-uploads.tar.gz"
    echo "Uploads backup created: ${UPLOADS_BACKUP}"
else
    echo "Uploads directory not found at ${UPLOADS_DIR}; skipping uploads backup."
fi
