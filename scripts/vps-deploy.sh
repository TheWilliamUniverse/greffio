#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/greffio}"
PM2_NAME="${PM2_NAME:-greffio-api}"
BRANCH="${BRANCH:-main}"

echo "[deploy] app dir: ${APP_DIR}"
cd "${APP_DIR}"

echo "[deploy] git fetch + reset ${BRANCH}"
git fetch origin "${BRANCH}"
git reset --hard "origin/${BRANCH}"

echo "[deploy] install production deps"
npm ci --omit=dev

echo "[deploy] run postgres migrations"
npm run db:migrate

echo "[deploy] restart pm2 app"
pm2 restart "${PM2_NAME}" --update-env

echo "[deploy] health check"
curl -fsS "http://127.0.0.1:${PORT:-8787}/api/health" >/dev/null

echo "[deploy] done"
