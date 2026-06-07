# Installation Ollama + modeles IA sur le VPS Greffio (api.greffio.willentreprises.com).
#
# Installe Ollama si absent, demarre le service, pull qwen3:8b + bge-m3,
# met a jour /opt/greffio/.env avec les variables assistant IA, puis redemarre pm2.
#
# Usage :
#   $env:GREFFIO_VPS_PASSWORD = '...'
#   pwsh -File scripts/install-ollama-vps.ps1

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

$plink = 'C:\Program Files\PuTTY\plink.exe'
$usePutty = (Test-Path $plink) -and $VpsPassword

function Invoke-RemoteShell {
    param([string]$RemoteCommand)
    if ($usePutty) {
        & $plink -batch -ssh -hostkey "$VpsHostKey" "$VpsUser@$VpsHost" -pw "$VpsPassword" $RemoteCommand
    } else {
        & ssh -o StrictHostKeyChecking=accept-new "$VpsUser@$VpsHost" $RemoteCommand
    }
    if ($LASTEXITCODE -ne 0) { throw "Remote command failed (exit $LASTEXITCODE)" }
}

Write-Host "=== Installation Ollama sur $VpsHost ===" -ForegroundColor Cyan

$RemoteScript = @'
set -e
export DEBIAN_FRONTEND=noninteractive

if ! command -v ollama >/dev/null 2>&1; then
  echo "Installation Ollama..."
  curl -fsSL https://ollama.com/install.sh | sh
else
  echo "Ollama deja installe : $(ollama --version 2>/dev/null || echo ok)"
fi

systemctl enable ollama 2>/dev/null || true
systemctl restart ollama 2>/dev/null || true
sleep 3

echo "Pull modeles LLM + embeddings..."
ollama pull qwen2.5:7b
ollama pull nomic-embed-text

echo "Verification API locale..."
curl -fsS http://127.0.0.1:11434/api/tags | head -c 400 || true
echo

ENV_FILE="/opt/greffio/.env"
touch "$ENV_FILE"

upsert_env() {
  key="$1"
  value="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    echo "${key}=${value}" >> "$ENV_FILE"
  fi
}

upsert_env AI_PRIMARY_PROVIDER ollama
upsert_env AI_OLLAMA_MODEL qwen2.5:7b
upsert_env OLLAMA_CHAT_MODEL qwen2.5:7b
upsert_env OLLAMA_BASE_URL http://127.0.0.1:11434
upsert_env OLLAMA_ENABLED true
upsert_env AI_EMBEDDING_MODEL nomic-embed-text
upsert_env OLLAMA_EMBED_MODEL nomic-embed-text
upsert_env AI_ENABLE_RAG true
upsert_env AI_ENABLE_PROVIDER_FALLBACK true
upsert_env AI_ENABLE_LOCAL_RULES true
upsert_env AI_TEMPERATURE 0.2

echo "Variables IA mises a jour dans $ENV_FILE"

if command -v pm2 >/dev/null 2>&1; then
  pm2 restart greffio-api --update-env > /dev/null || true
  sleep 3
  curl -fsS http://127.0.0.1:8787/api/health && echo
fi

echo "=== Ollama pret ==="
'@

Invoke-RemoteShell -RemoteCommand ($RemoteScript -replace "`r", '')

Write-Host ""
Write-Host "=== Installation Ollama terminee. ===" -ForegroundColor Green
