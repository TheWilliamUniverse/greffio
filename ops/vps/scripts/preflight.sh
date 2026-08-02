#!/usr/bin/env bash
set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$OPS_DIR/../.." && pwd)"
INFRA_ENV="$OPS_DIR/.env.infrastructure"
MIGRATION_ENV="$OPS_DIR/.env.migration"

for file in "$INFRA_ENV" "$MIGRATION_ENV"; do
  [[ -f "$file" ]] || { echo "Fichier absent : $file" >&2; exit 1; }
done
set -a
# shellcheck disable=SC1090
source "$INFRA_ENV"
# shellcheck disable=SC1090
source "$MIGRATION_ENV"
set +a

required=(SOURCE_DATABASE_URL TARGET_DATABASE_URL TARGET_APP_ENV_FILE)
for key in "${required[@]}"; do
  [[ -n "${!key:-}" && "${!key}" != *CHANGE_ME* ]] || { echo "Variable invalide : $key" >&2; exit 1; }
done

for command in docker psql pg_dump pg_restore node npm curl openssl; do
  command -v "$command" >/dev/null || { echo "Commande manquante : $command" >&2; exit 1; }
done

echo "=== Ressources VPS ==="
df -h / /srv/greffio 2>/dev/null || df -h /
free -h || true
nproc || true

echo "=== Conteneurs ==="
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
docker exec greffio-postgres pg_isready -U "$POSTGRES_ADMIN_USER" -d postgres
docker exec greffio-garage /garage status

echo "=== Connexion base source ==="
psql "$SOURCE_DATABASE_URL" -v ON_ERROR_STOP=1 -Atc "select current_database(), current_user, version();"
psql "$SOURCE_DATABASE_URL" -v ON_ERROR_STOP=1 -Atc "select extname || '=' || extversion from pg_extension order by extname;" \
  | tee /srv/greffio/migration-source-extensions.txt

echo "=== Connexion base cible ==="
PGSSLMODE=require psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -Atc \
  "select current_database(), current_user, version(), current_setting('ssl');"

echo "=== Audit statique Supabase ==="
cd "$REPO_ROOT"
node scripts/audit-supabase-usage.mjs || true

echo "=== Fichier environnement cible ==="
[[ -f "$TARGET_APP_ENV_FILE" ]] || { echo "Fichier cible absent : $TARGET_APP_ENV_FILE" >&2; exit 1; }
chmod 600 "$TARGET_APP_ENV_FILE"
if grep -Eq '^[[:space:]]*(SUPABASE_|VITE_SUPABASE_)' "$TARGET_APP_ENV_FILE"; then
  echo "Le fichier cible contient encore des variables Supabase." >&2
  exit 1
fi
for key in DATABASE_URL DATABASE_SSL DOCUMENT_STORAGE_DRIVER S3_ENDPOINT S3_ACCESS_KEY_ID S3_SECRET_ACCESS_KEY S3_BUCKET; do
  grep -q "^${key}=" "$TARGET_APP_ENV_FILE" || { echo "Variable absente du fichier cible : $key" >&2; exit 1; }
done

echo "Preflight termine sans blocage technique immediat."
