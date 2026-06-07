# Configure nginx WebSocket proxy for Greffio API (/api/ws/).
#
# Usage :
#   $env:GREFFIO_VPS_PASSWORD = '...'
#   pwsh -File scripts/configure-nginx-ws-vps.ps1

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

Write-Host "=== Configuration nginx WebSocket Greffio ===" -ForegroundColor Cyan

$RemoteScript = @'
set -e
CONF=""
for candidate in \
  /etc/nginx/sites-enabled/greffio-api.conf \
  /etc/nginx/sites-available/greffio-api.conf \
  /etc/nginx/sites-enabled/greffio \
  /etc/nginx/sites-enabled/api.greffio.willentreprises.com \
  /etc/nginx/sites-enabled/default \
  /etc/nginx/conf.d/greffio.conf; do
  if [ -f "$candidate" ]; then CONF="$candidate"; break; fi
done
if [ -z "$CONF" ]; then
  CONF=$(grep -rl "8787" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null | head -1 || true)
fi
if [ -z "$CONF" ]; then
  echo "Aucun vhost nginx Greffio trouve." >&2
  exit 1
fi
echo "Vhost : $CONF"
cp "$CONF" "${CONF}.bak-$(date +%Y%m%d-%H%M%S)"
if grep -q "location /api/ws/" "$CONF"; then
  echo "Bloc /api/ws/ deja present."
else
  awk '
    BEGIN { inserted=0 }
    /location \/api\// && inserted==0 {
      print "    location /api/ws/ {"
      print "        proxy_pass http://127.0.0.1:8787;"
      print "        proxy_http_version 1.1;"
      print "        proxy_set_header Upgrade $http_upgrade;"
      print "        proxy_set_header Connection \"upgrade\";"
      print "        proxy_set_header Host $host;"
      print "        proxy_read_timeout 3600s;"
      print "    }"
      inserted=1
    }
    { print }
  ' "$CONF" > "${CONF}.tmp" && mv "${CONF}.tmp" "$CONF"
  echo "Bloc /api/ws/ insere."
fi
nginx -t
systemctl reload nginx
echo "nginx recharge OK"
'@

Invoke-RemoteShell -RemoteCommand ($RemoteScript -replace "`r", '')
Write-Host "=== nginx WebSocket configure. ===" -ForegroundColor Green
