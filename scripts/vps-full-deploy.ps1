# Déploiement backend complet Greffio sur VPS (git pull + migrations + PM2).
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Plink = 'C:\Program Files\PuTTY\plink.exe'
$HostKey = 'ssh-ed25519 255 SHA256:Qd5mZUU4rWubKmIVp/5+4m1xqObBQi3ZVBoFz8wKQGc'
$VpsTarget = 'root@187.127.232.210'
$SecretPath = Join-Path $env:USERPROFILE 'Desktop\SECRET\VPS.txt'

if (-not (Test-Path $Plink)) { throw "PuTTY plink introuvable: $Plink" }
if (-not (Test-Path $SecretPath)) { throw "Fichier secret introuvable: $SecretPath" }

$content = Get-Content $SecretPath -Raw
if ($content -notmatch 'MDP\s*:\s*(.+)') { throw 'Mot de passe VPS introuvable' }
$Password = $Matches[1].Trim()

function Invoke-Vps([string]$Command) {
  & $Plink -batch -hostkey $HostKey -ssh -pw $Password $VpsTarget $Command
  if ($LASTEXITCODE -ne 0) { throw "Commande VPS échouée (code $LASTEXITCODE)" }
}

Write-Host '[deploy] Test connexion...'
Invoke-Vps 'echo VPS_OK'

Write-Host '[deploy] Mise a jour du code...'
$gitResult = & $Plink -batch -hostkey $HostKey -ssh -pw $Password $VpsTarget 'test -d /opt/greffio/.git && echo HAS_GIT || echo NO_GIT'
if ($gitResult -match 'HAS_GIT') {
  Invoke-Vps 'cd /opt/greffio && git fetch origin main && git reset --hard origin/main && git rev-parse --short HEAD'
} else {
  Write-Host '[deploy] Pas de depot git — sync PSCP (scripts/vps-sync-from-local.ps1)...'
  $syncScript = Join-Path $Root 'scripts\vps-sync-from-local.ps1'
  if (-not (Test-Path $syncScript)) { throw 'Script vps-sync-from-local.ps1 introuvable' }
  & powershell -NoProfile -ExecutionPolicy Bypass -File $syncScript
  return
}

Write-Host '[deploy] npm ci + migrations + PM2...'
Invoke-Vps 'cd /opt/greffio && npm ci --omit=dev && npm run db:migrate && npm run db:check'
Invoke-Vps 'cd /opt/greffio && pm2 restart greffio-api --update-env && pm2 save'
Invoke-Vps 'sleep 3 && curl -fsS http://127.0.0.1:8787/api/health && curl -fsS http://127.0.0.1:8787/api/ready'
Invoke-Vps 'curl -fsS -o /dev/null -w preview:%{http_code} -X POST http://127.0.0.1:8787/api/statutes/preview-draft -H Content-Type:application/json -d {\"data\":{\"legalForm\":\"SAS\"},\"answers\":{\"denomination\":\"Test\",\"capitalMontant\":\"1000\",\"objetSocial\":\"Commerce\",\"adresseSiege\":\"1 rue\",\"codePostal\":\"06200\",\"villeSiege\":\"Nice\",\"dirigeantPrincipal\":\"Jean Dupont\"}}'

Write-Host '[deploy] Terminé avec succès.'
