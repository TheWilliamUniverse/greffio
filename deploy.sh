#!/usr/bin/env bash
set -euo pipefail

cd /opt/greffio
git pull origin main
npm install --omit=dev
pm2 restart greffio-api --update-env
pm2 save
curl -f http://127.0.0.1:8787/api/health

echo "greffio backend deploy: ok"
