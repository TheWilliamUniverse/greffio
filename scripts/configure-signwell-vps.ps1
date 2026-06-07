# Configure SignWell env vars on VPS Greffio API (/opt/greffio/.env).
# Usage: pwsh -File scripts/configure-signwell-vps.ps1

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

$keyFile = Join-Path $env:USERPROFILE 'Desktop\SIGNWELL API KEY.txt'
if (-not (Test-Path $keyFile)) {
    throw "Fichier credentials introuvable: $keyFile"
}

$keyContent = Get-Content $keyFile -Raw
$keyLines = Get-Content $keyFile | ForEach-Object { $_.Trim() } | Where-Object { $_ }

if ($keyContent -match 'SIGNWELL_API_KEY\s*=\s*(\S+)') {
    $SignwellApiKey = $Matches[1].Trim()
} elseif ($keyLines.Count -ge 1 -and $keyLines[0] -match '^(\S+)') {
    $SignwellApiKey = $Matches[1].Trim()
} else {
    throw 'SIGNWELL_API_KEY introuvable dans le fichier credentials'
}

if ($keyContent -match 'SIGNWELL_API_APPLICATION_ID\s*=\s*(\S+)') {
    $SignwellAppId = $Matches[1].Trim()
} elseif ($keyContent -match 'Identifiant unique\s*:\s*([0-9a-f-]{36})') {
    $SignwellAppId = $Matches[1].Trim()
} else {
    throw 'SIGNWELL_API_APPLICATION_ID introuvable dans le fichier credentials'
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

Write-Host "=== Configuration SignWell sur $VpsHost ===" -ForegroundColor Cyan

$RemoteScript = @'
set -e
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

upsert_env SIGNWELL_API_KEY __SIGNWELL_API_KEY__
upsert_env SIGNWELL_API_APPLICATION_ID __SIGNWELL_APP_ID__
upsert_env SIGNWELL_CALLBACK_URL https://api.greffio.willentreprises.com/callback
upsert_env SIGNWELL_TEST_MODE false
upsert_env SIGNATURE_PROVIDER signwell
upsert_env APP_URL https://greffio.willentreprises.com
upsert_env API_PUBLIC_URL https://api.greffio.willentreprises.com

sed -i 's/\r$//' "$ENV_FILE"

cd /opt/greffio
pm2 restart greffio-api --update-env
sleep 8

echo "=== GET /callback (local) ==="
curl -fsS http://127.0.0.1:8787/callback || true
echo

echo "=== Logs SignWell (boot) ==="
pm2 logs greffio-api --lines 60 --nostream 2>&1 | grep -i signwell || true

WEBHOOK_ID=$(pm2 logs greffio-api --lines 120 --nostream 2>&1 | grep -oE 'SIGNWELL_WEBHOOK_ID=[0-9a-f-]{36}' | head -1 | cut -d= -f2 || true)
if [ -z "$WEBHOOK_ID" ]; then
  WEBHOOK_ID=$(pm2 logs greffio-api --lines 120 --nostream 2>&1 | grep -oE 'webhook créé : [0-9a-f-]{36}' | head -1 | awk '{print $NF}' || true)
fi
if [ -n "$WEBHOOK_ID" ]; then
  upsert_env SIGNWELL_WEBHOOK_ID "$WEBHOOK_ID"
  pm2 restart greffio-api --update-env
  sleep 4
  echo "SIGNWELL_WEBHOOK_ID persisted: $WEBHOOK_ID"
fi

echo "=== SignWell env (masked) ==="
grep -E '^SIGN(WELL|ATURE)_' "$ENV_FILE" | sed 's/\(SIGNWELL_API_KEY=\).*/\1***masked***/'
'@

$RemoteScript = $RemoteScript -replace '__SIGNWELL_API_KEY__', $SignwellApiKey
$RemoteScript = $RemoteScript -replace '__SIGNWELL_APP_ID__', $SignwellAppId

Invoke-RemoteShell -RemoteCommand ($RemoteScript -replace "`r", '')

Write-Host ""
Write-Host "=== Configuration SignWell terminee. ===" -ForegroundColor Green
