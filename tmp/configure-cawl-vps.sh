#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-/opt/greffio/.env}"
CAWL_SECRET_FILE="${2:-/tmp/cawl-secrets.env}"

if [[ ! -f "$CAWL_SECRET_FILE" ]]; then
  echo "Missing secrets file: $CAWL_SECRET_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$CAWL_SECRET_FILE"

upsert_env() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    printf '\n%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

upsert_env CAWL_ENV "${CAWL_ENV:-test}"
upsert_env API_BASE_URL "${API_BASE_URL:-https://api.greffio.willentreprises.com}"
upsert_env APP_URL "${APP_URL:-https://greffio.willentreprises.com}"
upsert_env CAWL_PSPID "${CAWL_PSPID:-}"
upsert_env CAWL_WEBHOOK_ID "${CAWL_WEBHOOK_ID:-}"
upsert_env CAWL_WEBHOOK_SECRET "${CAWL_WEBHOOK_SECRET:-}"
upsert_env CAWL_API_KEY_ID "${CAWL_API_KEY_ID:-}"
upsert_env CAWL_PBX_SITE "${CAWL_PBX_SITE:-1999888}"
upsert_env CAWL_PBX_RANG "${CAWL_PBX_RANG:-32}"
upsert_env CAWL_PBX_IDENTIFIANT "${CAWL_PBX_IDENTIFIANT:-110647233}"
upsert_env CAWL_HMAC_KEY "${CAWL_HMAC_KEY:-}"
upsert_env CAWL_IPN_URL "${CAWL_IPN_URL:-https://api.greffio.willentreprises.com/api/webhooks/cawl}"

echo "--- CAWL vars (masked) ---"
grep '^CAWL_' "$ENV_FILE" | sed -E 's/(SECRET|HMAC_KEY|API_KEY)=.+/\\1=***MASKED***/'

pm2 restart greffio-api --update-env
sleep 3

echo "--- health ---"
curl -fsS "https://api.greffio.willentreprises.com/api/health" && echo

echo "--- webhook worldline (expect 401) ---"
curl -s -o /dev/null -w "worldline POST => %{http_code}\n" \
  -X POST "https://api.greffio.willentreprises.com/api/webhooks/cawl/worldline"

echo "--- webhook etrans IPN (expect not 503) ---"
curl -s -o /dev/null -w "etrans POST => %{http_code}\n" \
  -X POST "https://api.greffio.willentreprises.com/api/webhooks/cawl"

echo "--- done ---"
