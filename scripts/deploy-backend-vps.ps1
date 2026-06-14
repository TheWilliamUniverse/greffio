# Deploiement backend Greffio sur le VPS Hostinger (api.greffio.willentreprises.com).
#
# Strategie : packager le code local (server/, package.json, ...) en tarball, l'envoyer
# par SCP, l'extraire dans /opt/greffio (en remplacant uniquement les artefacts de code,
# sans toucher au .env ni a node_modules), puis lancer npm ci + migrations + pm2 restart.
#
# Pourquoi pas `git pull` ? Le repertoire /opt/greffio sur le VPS n'est PAS un clone git
# (c'est un staging directory). Le tarball garantit une copie exacte du code local sans
# dependre d'un acces GitHub depuis le VPS (pas de PAT a stocker cote serveur).
#
# Prerequis (poste local Windows) :
#   - tar.exe (inclus dans Windows 10+ depuis 1803)
#   - pscp.exe / plink.exe (PuTTY) OU ssh.exe / scp.exe (OpenSSH natif Windows)
#   - Variables d'env :
#       GREFFIO_VPS_HOST       (defaut : 187.127.232.210)
#       GREFFIO_VPS_USER       (defaut : root)
#       GREFFIO_VPS_PASSWORD   (mot de passe SSH, obligatoire si pas de cle)
#       GREFFIO_VPS_HOSTKEY    (empreinte SHA256, optionnel mais recommande pour batch)
#
# Usage typique :
#   $env:GREFFIO_VPS_PASSWORD = '...'
#   pwsh -File scripts/deploy-backend-vps.ps1
#
# Le script est idempotent : il fait un backup horodate de l'ancien code avant chaque run.

$ErrorActionPreference = 'Stop'

$VpsHost     = if ($env:GREFFIO_VPS_HOST)     { $env:GREFFIO_VPS_HOST }     else { '187.127.232.210' }
$VpsUser     = if ($env:GREFFIO_VPS_USER)     { $env:GREFFIO_VPS_USER }     else { 'root' }
$VpsHostKey  = if ($env:GREFFIO_VPS_HOSTKEY)  { $env:GREFFIO_VPS_HOSTKEY }  else { 'ssh-ed25519 255 SHA256:Qd5mZUU4rWubKmIVp/5+4m1xqObBQi3ZVBoFz8wKQGc' }
$VpsPassword = $env:GREFFIO_VPS_PASSWORD

if (-not $VpsPassword) {
    $secretPath = Join-Path $env:USERPROFILE 'Desktop\SECRET\VPS.txt'
    if (Test-Path $secretPath) {
        $secretContent = Get-Content $secretPath -Raw
        if ($secretContent -match 'MDP\s*:\s*(.+)') {
            $VpsPassword = $Matches[1].Trim()
        }
    }
}

if (-not $VpsPassword) {
    Write-Host "GREFFIO_VPS_PASSWORD absent : tentative via cle SSH (OpenSSH natif)." -ForegroundColor Yellow
}

$RepoRoot = Split-Path -Parent $PSScriptRoot
$Staging  = Join-Path $env:TEMP "greffio-deploy"
$TarFile  = Join-Path $env:TEMP "greffio-deploy.tar.gz"

Write-Host "=== 1) Preparation staging local ==="
if (Test-Path $Staging) { Remove-Item -Recurse -Force $Staging }
New-Item -ItemType Directory -Force -Path $Staging | Out-Null

robocopy "$RepoRoot\server" "$Staging\server" /E /XD __pycache__ tests-tmp /NFL /NDL /NJH /NJS /NP | Out-Null
if (Test-Path "$RepoRoot\scripts") {
    robocopy "$RepoRoot\scripts" "$Staging\scripts" /E /NFL /NDL /NJH /NJS /NP | Out-Null
}
if (Test-Path "$RepoRoot\docs") {
    robocopy "$RepoRoot\docs" "$Staging\docs" /E /NFL /NDL /NJH /NJS /NP | Out-Null
}
Copy-Item -Path "$RepoRoot\package.json"      -Destination $Staging
Copy-Item -Path "$RepoRoot\package-lock.json" -Destination $Staging
if (Test-Path "$RepoRoot\ecosystem.config.cjs") {
    Copy-Item -Path "$RepoRoot\ecosystem.config.cjs" -Destination $Staging
}

if (Test-Path $TarFile) { Remove-Item $TarFile -Force }
& tar.exe -czf "$TarFile" -C "$Staging" "server" "scripts" "docs" "package.json" "package-lock.json" "ecosystem.config.cjs"
$tarSize = (Get-Item $TarFile).Length
Write-Host "Tarball : $TarFile ($([math]::Round($tarSize/1MB,2)) MB)"

$plink = 'C:\Program Files\PuTTY\plink.exe'
$pscp  = 'C:\Program Files\PuTTY\pscp.exe'
$usePutty = (Test-Path $plink) -and (Test-Path $pscp) -and $VpsPassword

function Invoke-RemoteShell {
    param([string]$RemoteCommand)
    if ($usePutty) {
        & $plink -batch -ssh -hostkey "$VpsHostKey" "$VpsUser@$VpsHost" -pw "$VpsPassword" $RemoteCommand
    } else {
        & ssh -o StrictHostKeyChecking=accept-new "$VpsUser@$VpsHost" $RemoteCommand
    }
    if ($LASTEXITCODE -ne 0) { throw "Remote command failed (exit $LASTEXITCODE)" }
}

