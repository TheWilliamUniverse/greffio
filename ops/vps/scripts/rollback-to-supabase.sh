#!/usr/bin/env bash
set -euo pipefail
umask 077

if [[ "${I_UNDERSTAND_ROLLBACK:-}" != "YES" ]]; then
  echo "Definir I_UNDERSTAND_ROLLBACK=YES pour restaurer l'environnement precedent." >&2
  exit 2
fi

STATE_DIR="${1:-}"
if [[ -z "$STATE_DIR" ]]; then
  STATE_DIR="$(find /srv/greffio/migration -maxdepth 1 -type d -name 'cutover-*' | sort -r | head -n 1)"
fi
[[ -n "$STATE_DIR" && -f "$STATE_DIR/app.env.before" ]] || { echo "Etat de bascule introuvable." >&2; exit 1; }

pm2 stop greffio-api >/dev/null 2>&1 || true
cp "$STATE_DIR/app.env.before" /opt/greffio/.env
chmod 600 /opt/greffio/.env
cd /opt/greffio
pm2 restart greffio-api --update-env >/dev/null || pm2 start ecosystem.config.cjs --only greffio-api --update-env >/dev/null
sleep 4
curl -fsS http://127.0.0.1:8787/api/health

echo
echo "Retour a l'environnement precedent effectue."
echo "ATTENTION : les ecritures creees apres la bascule sur le VPS ne sont pas resynchronisees automatiquement vers Supabase."
