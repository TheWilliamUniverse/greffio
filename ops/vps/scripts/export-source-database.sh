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

# Greffio n'utilise ni Supabase Auth, ni les schemas Storage/Realtime internes.
# Exporter uniquement public evite d'importer les schemas et roles specifiques a Supabase
# dans le PostgreSQL standard du VPS.
pg_dump "$SOURCE_DATABASE_URL" \
  --schema=public \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --file="$OUTPUT_DIR/source.dump"
pg_dump "$SOURCE_DATABASE_URL" \
  --schema=public \
  --schema-only \
  --no-owner \
  --no-privileges \
  --file="$OUTPUT_DIR/source-schema.sql"

psql "$SOURCE_DATABASE_URL" -v ON_ERROR_STOP=1 -AtF $'\t' <<'SQL' > "$OUTPUT_DIR/source-inventory.tsv"
SELECT 'database', current_database(), current_user, version();
SELECT 'extension', extname, extversion, '' FROM pg_extension ORDER BY extname;
SELECT 'table', schemaname || '.' || relname, n_live_tup::text, n_dead_tup::text
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY schemaname, relname;
SQL

pg_restore --list "$OUTPUT_DIR/source.dump" > "$OUTPUT_DIR/source.dump.list"
if grep -Eq 'SCHEMA - (auth|storage|realtime|supabase_functions|vault)' "$OUTPUT_DIR/source.dump.list"; then
  echo "Le dump contient un schema interne Supabase inattendu." >&2
  exit 1
fi
sha256sum "$OUTPUT_DIR/source.dump" "$OUTPUT_DIR/source-schema.sql" "$OUTPUT_DIR/source-inventory.tsv" \
  > "$OUTPUT_DIR/SHA256SUMS"
printf '%s\n' "$OUTPUT_DIR"