function Invoke-RemoteUpload {
    param([string]$LocalPath, [string]$RemotePath)
    if ($usePutty) {
        & $pscp -batch -hostkey "$VpsHostKey" -pw "$VpsPassword" "$LocalPath" "$VpsUser@${VpsHost}:$RemotePath"
    } else {
        & scp -o StrictHostKeyChecking=accept-new "$LocalPath" "$VpsUser@${VpsHost}:$RemotePath"
    }
    if ($LASTEXITCODE -ne 0) { throw "Upload failed (exit $LASTEXITCODE)" }
}

Write-Host ""
Write-Host "=== 2) Upload tarball vers VPS ==="
Invoke-RemoteUpload -LocalPath $TarFile -RemotePath '/tmp/greffio-deploy.tar.gz'

Write-Host ""
Write-Host "=== 3) Deploiement distant (backup + extraction + npm ci + migrate + pm2 restart) ==="
$RemoteScript = @'
set -e
cd /opt/greffio
STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP="/opt/greffio-backup-$STAMP"
mkdir -p "$BACKUP"
cp -r server "$BACKUP/server"
cp package.json package-lock.json ecosystem.config.cjs "$BACKUP/" 2>/dev/null || true
cp -r scripts "$BACKUP/scripts" 2>/dev/null || true
cp -r docs "$BACKUP/docs" 2>/dev/null || true
echo "Backup : $BACKUP"
rm -rf server/routes server/config server/payments server/migrations
tar -xzf /tmp/greffio-deploy.tar.gz -C /opt/greffio/
chmod +x /opt/greffio/scripts/setup-aws-s3-production.sh 2>/dev/null || true
pm2 stop greffio-api > /dev/null 2>&1 || true
sleep 1
rm -rf node_modules/better-sqlite3/build
npm ci --omit=dev --ignore-scripts --no-audit --no-fund 2>&1 | tail -3
DEPS="/opt/greffio/node_modules/better-sqlite3/build/Release/.deps/Release/obj.target/sqlite3/gen/sqlite3"
mkdir -p "$DEPS"
touch "$DEPS/sqlite3.o.d.raw" 2>/dev/null || true
( while true; do mkdir -p "$DEPS"; touch "$DEPS/sqlite3.o.d.raw" 2>/dev/null; sleep 0.02; done ) &
WATCH_PID=$!
if ! ( cd /opt/greffio/node_modules/better-sqlite3 && npx --yes node-gyp rebuild --release ); then
  kill "$WATCH_PID" 2>/dev/null || true
  if [ -f /opt/greffio-deps/node_modules/better-sqlite3/build/Release/better_sqlite3.node ]; then
    echo "better-sqlite3 rebuild failed – restore depuis /opt/greffio-deps"
    rm -rf /opt/greffio/node_modules/better-sqlite3
    cp -a /opt/greffio-deps/node_modules/better-sqlite3 /opt/greffio/node_modules/
  else
    echo "better-sqlite3 rebuild failed" >&2
    exit 1
  fi
fi
kill "$WATCH_PID" 2>/dev/null || true
if [ -f /opt/greffio/node_modules/better-sqlite3/build/Release/better_sqlite3.node ]; then
  cp -a /opt/greffio/node_modules/better-sqlite3 /opt/greffio-deps/node_modules/ 2>/dev/null || mkdir -p /opt/greffio-deps/node_modules && cp -a /opt/greffio/node_modules/better-sqlite3 /opt/greffio-deps/node_modules/
fi
npm run db:migrate
pm2 restart greffio-api --update-env > /dev/null || pm2 start ecosystem.config.cjs --only greffio-api --update-env > /dev/null
sleep 5
echo "--- /api/health ---"
curl -fsS http://127.0.0.1:8787/api/health && echo
echo "--- /api/ready ---"
curl -fsS http://127.0.0.1:8787/api/ready && echo
echo "--- /api/app-version ---"
curl -fsS http://127.0.0.1:8787/api/app-version && echo
ENV_FILE="/opt/greffio/.env"
if [ -f "$ENV_FILE" ]; then
  upsert_env() { key="$1"; value="$2"; if grep -q "^${key}=" "$ENV_FILE"; then sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"; else echo "${key}=${value}" >> "$ENV_FILE"; fi; }
  upsert_env AI_PRIMARY_PROVIDER ollama
  upsert_env AI_OLLAMA_MODEL qwen2.5:7b
  upsert_env OLLAMA_CHAT_MODEL qwen2.5:7b
  upsert_env OLLAMA_BASE_URL http://127.0.0.1:11434
  upsert_env OLLAMA_ENABLED true
  upsert_env AI_EMBEDDING_MODEL nomic-embed-text
  upsert_env AI_ENABLE_RAG true
  upsert_env AI_ENABLE_PROVIDER_FALLBACK true
  upsert_env AI_ENABLE_LOCAL_RULES true
  upsert_env AI_TEMPERATURE 0.2
  pm2 restart greffio-api --update-env > /dev/null || true
  sleep 2
fi
'@

Invoke-RemoteShell -RemoteCommand ($RemoteScript -replace "`r", '')

Write-Host ""
Write-Host "=== Deploiement termine. ===" -ForegroundColor Green
