# Configure security env vars on VPS Greffio API (/opt/greffio/.env).
# Usage:
#   pwsh -File scripts/configure-security-vps.ps1
# Optional overrides:
#   $env:GREFFIO_TURNSTILE_SITE_KEY / GREFFIO_TURNSTILE_SECRET_KEY
#   $env:GREFFIO_RECAPTCHA_SITE_KEY / GREFFIO_RECAPTCHA_SECRET_KEY

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
$RecaptchaSiteKey = $env:GREFFIO_RECAPTCHA_SITE_KEY
$RecaptchaSecretKey = $env:GREFFIO_RECAPTCHA_SECRET_KEY

$TurnstileKeysFile = Join-Path $env:USERPROFILE 'Desktop\SECRET\turnstile-greffio.json'
if ((-not $TurnstileSiteKey -or -not $TurnstileSecretKey) -and (Test-Path $TurnstileKeysFile)) {
    $json = Get-Content $TurnstileKeysFile -Raw | ConvertFrom-Json
    if (-not $TurnstileSiteKey) { $TurnstileSiteKey = $json.sitekey }
    if (-not $TurnstileSecretKey) { $TurnstileSecretKey = $json.secret }
}

$CaptchaFile = Join-Path $env:USERPROFILE 'Desktop\RECAPTCHA GOOGLE & TURNSTILE.txt'
if (Test-Path $CaptchaFile) {
    $captchaContent = Get-Content $CaptchaFile -Raw
    $captchaLines = Get-Content $CaptchaFile | ForEach-Object { $_.Trim() } | Where-Object { $_ -match '^6L' }
    if (-not $RecaptchaSiteKey -and $captchaLines.Count -ge 1) {
        $RecaptchaSiteKey = $captchaLines[0]
    }
    if (-not $RecaptchaSecretKey -and $captchaLines.Count -ge 2) {
        $RecaptchaSecretKey = $captchaLines[1]
    }
}

$RecaptchaEnabled = if ($RecaptchaSiteKey -and $RecaptchaSecretKey) { 'true' } else { 'false' }
# Table rase Cloudflare/Turnstile : reCAPTCHA Google seul en production.
$TurnstileEnabled = 'false'

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
Set-EnvValue 'CAPTCHA_VERIFY_HOURLY_MAX' '400'
Set-EnvValue 'CAPTCHA_VERIFY_DAILY_MAX' '3000'
Set-EnvValue 'TURNSTILE_VERIFY_HOURLY_MAX' '350'
Set-EnvValue 'RECAPTCHA_VERIFY_HOURLY_MAX' '120'
Set-EnvValue 'ASSISTANT_HOURLY_MAX' '80'
Set-EnvValue 'ASSISTANT_DAILY_MAX' '400'
Set-EnvValue 'TURNSTILE_RISKY_LOGIN' 'true'
Set-EnvValue 'TURNSTILE_LOGIN_RISKY_THRESHOLD' '2'
Set-EnvValue 'TURNSTILE_ENFORCE_CONTACT' $(if ($RecaptchaEnabled -eq 'true') { 'true' } else { 'false' })
Set-EnvValue 'TURNSTILE_ENFORCE_SIGNUP' 'false'
Set-EnvValue 'TURNSTILE_ENFORCE_LOGIN' 'false'
Set-EnvValue 'TURNSTILE_ENFORCE_FORGOT_PASSWORD' 'false'
Set-EnvValue 'TURNSTILE_ENFORCE_RESET_PASSWORD' 'false'
Set-EnvValue 'TURNSTILE_ENABLED' $TurnstileEnabled
Set-EnvValue 'RECAPTCHA_FALLBACK_ENABLED' $RecaptchaEnabled

if ($TurnstileEnabled -eq 'true') {
    Set-EnvValue 'TURNSTILE_SITE_KEY' $TurnstileSiteKey
    Set-EnvValue 'TURNSTILE_SECRET_KEY' $TurnstileSecretKey
}

if ($RecaptchaEnabled -eq 'true') {
    Set-EnvValue 'RECAPTCHA_SITE_KEY' $RecaptchaSiteKey
    Set-EnvValue 'RECAPTCHA_SECRET_KEY' $RecaptchaSecretKey
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
Invoke-RemoteShell 'curl -fsS http://127.0.0.1:8787/api/public/security-config | head -c 320 && echo'

if ($RecaptchaEnabled -eq 'true') {
    Write-Host 'reCAPTCHA Google configuré comme captcha principal (Turnstile désactivé).'
} else {
    Write-Host 'reCAPTCHA non configuré — ajoutez les clés Google reCAPTCHA v2 dans le fichier local.'
}

Write-Host '[security] Terminé.'
