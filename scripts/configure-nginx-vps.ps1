# Applique le durcissement Nginx Greffio sur le VPS (réversible via backup .bak).
# Usage: pwsh -File scripts/configure-nginx-vps.ps1

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
        & $plink -ssh -batch -hostkey $VpsHostKey -pw $VpsPassword "${VpsUser}@${VpsHost}" $RemoteCommand
        return
    }
    ssh -o StrictHostKeyChecking=accept-new "${VpsUser}@${VpsHost}" $RemoteCommand
}

Write-Host "[nginx] Durcissement désactivé par défaut (risque de casse). Utilisez docs/security/NGINX_HARDENING_GREFFIO.md manuellement."
Write-Host "[nginx] Vérification nginx -t uniquement."
Invoke-RemoteShell "nginx -t 2>&1; echo NGINX_CHECK_DONE"

Write-Host '[nginx] Terminé.'
