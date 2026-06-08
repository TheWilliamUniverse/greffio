# Configure security env vars on VPS Greffio API (/opt/greffio/.env).
# Usage:
#   $env:GREFFIO_TURNSTILE_SITE_KEY='...'; $env:GREFFIO_TURNSTILE_SECRET_KEY='...'; pwsh -File scripts/configure-security-vps.ps1

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

$TurnstileSiteKey = $env:GREFFIO_TURNSTILE_SITE_KEY
$TurnstileSecretKey = $env:GREFFIO_TURNSTILE_SECRET_KEY
$TurnstileKeysFile = Join-Path $env:USERPROFILE 'Desktop\SECRET\turnstile-greffio.json'
if ((-not $TurnstileSiteKey -or -not $TurnstileSecretKey) -and (Test-Path $TurnstileKeysFile)) {
    $json = Get-Content $TurnstileKeysFile -Raw | ConvertFrom-Json
    if (-not $TurnstileSiteKey) { $TurnstileSiteKey = $json.sitekey }
    if (-not $TurnstileSecretKey) { $TurnstileSecretKey = $json.secret }
}

$TurnstileEnabled = if ($TurnstileSiteKey -and $TurnstileSecretKey) { 'true' } else { 'false' }

$plink = 'C:\Program Files\PuTTY\plink.exe'
$usePutty = (Test-Path $plink) -and $VpsPassword

function Invoke-RemoteShell {
    param([string]$RemoteCommand)
    if ($usePutty) {
        & $plink -ssh -batch -hostkey $VpsHostKey -pw $VpsPassword "${VpsUser}@${VpsHost}" $RemoteCommand
        return
    }
    ssh -o StrictHostKeyChecking=accept-new "${VpsUser}@${VpsHost}" $RemoteCommand
}

function Set-EnvValue {
    param([string]$Key, [string]$Value)
    if ($null -eq $Value) { return }
    $escaped = [regex]::Escape($Key)
    Invoke-RemoteShell "grep -q '^${Key}=' /opt/greffio/.env && sed -i 's|^${escaped}=.*|${Key}=${Value}|' /opt/greffio/.env || echo '${Key}=${Value}' >> /opt/greffio/.env"
}

Write-Host "[security] Mise à jour /opt/greffio/.env"

Set-EnvValue 'SECURITY_STORE' 'postgres'
Set-EnvValue 'CSP_REPORT_ONLY' 'true'
Set-EnvValue 'GLOBAL_RATE_LIMIT_MAX' '300'
Set-EnvValue 'STRICT_PUBLIC_RATE_LIMIT_MAX' '40'
Set-EnvValue 'TURNSTILE_RISKY_LOGIN' 'true'
Set-EnvValue 'TURNSTILE_LOGIN_RISKY_THRESHOLD' '2'
Set-EnvValue 'TURNSTILE_ENFORCE_CONTACT' $(if ($TurnstileEnabled -eq 'true') { 'true' } else { 'false' })
Set-EnvValue 'TURNSTILE_ENFORCE_SIGNUP' 'false'
Set-EnvValue 'TURNSTILE_ENFORCE_LOGIN' 'false'
Set-EnvValue 'TURNSTILE_ENFORCE_FORGOT_PASSWORD' 'false'
Set-EnvValue 'TURNSTILE_ENFORCE_RESET_PASSWORD' 'false'
Set-EnvValue 'TURNSTILE_ENABLED' $TurnstileEnabled

if ($TurnstileEnabled -eq 'true') {
    Set-EnvValue 'TURNSTILE_SITE_KEY' $TurnstileSiteKey
    Set-EnvValue 'TURNSTILE_SECRET_KEY' $TurnstileSecretKey
}

if ($env:GREFFIO_SECURITY_ALERT_WEBHOOK_URL) {
    Set-EnvValue 'SECURITY_ALERT_WEBHOOK_URL' $env:GREFFIO_SECURITY_ALERT_WEBHOOK_URL
}
if ($env:GREFFIO_SENTRY_DSN) {
    Set-EnvValue 'SENTRY_DSN' $env:GREFFIO_SENTRY_DSN
    Set-EnvValue 'SENTRY_ENVIRONMENT' 'production'
}

Invoke-RemoteShell 'pm2 restart greffio-api --update-env'
Start-Sleep -Seconds 4
Invoke-RemoteShell 'curl -fsS http://127.0.0.1:8787/api/health && echo'
Invoke-RemoteShell 'curl -fsS http://127.0.0.1:8787/api/public/security-config | head -c 240 && echo'

if ($TurnstileEnabled -ne 'true') {
    Write-Host ''
    Write-Host 'Turnstile non activé: créez un widget Cloudflare Turnstile (mode Managed) pour greffio.willentreprises.com'
    Write-Host 'Puis relancez avec GREFFIO_TURNSTILE_SITE_KEY et GREFFIO_TURNSTILE_SECRET_KEY.'
}

Write-Host '[security] Terminé.'
