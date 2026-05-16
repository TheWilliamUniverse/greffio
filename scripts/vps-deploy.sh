#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/greffio}"
PM2_NAME="${PM2_NAME:-greffio-api}"
BRANCH="${BRANCH:-main}"
DEPLOY_META_DIR="${DEPLOY_META_DIR:-${APP_DIR}/.deploy}"
BACKUP_DIR="${BACKUP_DIR:-${DEPLOY_META_DIR}/backups}"

echo "[deploy] app dir: ${APP_DIR}"
cd "${APP_DIR}"

mkdir -p "${BACKUP_DIR}"

if [[ "${1:-}" == "rollback" ]]; then
  if [[ ! -f "${DEPLOY_META_DIR}/previous_commit" ]]; then
    echo "[deploy] rollback impossible: previous_commit introuvable"
    exit 1
  fi
  PREV_COMMIT="$(cat "${DEPLOY_META_DIR}/previous_commit")"
  echo "[deploy] rollback to ${PREV_COMMIT}"
  git fetch origin "${BRANCH}"
  git reset --hard "${PREV_COMMIT}"
else
  CURRENT_COMMIT="$(git rev-parse HEAD)"
  DATE_TAG="$(date +%Y%m%d-%H%M%S)"
  echo "[deploy] backup current release ${CURRENT_COMMIT}"
  mkdir -p "${DEPLOY_META_DIR}"
  echo "${CURRENT_COMMIT}" > "${DEPLOY_META_DIR}/previous_commit"
  git archive --format=tar "${CURRENT_COMMIT}" -o "${BACKUP_DIR}/greffio-${DATE_TAG}-${CURRENT_COMMIT:0:7}.tar"

  echo "[deploy] git fetch + reset ${BRANCH}"
  git fetch origin "${BRANCH}"
  git reset --hard "origin/${BRANCH}"
fi

echo "[deploy] install production deps"
npm ci --omit=dev

echo "[deploy] run postgres migrations"
npm run db:migrate

echo "[deploy] restart pm2 app"
if [[ -f "ecosystem.config.cjs" ]]; then
  pm2 startOrReload ecosystem.config.cjs --update-env
else
  pm2 restart "${PM2_NAME}" --update-env
fi

echo "[deploy] health check"
curl -fsS "http://127.0.0.1:${PORT:-8787}/api/health" >/dev/null
curl -fsS "http://127.0.0.1:${PORT:-8787}/api/ready" >/dev/null

echo "[deploy] done"
