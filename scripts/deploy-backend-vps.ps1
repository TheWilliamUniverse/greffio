# Déploiement backend Greffio sur le VPS (à lancer en local si GitHub Actions indisponible).
# Prérequis : accès SSH root@187.127.232.210 (clé ou mot de passe).

$ErrorActionPreference = 'Stop'
$VpsHost = if ($env:GREFFIO_VPS_HOST) { $env:GREFFIO_VPS_HOST } else { '187.127.232.210' }
$VpsUser = if ($env:GREFFIO_VPS_USER) { $env:GREFFIO_VPS_USER } else { 'root' }

$RemoteScript = @'
set -euo pipefail
cd /opt/greffio
git fetch origin main
git reset --hard origin/main
npm ci --omit=dev
npm run db:migrate
npm run db:check
pm2 restart greffio-api --update-env
pm2 save
echo "Deployed commit: $(git rev-parse --short HEAD)"
curl -fsS http://127.0.0.1:8787/api/health
curl -fsS http://127.0.0.1:8787/api/ready
'@

Write-Host "Connexion à ${VpsUser}@${VpsHost} ..."
ssh "${VpsUser}@${VpsHost}" $RemoteScript
Write-Host "Deploy backend terminé."
