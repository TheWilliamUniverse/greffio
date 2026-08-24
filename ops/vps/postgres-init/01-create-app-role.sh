#!/usr/bin/env bash
set -euo pipefail

: "${POSTGRES_USER:?POSTGRES_USER_REQUIRED}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD_REQUIRED}"
: "${GREFFIO_DB_NAME:?GREFFIO_DB_NAME_REQUIRED}"
: "${GREFFIO_DB_USER:?GREFFIO_DB_USER_REQUIRED}"
: "${GREFFIO_DB_PASSWORD:?GREFFIO_DB_PASSWORD_REQUIRED}"

export PGPASSWORD="$POSTGRES_PASSWORD"
export PGSSLMODE=disable

psql --set=ON_ERROR_STOP=1 \
  --host=/var/run/postgresql \
  --username "$POSTGRES_USER" \
  --dbname postgres \
  --set=app_user="$GREFFIO_DB_USER" \
  --set=app_password="$GREFFIO_DB_PASSWORD" \
  --set=app_database="$GREFFIO_DB_NAME" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'app_user', :'app_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_user')
\gexec

SELECT format('CREATE DATABASE %I OWNER %I', :'app_database', :'app_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'app_database')
\gexec
SQL

psql --set=ON_ERROR_STOP=1 \
  --host=/var/run/postgresql \
  --username "$POSTGRES_USER" \
  --dbname "$GREFFIO_DB_NAME" \
  --set=app_user="$GREFFIO_DB_USER" <<'SQL'
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
SELECT format('GRANT USAGE, CREATE ON SCHEMA public TO %I', :'app_user')
\gexec
SQL

unset PGPASSWORD PGSSLMODE
