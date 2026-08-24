#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$OPS_DIR/.env.infrastructure"
COMPOSE_FILE="$OPS_DIR/compose.yml"

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "Executer ce script en root." >&2
  exit 1
fi
command -v docker >/dev/null || { echo "Docker est requis." >&2; exit 1; }
docker compose version >/dev/null || { echo "Docker Compose v2 est requis." >&2; exit 1; }
command -v openssl >/dev/null || { echo "OpenSSL est requis." >&2; exit 1; }

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$OPS_DIR/.env.infrastructure.example" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "Fichier cree : $ENV_FILE. Renseignez les secrets puis relancez." >&2
  exit 1
fi
chmod 600 "$ENV_FILE"
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

required=(
  POSTGRES_ADMIN_USER POSTGRES_ADMIN_PASSWORD GREFFIO_DB_NAME GREFFIO_DB_USER GREFFIO_DB_PASSWORD
  GARAGE_RPC_SECRET GARAGE_ADMIN_TOKEN GARAGE_METRICS_TOKEN
  GARAGE_DEFAULT_ACCESS_KEY GARAGE_DEFAULT_SECRET_KEY GARAGE_DEFAULT_BUCKET
)
for key in "${required[@]}"; do
  value="${!key:-}"
  if [[ -z "$value" || "$value" == *CHANGE_ME* ]]; then
    echo "Variable absente ou non remplacee : $key" >&2
    exit 1
  fi
done

if [[ ! "$GARAGE_RPC_SECRET" =~ ^[0-9a-fA-F]{64}$ ]]; then
  echo "GARAGE_RPC_SECRET doit contenir exactement 64 caracteres hexadecimaux." >&2
  exit 1
fi
if [[ ! "$GARAGE_ADMIN_TOKEN" =~ ^[0-9a-fA-F]{64}$ || ! "$GARAGE_METRICS_TOKEN" =~ ^[0-9a-fA-F]{64}$ ]]; then
  echo "Les jetons Garage admin/metrics doivent contenir 64 caracteres hexadecimaux." >&2
  exit 1
fi
if [[ ! "$GARAGE_DEFAULT_ACCESS_KEY" =~ ^GK[A-Za-z0-9]{8,}$ ]]; then
  echo "GARAGE_DEFAULT_ACCESS_KEY doit commencer par GK." >&2
  exit 1
fi

install -d -m 0700 /srv/greffio/postgres /srv/greffio/postgres-certs
install -d -m 0700 /srv/greffio/garage/config /srv/greffio/garage/meta /srv/greffio/garage/data
install -d -m 0700 /srv/greffio/backups

CERT_DIR=/srv/greffio/postgres-certs
if [[ ! -f "$CERT_DIR/server.key" || ! -f "$CERT_DIR/server.crt" ]]; then
  openssl req -new -x509 -nodes -days 825 -newkey rsa:4096 \
    -subj "/CN=greffio-postgres" \
    -addext "subjectAltName=DNS:postgres,DNS:greffio-postgres,IP:127.0.0.1" \
    -keyout "$CERT_DIR/server.key" \
    -out "$CERT_DIR/server.crt"
fi
chown -R 999:999 "$CERT_DIR"
chmod 600 "$CERT_DIR/server.key"
chmod 644 "$CERT_DIR/server.crt"

cat > /srv/greffio/garage/config/garage.toml <<GARAGE_CONFIG
metadata_dir = "/var/lib/garage/meta"
data_dir = "/var/lib/garage/data"
db_engine = "sqlite"
replication_factor = 1

rpc_bind_addr = "[::]:3901"
rpc_public_addr = "127.0.0.1:3901"
rpc_secret = "$GARAGE_RPC_SECRET"

[s3_api]
s3_region = "garage"
api_bind_addr = "[::]:3900"
root_domain = ".s3.storage.greffio.willentreprises.com"

[admin]
api_bind_addr = "[::]:3903"
admin_token = "$GARAGE_ADMIN_TOKEN"
metrics_token = "$GARAGE_METRICS_TOKEN"
GARAGE_CONFIG
chmod 600 /srv/greffio/garage/config/garage.toml

cd "$OPS_DIR"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d

echo "Attente de PostgreSQL..."
for _ in $(seq 1 45); do
  if docker exec \
    -e PGPASSWORD="$POSTGRES_ADMIN_PASSWORD" \
    -e PGSSLMODE=require \
    greffio-postgres \
    psql -h 127.0.0.1 -U "$POSTGRES_ADMIN_USER" -d postgres -Atc 'select 1' \
    >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
docker exec \
  -e PGPASSWORD="$POSTGRES_ADMIN_PASSWORD" \
  -e PGSSLMODE=require \
  greffio-postgres \
  psql -h 127.0.0.1 -U "$POSTGRES_ADMIN_USER" -d postgres -Atc 'select 1' \
  >/dev/null

echo "Attente de Garage..."
for _ in $(seq 1 30); do
  if docker exec greffio-garage /garage status >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
docker exec greffio-garage /garage status

echo "Infrastructure locale active."
echo "PostgreSQL : 127.0.0.1:5433 (TLS)"
echo "Garage S3 : 127.0.0.1:3900"
echo "Garage Admin : 127.0.0.1:3903 (ne pas exposer publiquement)"
