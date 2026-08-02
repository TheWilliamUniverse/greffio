#!/usr/bin/env bash
set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$OPS_DIR/.env.infrastructure"

[[ -f "$ENV_FILE" ]] || { echo "Fichier absent : $ENV_FILE" >&2; exit 1; }
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${GREFFIO_DB_NAME:?GREFFIO_DB_NAME_REQUIRED}"
: "${GREFFIO_DB_USER:?GREFFIO_DB_USER_REQUIRED}"
: "${GREFFIO_DB_PASSWORD:?GREFFIO_DB_PASSWORD_REQUIRED}"
: "${GARAGE_DEFAULT_ACCESS_KEY:?GARAGE_DEFAULT_ACCESS_KEY_REQUIRED}"
: "${GARAGE_DEFAULT_SECRET_KEY:?GARAGE_DEFAULT_SECRET_KEY_REQUIRED}"
: "${GARAGE_DEFAULT_BUCKET:?GARAGE_DEFAULT_BUCKET_REQUIRED}"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_ROOT="/srv/greffio/backups/$STAMP"
OBJECT_DIR="$BACKUP_ROOT/object-storage"
mkdir -p "$BACKUP_ROOT" "$OBJECT_DIR"

export PGPASSWORD="$GREFFIO_DB_PASSWORD"
pg_dump \
  --host=127.0.0.1 \
  --port=5433 \
  --username="$GREFFIO_DB_USER" \
  --dbname="$GREFFIO_DB_NAME" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --file="$BACKUP_ROOT/postgres.dump"
unset PGPASSWORD

export S3_ADMIN_ENDPOINT=http://127.0.0.1:3900
export S3_REGION=garage
export S3_ACCESS_KEY_ID="$GARAGE_DEFAULT_ACCESS_KEY"
export S3_SECRET_ACCESS_KEY="$GARAGE_DEFAULT_SECRET_KEY"
export S3_BUCKET="$GARAGE_DEFAULT_BUCKET"
export S3_FORCE_PATH_STYLE=true
node "$SCRIPT_DIR/backup-object-storage.mjs" backup "$OBJECT_DIR"
tar -C "$BACKUP_ROOT" -czf "$BACKUP_ROOT/object-storage.tar.gz" object-storage
rm -rf "$OBJECT_DIR"

sha256sum "$BACKUP_ROOT/postgres.dump" "$BACKUP_ROOT/object-storage.tar.gz" > "$BACKUP_ROOT/SHA256SUMS"
pg_restore --list "$BACKUP_ROOT/postgres.dump" >/dev/null
tar -tzf "$BACKUP_ROOT/object-storage.tar.gz" >/dev/null

if [[ -n "${RESTIC_REPOSITORY:-}" && -n "${RESTIC_PASSWORD:-}" ]]; then
  command -v restic >/dev/null || { echo "Restic est configure mais non installe." >&2; exit 1; }
  restic snapshots >/dev/null 2>&1 || restic init
  restic backup "$BACKUP_ROOT" --tag greffio --tag production
  restic forget --prune \
    --keep-daily "${RESTIC_KEEP_DAILY:-7}" \
    --keep-weekly "${RESTIC_KEEP_WEEKLY:-5}" \
    --keep-monthly "${RESTIC_KEEP_MONTHLY:-12}"
else
  echo "AVERTISSEMENT : RESTIC_REPOSITORY/RESTIC_PASSWORD absents, sauvegarde hors VPS non effectuee." >&2
fi

echo "$BACKUP_ROOT"
