#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

if [[ "${I_UNDERSTAND_CUTOVER:-}" != "YES" ]]; then
  echo "Definir I_UNDERSTAND_CUTOVER=YES apres une repetition complete validee." >&2
  exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$OPS_DIR/../.." && pwd)"
INFRA_ENV="$OPS_DIR/.env.infrastructure"
MIGRATION_ENV="$OPS_DIR/.env.migration"
APP_ENV="/opt/greffio/.env"

for file in "$INFRA_ENV" "$MIGRATION_ENV" "$APP_ENV"; do
  [[ -f "$file" ]] || { echo "Fichier absent : $file" >&2; exit 1; }
done
set -a
# shellcheck disable=SC1090
source "$INFRA_ENV"
# shellcheck disable=SC1090
source "$MIGRATION_ENV"
set +a

: "${SOURCE_DATABASE_URL:?SOURCE_DATABASE_URL_REQUIRED}"
: "${TARGET_DATABASE_URL:?TARGET_DATABASE_URL_REQUIRED}"
: "${TARGET_APP_ENV_FILE:?TARGET_APP_ENV_FILE_REQUIRED}"
: "${MIGRATION_SUPABASE_URL:?MIGRATION_SUPABASE_URL_REQUIRED}"
: "${MIGRATION_SUPABASE_SERVICE_ROLE_KEY:?MIGRATION_SUPABASE_SERVICE_ROLE_KEY_REQUIRED}"
[[ -f "$TARGET_APP_ENV_FILE" ]] || { echo "Fichier cible absent : $TARGET_APP_ENV_FILE" >&2; exit 1; }
if grep -Eq '^[[:space:]]*(SUPABASE_|VITE_SUPABASE_)' "$TARGET_APP_ENV_FILE"; then
  echo "Le fichier cible contient encore des variables Supabase." >&2
  exit 1
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STATE_DIR="/srv/greffio/migration/cutover-$STAMP"
mkdir -p "$STATE_DIR"
cp "$APP_ENV" "$STATE_DIR/app.env.before"
chmod 600 "$STATE_DIR/app.env.before"

ROLLED_BACK=0
rollback_on_error() {
  local exit_code=$?
  if [[ $ROLLED_BACK -eq 0 ]]; then
    echo "Echec de bascule : restauration de l'environnement precedent." >&2
    cp "$STATE_DIR/app.env.before" "$APP_ENV"
    chmod 600 "$APP_ENV"
    (cd /opt/greffio && pm2 restart greffio-api --update-env >/dev/null 2>&1) || true
    ROLLED_BACK=1
  fi
  exit "$exit_code"
}
trap rollback_on_error ERR

"$SCRIPT_DIR/preflight.sh"

echo "Arret des ecritures API..."
pm2 stop greffio-api >/dev/null

SOURCE_DIR="$STATE_DIR/source-final"
"$SCRIPT_DIR/export-source-database.sh" "$SOURCE_DIR" >/dev/null

export I_UNDERSTAND_RESTORE=YES
"$SCRIPT_DIR/restore-target-database.sh" "$SOURCE_DIR/source.dump"
unset I_UNDERSTAND_RESTORE

SOURCE_STORAGE_URL="$MIGRATION_SUPABASE_URL"
SOURCE_STORAGE_KEY="$MIGRATION_SUPABASE_SERVICE_ROLE_KEY"
set -a
# shellcheck disable=SC1090
source "$TARGET_APP_ENV_FILE"
set +a
export NODE_ENV=migration
export DATABASE_URL="$TARGET_DATABASE_URL"
export MIGRATION_SUPABASE_URL="$SOURCE_STORAGE_URL"
export MIGRATION_SUPABASE_SERVICE_ROLE_KEY="$SOURCE_STORAGE_KEY"

cd "$REPO_ROOT"
npm run db:migrate
node server/scripts/audit-supabase-storage-references.js --strict
node server/scripts/migrate-supabase-storage-to-s3.js --apply --limit=100000
node server/scripts/audit-supabase-storage-references.js --strict --require-zero

cp "$TARGET_APP_ENV_FILE" "$APP_ENV"
chmod 600 "$APP_ENV"
unset NODE_ENV

cd /opt/greffio
pm2 restart greffio-api --update-env >/dev/null || pm2 start ecosystem.config.cjs --only greffio-api --update-env >/dev/null
pm2 save >/dev/null
sleep 5
curl -fsS http://127.0.0.1:8787/api/health > "$STATE_DIR/health.json"
curl -fsS http://127.0.0.1:8787/api/ready > "$STATE_DIR/ready.json"

cat > "$STATE_DIR/state.txt" <<STATE
status=completed
completed_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
old_env=$STATE_DIR/app.env.before
source_dump=$SOURCE_DIR/source.dump
target_env=$TARGET_APP_ENV_FILE
STATE
chmod 600 "$STATE_DIR/state.txt"
trap - ERR

echo "Bascule terminee. Etat : $STATE_DIR"
echo "Ne supprimez pas Supabase avant la validation fonctionnelle et un test de restauration complet."
