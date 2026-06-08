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

$remoteScript = @'
set -e
CONF=""
for candidate in /etc/nginx/sites-available/greffio-api /etc/nginx/sites-available/default /etc/nginx/conf.d/greffio.conf; do
  if [ -f "$candidate" ]; then CONF="$candidate"; break; fi
done
if [ -z "$CONF" ]; then
  echo "Aucun fichier nginx API trouvé"
  exit 1
fi
cp "$CONF" "$CONF.greffio-security.bak"

if ! grep -q 'limit_req_zone.*greffio_api_global' /etc/nginx/nginx.conf; then
  sed -i '/http {/a \
    limit_req_zone $binary_remote_addr zone=greffio_api_global:20m rate=30r/s;\
    limit_req_zone $binary_remote_addr zone=greffio_api_auth:10m rate=5r/m;\
    limit_conn_zone $binary_remote_addr zone=greffio_conn:10m;' /etc/nginx/nginx.conf
fi

if ! grep -q 'client_max_body_size 12m' "$CONF"; then
  sed -i '/server {/a \
    client_max_body_size 12m;\
    client_body_timeout 15s;\
    client_header_timeout 15s;\
    keepalive_timeout 20s;\
    send_timeout 20s;\
    limit_conn greffio_conn 40;' "$CONF"
fi

if ! grep -q 'limit_req zone=greffio_api_global' "$CONF"; then
  sed -i 's|location /api/ {|location /api/health {\
        limit_req zone=greffio_api_global burst=20 nodelay;\
        proxy_pass http://127.0.0.1:8787;\
        proxy_read_timeout 10s;\
    }\
    location /api/auth/ {\
        limit_req zone=greffio_api_auth burst=10 nodelay;\
        proxy_pass http://127.0.0.1:8787;\
        proxy_read_timeout 30s;\
    }\
    location /api/ {|' "$CONF"
  sed -i 's|location /api/ {|location /api/ {\
        limit_req zone=greffio_api_global burst=60 nodelay;\
        proxy_read_timeout 120s;|' "$CONF"
fi

nginx -t
systemctl reload nginx
curl -fsS http://127.0.0.1:8787/api/health >/dev/null
echo NGINX_HARDENING_OK
'@

Write-Host "[nginx] Application du durcissement sur $VpsHost"
Invoke-RemoteShell $remoteScript
Write-Host '[nginx] Terminé.'
