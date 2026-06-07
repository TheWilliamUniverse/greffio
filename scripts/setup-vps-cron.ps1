# Installe les crons relances Greffio sur le VPS (root crontab).
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

$lineReminder = '0 9 * * 1 cd /opt/greffio && /usr/bin/node server/scripts/send-dossier-reminders.js >> /var/log/greffio-reminders.log 2>&1 # greffio-email-cron'
$lineDigest = '0 8 * * 5 cd /opt/greffio && /usr/bin/node server/scripts/send-dossier-reminders.js digest >> /var/log/greffio-digest.log 2>&1 # greffio-email-cron'

Write-Host "=== Installation crons relances Greffio ===" -ForegroundColor Cyan
Invoke-RemoteShell -RemoteCommand "(crontab -l 2>/dev/null | grep -v greffio-email-cron | grep -v send-dossier-reminders.js; echo '$lineReminder'; echo '$lineDigest') | crontab -"
Invoke-RemoteShell -RemoteCommand "crontab -l | grep greffio-email-cron || echo AUCUN_CRON"
Write-Host "=== Termine ===" -ForegroundColor Green
