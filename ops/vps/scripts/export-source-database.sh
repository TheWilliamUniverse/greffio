#!/usr/bin/env bash
set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATION_ENV="$OPS_DIR/.env.migration"
[[ -f "$MIGRATION_ENV" ]] || { echo "Fichier absent : $MIGRATION_ENV" >&2; exit 1; }
set -a
# shellcheck disable=SC1090
source "$MIGRATION_ENV"
set +a
: "${SOURCE_DATABASE_URL:?SOURCE_DATABASE_URL_REQUIRED}"

OUTPUT_DIR="${1:-/srv/greffio/migration/source-$(date -u +%Y%m%dT%H%M%SZ)}"
mkdir -p "$OUTPUT_DIR"

pg_dump "$SOURCE_DATABASE_URL" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --file="$OUTPUT_DIR/source.dump"
pg_dump "$SOURCE_DATABASE_URL" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --file="$OUTPUT_DIR/source-schema.sql"

psql "$SOURCE_DATABASE_URL" -v ON_ERROR_STOP=1 -AtF $'\t' <<'SQL' > "$OUTPUT_DIR/source-inventory.tsv"
SELECT 'database', current_database(), current_user, version();
SELECT 'extension', extname, extversion, '' FROM pg_extension ORDER BY extname;
SELECT 'table', schemaname || '.' || relname, n_live_tup::text, n_dead_tup::text
FROM pg_stat_user_tables ORDER BY schemaname, relname;
SQL

pg_restore --list "$OUTPUT_DIR/source.dump" > "$OUTPUT_DIR/source.dump.list"
sha256sum "$OUTPUT_DIR/source.dump" "$OUTPUT_DIR/source-schema.sql" "$OUTPUT_DIR/source-inventory.tsv" \
  > "$OUTPUT_DIR/SHA256SUMS"
printf '%s\n' "$OUTPUT_DIR"
