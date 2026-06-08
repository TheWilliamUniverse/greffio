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

Write-Host "[nginx] Application du durcissement sur $VpsHost"

Invoke-RemoteShell "bash -lc 'set -e; CONF=\"\"; for candidate in /etc/nginx/sites-available/greffio-api /etc/nginx/sites-available/default /etc/nginx/conf.d/greffio.conf; do if [ -f \"\$candidate\" ]; then CONF=\"\$candidate\"; break; fi; done; if [ -z \"\$CONF\" ]; then echo NGINX_CONF_NOT_FOUND; exit 1; fi; cp \"\$CONF\" \"\$CONF.greffio-security.bak\"; echo NGINX_BACKUP_OK:\$CONF'"

Invoke-RemoteShell "bash -lc 'grep -q limit_req_zone.*greffio_api_global /etc/nginx/nginx.conf || sed -i \"/http {/a\\    limit_req_zone \$binary_remote_addr zone=greffio_api_global:20m rate=30r/s;\\n    limit_req_zone \$binary_remote_addr zone=greffio_api_auth:10m rate=5r/m;\\n    limit_conn_zone \$binary_remote_addr zone=greffio_conn:10m;\" /etc/nginx/nginx.conf'"

Invoke-RemoteShell "bash -lc 'CONF=\"\"; for candidate in /etc/nginx/sites-available/greffio-api /etc/nginx/sites-available/default /etc/nginx/conf.d/greffio.conf; do if [ -f \"\$candidate\" ]; then CONF=\"\$candidate\"; break; fi; done; grep -q \"client_max_body_size 12m\" \"\$CONF\" || sed -i \"/server {/a\\    client_max_body_size 12m;\\n    client_body_timeout 15s;\\n    client_header_timeout 15s;\\n    keepalive_timeout 20s;\\n    send_timeout 20s;\\n    limit_conn greffio_conn 40;\" \"\$CONF\"'"

Invoke-RemoteShell "bash -lc 'nginx -t && systemctl reload nginx && curl -fsS http://127.0.0.1:8787/api/health >/dev/null && echo NGINX_HARDENING_OK'"

Write-Host '[nginx] Terminé.'
