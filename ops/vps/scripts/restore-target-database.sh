#!/usr/bin/env bash
set -euo pipefail
umask 077

if [[ "${I_UNDERSTAND_RESTORE:-}" != "YES" ]]; then
  echo "Definir I_UNDERSTAND_RESTORE=YES pour autoriser l'ecrasement de la base cible." >&2
  exit 2
fi
if [[ $# -ne 1 ]]; then
  echo "Usage: restore-target-database.sh /chemin/source.dump" >&2
  exit 2
fi
DUMP_FILE="$(realpath "$1")"
[[ -f "$DUMP_FILE" ]] || { echo "Dump absent : $DUMP_FILE" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATION_ENV="$OPS_DIR/.env.migration"
[[ -f "$MIGRATION_ENV" ]] || { echo "Fichier absent : $MIGRATION_ENV" >&2; exit 1; }
set -a
# shellcheck disable=SC1090
source "$MIGRATION_ENV"
set +a
: "${TARGET_DATABASE_URL:?TARGET_DATABASE_URL_REQUIRED}"

SAFETY_DIR="/srv/greffio/migration/target-before-restore-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$SAFETY_DIR"
pg_dump "$TARGET_DATABASE_URL" --format=custom --compress=9 --no-owner --no-privileges \
  --file="$SAFETY_DIR/target-before-restore.dump"
sha256sum "$SAFETY_DIR/target-before-restore.dump" > "$SAFETY_DIR/SHA256SUMS"

pg_restore \
  --dbname="$TARGET_DATABASE_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --single-transaction \
  "$DUMP_FILE"

psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -Atc "select count(*) from information_schema.tables where table_schema='public';"
echo "Base cible restauree. Sauvegarde precedente : $SAFETY_DIR"
