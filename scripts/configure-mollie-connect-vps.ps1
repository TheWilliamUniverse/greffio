# Configure Mollie env vars on VPS Greffio API (/opt/greffio/.env).
# Syncs BOTH OAuth apps: payment B2C (Greffio) + Connect Partners.
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

$credentialCandidates = @(
    (Join-Path $env:USERPROFILE 'Documents\GREFFIO MOLLIE API KEY.md'),
    (Join-Path $env:USERPROFILE 'Desktop\GREFFIO MOLLIE API KEY.txt')
)
$keyFile = $credentialCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $keyFile) {
    throw "Fichier credentials introuvable (Documents ou Desktop GREFFIO MOLLIE API KEY)"
}

$keyContent = (Get-Content $keyFile -Raw) -replace '\\_', '_'
$paymentCallback = 'https://greffio.willentreprises.com/api/mollie/callback'
$connectRedirect = 'https://api.greffio.willentreprises.com/api/mollie/connect/callback'

function Get-MollieOAuthBlock {
    param([string]$Content, [string]$AfterMarker)
    $idx = $Content.IndexOf($AfterMarker)
    if ($idx -lt 0) { return $null }
    $slice = $Content.Substring($idx)
    if ($slice -match 'ID client\s*\r?\n\s*(app_\S+)') {
        $id = $Matches[1].Trim()
        if ($slice -match 'Clé secrète client\s*\r?\n\s*(\S+)') {
            return @{ ClientId = $id; ClientSecret = $Matches[1].Trim() }
        }
    }
    return $null
}

$connectBlock = Get-MollieOAuthBlock -Content $keyContent -AfterMarker $connectRedirect
if (-not $connectBlock) {
    $connectBlock = Get-MollieOAuthBlock -Content $keyContent -AfterMarker 'Greffio Connect for Partners'
}

$paymentBlock = Get-MollieOAuthBlock -Content $keyContent -AfterMarker $paymentCallback
if (-not $paymentBlock) {
    $paymentBlock = Get-MollieOAuthBlock -Content $keyContent -AfterMarker 'Greffio accompagne'
}

if ($connectBlock) {
    $ClientId = $connectBlock.ClientId
    $ClientSecret = $connectBlock.ClientSecret
} elseif ($keyContent -match 'ID client\s*\r?\n\s*(app_\S+)') {
    $ClientId = $Matches[1].Trim()
    if ($keyContent -match 'Clé secrète client\s*\r?\n\s*(\S+)') {
        $ClientSecret = $Matches[1].Trim()
    } else {
        throw 'MOLLIE_OAUTH_CLIENT_SECRET introuvable dans le fichier credentials'
    }
} else {
    throw 'MOLLIE_OAUTH_CLIENT_ID introuvable dans le fichier credentials'
}

Write-Host "Credentials source: $keyFile" -ForegroundColor DarkGray
Write-Host "Connect OAuth client ID: $ClientId" -ForegroundColor DarkGray
Write-Host "Connect redirect: $connectRedirect" -ForegroundColor DarkGray
if ($paymentBlock) {
    Write-Host "Payment OAuth client ID: $($paymentBlock.ClientId)" -ForegroundColor DarkGray
    Write-Host "Payment callback: $paymentCallback" -ForegroundColor DarkGray
} else {
    Write-Host 'Payment OAuth block not found — MOLLIE_PAYMENT_OAUTH_* skipped' -ForegroundColor Yellow
}

function Get-MollieOptionalEnv {
    param([string]$Content)
    $result = @{}
    if ($Content -match '(?m)^(?:Clé API|MOLLIE_API_KEY|API key)\s*\r?\n\s*(live_[A-Za-z0-9]+|test_[A-Za-z0-9]+)') {
        $result.ApiKey = $Matches[1].Trim()
    } elseif ($Content -match '(live_[A-Za-z0-9]{20,}|test_[A-Za-z0-9]{20,})') {
        $result.ApiKey = $Matches[1].Trim()
    }
    if ($Content -match '(?m)^(?:Profile ID|MOLLIE_PROFILE_ID|ID profil)\s*\r?\n\s*(pfl_[A-Za-z0-9]+)') {
        $result.ProfileId = $Matches[1].Trim()
    } elseif ($Content -match '(pfl_[A-Za-z0-9]+)') {
        $result.ProfileId = $Matches[1].Trim()
    }
    return $result
}

$optionalEnv = Get-MollieOptionalEnv -Content $keyContent

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

Write-Host "=== Configuration Mollie (dual apps) sur $VpsHost ===" -ForegroundColor Cyan

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
upsert_env MOLLIE_CALLBACK_URL https://greffio.willentreprises.com/api/mollie/callback
__PAYMENT_OAUTH_ENV__
__OPTIONAL_ENV__
upsert_env MOLLIE_WEBHOOK_URL https://api.greffio.willentreprises.com/api/webhooks/mollie
upsert_env API_PUBLIC_URL https://api.greffio.willentreprises.com

sed -i 's/\r$//' "$ENV_FILE"

cd /opt/greffio
pm2 restart greffio-api --update-env
sleep 8

echo "=== Mollie env (masked) ==="
grep -E '^MOLLIE_(OAUTH|CONNECT|WEBHOOK|API_KEY|PROFILE_ID|CALLBACK|PAYMENT)' "$ENV_FILE" | sed 's/=.*/=***/'

echo "=== GET /api/health (local) ==="
curl -fsS http://127.0.0.1:8787/api/health && echo
'@

$RemoteScript = $RemoteScript.Replace('__CLIENT_ID__', $ClientId)
$RemoteScript = $RemoteScript.Replace('__CLIENT_SECRET__', $ClientSecret)

$paymentOAuthLines = @()
if ($paymentBlock) {
    $paymentOAuthLines += "upsert_env MOLLIE_PAYMENT_OAUTH_CLIENT_ID $($paymentBlock.ClientId)"
    $paymentOAuthLines += "upsert_env MOLLIE_PAYMENT_OAUTH_CLIENT_SECRET $($paymentBlock.ClientSecret)"
}
$RemoteScript = $RemoteScript.Replace('__PAYMENT_OAUTH_ENV__', ($paymentOAuthLines -join "`n"))

$optionalLines = @()
if ($optionalEnv.ApiKey) {
    Write-Host 'Optional: MOLLIE_API_KEY found in credentials file' -ForegroundColor DarkGray
    $optionalLines += "upsert_env MOLLIE_API_KEY $($optionalEnv.ApiKey)"
}
if ($optionalEnv.ProfileId) {
    Write-Host 'Optional: MOLLIE_PROFILE_ID found in credentials file' -ForegroundColor DarkGray
    $optionalLines += "upsert_env MOLLIE_PROFILE_ID $($optionalEnv.ProfileId)"
}
$RemoteScript = $RemoteScript.Replace('__OPTIONAL_ENV__', ($optionalLines -join "`n"))

# plink/bash rejects CRLF in inline scripts
$RemoteScript = $RemoteScript -replace "`r`n", "`n" -replace "`r", "`n"

Invoke-RemoteShell $RemoteScript
Write-Host 'Configuration Mollie VPS (dual apps) terminée.' -ForegroundColor Green
