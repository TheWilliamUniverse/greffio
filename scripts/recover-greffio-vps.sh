#!/usr/bin/env bash
set -e
pkill -f 'better-sqlite3/build/Release/.deps' 2>/dev/null || true
sleep 1
cd /opt/greffio
if [ -f /tmp/greffio-deploy.tar.gz ]; then
  tar -xzf /tmp/greffio-deploy.tar.gz -C /opt/greffio/
fi
pm2 stop greffio-api 2>/dev/null || true
npm ci --omit=dev --ignore-scripts --no-audit --no-fund
DEPS_DIR="/opt/greffio/node_modules/better-sqlite3/build/Release/.deps/Release/obj.target/sqlite3/gen/sqlite3"
mkdir -p "$DEPS_DIR"
( while true; do mkdir -p "$DEPS_DIR"; sleep 0.05; done ) &
WATCH_PID=$!
cd /opt/greffio/node_modules/better-sqlite3
npx --yes node-gyp rebuild --release
kill "$WATCH_PID" 2>/dev/null || true
cd /opt/greffio
npm run db:migrate
pm2 restart greffio-api --update-env || pm2 start ecosystem.config.cjs --only greffio-api --update-env
sleep 5
curl -fsS http://127.0.0.1:8787/api/health && echo
