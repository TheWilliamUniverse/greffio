# Sync Greffio backend to VPS when /opt/greffio is not a git clone (private repo).
# Usage: .\scripts\vps-sync-from-local.ps1

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Plink = 'C:\Program Files\PuTTY\plink.exe'
$Pscp = 'C:\Program Files\PuTTY\pscp.exe'
$HostKey = 'ssh-ed25519 255 SHA256:Qd5mZUU4rWubKmIVp/5+4m1xqObBQi3ZVBoFz8wKQGc'
$Host = 'root@187.127.232.210'
$content = Get-Content (Join-Path $env:USERPROFILE 'Desktop\SECRET\VPS.txt') -Raw
if ($content -notmatch 'MDP\s*:\s*(.+)') { throw 'Mot de passe VPS introuvable dans Desktop\SECRET\VPS.txt' }
$Password = $Matches[1].Trim()

if (-not (Test-Path $Plink)) { throw "PuTTY plink introuvable: $Plink" }

& $Plink -batch -hostkey $HostKey -ssh -pw $Password $Host "mkdir -p /opt/greffio/server"
& $Pscp -batch -hostkey $HostKey -pw $Password -r (Join-Path $Root 'server') "${Host}:/opt/greffio/"
& $Pscp -batch -hostkey $HostKey -pw $Password (Join-Path $Root 'package.json') (Join-Path $Root 'package-lock.json') (Join-Path $Root 'ecosystem.config.cjs') "${Host}:/opt/greffio/"
& $Pscp -batch -hostkey $HostKey -pw $Password -r (Join-Path $Root 'scripts') "${Host}:/opt/greffio/"

$Remote = @'
set -e
cd /opt/greffio
npm ci --omit=dev
npm run db:migrate
pm2 restart greffio-api --update-env
pm2 save
curl -fsS http://127.0.0.1:8787/api/health
echo SYNC_OK
'@

& $Plink -batch -hostkey $HostKey -ssh -pw $Password $Host $Remote
Write-Host 'VPS sync terminé.'
