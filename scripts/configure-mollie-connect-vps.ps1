# Configure Mollie Connect OAuth env vars on VPS Greffio API (/opt/greffio/.env).
# Usage: pwsh -File scripts/configure-mollie-connect-vps.ps1

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

$keyFile = Join-Path $env:USERPROFILE 'Desktop\GREFFIO MOLLIE API KEY.txt'
if (-not (Test-Path $keyFile)) {
    throw "Fichier credentials introuvable: $keyFile"
}

$keyContent = Get-Content $keyFile -Raw
if ($keyContent -match 'ID client\s*\r?\n\s*(app_\S+)') {
    $ClientId = $Matches[1].Trim()
} elseif ($keyContent -match '(app_[A-Za-z0-9]+)') {
    $ClientId = $Matches[1].Trim()
} else {
    throw 'MOLLIE_OAUTH_CLIENT_ID introuvable dans le fichier credentials'
}

if ($keyContent -match 'Clé secrète client\s*\r?\n\s*(\S+)') {
    $ClientSecret = $Matches[1].Trim()
} else {
    throw 'MOLLIE_OAUTH_CLIENT_SECRET introuvable dans le fichier credentials'
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

Write-Host "=== Configuration Mollie Connect sur $VpsHost ===" -ForegroundColor Cyan

$RemoteScript = @'
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

upsert_env MOLLIE_OAUTH_CLIENT_ID __CLIENT_ID__
upsert_env MOLLIE_OAUTH_CLIENT_SECRET __CLIENT_SECRET__
upsert_env MOLLIE_CONNECT_REDIRECT_URI https://api.greffio.willentreprises.com/api/mollie/connect/callback
upsert_env MOLLIE_WEBHOOK_URL https://api.greffio.willentreprises.com/api/webhooks/mollie
upsert_env API_PUBLIC_URL https://api.greffio.willentreprises.com

sed -i 's/\r$//' "$ENV_FILE"

cd /opt/greffio
pm2 restart greffio-api --update-env
sleep 8

echo "=== Mollie Connect env (masked) ==="
grep -E '^MOLLIE_(OAUTH|CONNECT|WEBHOOK)' "$ENV_FILE" | sed 's/=.*/=***/'

echo "=== GET /api/health (local) ==="
curl -fsS http://127.0.0.1:8787/api/health && echo
'@

$RemoteScript = $RemoteScript.Replace('__CLIENT_ID__', $ClientId)
$RemoteScript = $RemoteScript.Replace('__CLIENT_SECRET__', $ClientSecret)

Invoke-RemoteShell $RemoteScript
Write-Host 'Mollie Connect VPS configuration terminée.' -ForegroundColor Green
