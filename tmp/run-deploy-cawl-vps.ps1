$ErrorActionPreference = 'Stop'
$VpsHost = if ($env:GREFFIO_VPS_HOST) { $env:GREFFIO_VPS_HOST } else { '187.127.232.210' }
$VpsUser = if ($env:GREFFIO_VPS_USER) { $env:GREFFIO_VPS_USER } else { 'root' }
$VpsHostKey = if ($env:GREFFIO_VPS_HOSTKEY) { $env:GREFFIO_VPS_HOSTKEY } else { 'ssh-ed25519 255 SHA256:Qd5mZUU4rWubKmIVp/5+4m1xqObBQi3ZVBoFz8wKQGc' }
$VpsPassword = $env:GREFFIO_VPS_PASSWORD
if (-not $VpsPassword) {
  $secretPath = Join-Path $env:USERPROFILE 'Desktop\SECRET\VPS.txt'
  if (Test-Path $secretPath) {
    $secretContent = Get-Content $secretPath -Raw
    if ($secretContent -match 'MDP\s*:\s*(.+)') { $VpsPassword = $Matches[1].Trim() }
  }
}
if (-not $VpsPassword) { throw 'GREFFIO_VPS_PASSWORD absent' }

$RepoRoot = Split-Path -Parent $PSScriptRoot
$plink = 'C:\Program Files\PuTTY\plink.exe'
$pscp = 'C:\Program Files\PuTTY\pscp.exe'

function Upload-Lf($localPath, $remotePath) {
  $tmp = Join-Path $env:TEMP ([IO.Path]::GetFileName($localPath) + '.lf')
  (Get-Content $localPath -Raw) -replace "`r`n", "`n" | Set-Content -NoNewline -Encoding UTF8 $tmp
  & $pscp -batch -hostkey $VpsHostKey -pw $VpsPassword $tmp "${VpsUser}@${VpsHost}:$remotePath"
  if ($LASTEXITCODE -ne 0) { throw "Upload failed for $localPath ($LASTEXITCODE)" }
}

Upload-Lf (Join-Path $RepoRoot 'tmp\configure-cawl-vps.sh') '/tmp/configure-cawl-vps.sh'
Upload-Lf (Join-Path $RepoRoot 'tmp\cawl-secrets.env') '/tmp/cawl-secrets.env'

$remoteCmd = @'
set -e
cd /opt/greffio
git fetch origin main
git reset --hard origin/main
npm ci --omit=dev
npm run db:migrate || true
chmod +x /tmp/configure-cawl-vps.sh
bash /tmp/configure-cawl-vps.sh
rm -f /tmp/cawl-secrets.env
'@ -replace "`r`n", "`n"

& $plink -batch -ssh -hostkey $VpsHostKey "${VpsUser}@${VpsHost}" -pw $VpsPassword $remoteCmd
if ($LASTEXITCODE -ne 0) { throw "Remote deploy/configure failed ($LASTEXITCODE)" }
