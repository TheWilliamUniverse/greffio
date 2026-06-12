# Diagnostic DNS Greffio — compare DNS local, public et autoritaire.
# Usage: pwsh -File scripts/diagnose-dns-greffio.ps1

$ErrorActionPreference = 'Continue'

$domains = @(
    'greffio.willentreprises.com',
    'api.greffio.willentreprises.com'
)
$resolvers = @(
    @{ Label = 'DNS local (Windows)'; Server = $null },
    @{ Label = 'Google 8.8.8.8'; Server = '8.8.8.8' },
    @{ Label = 'Cloudflare 1.1.1.1'; Server = '1.1.1.1' },
    @{ Label = 'Authoritative ns1.dns-parking.com'; Server = 'ns1.dns-parking.com' }
)

Write-Host '=== Diagnostic DNS Greffio ===' -ForegroundColor Cyan
Write-Host ''

foreach ($domain in $domains) {
    Write-Host "--- $domain ---" -ForegroundColor Yellow
    foreach ($resolver in $resolvers) {
        $label = $resolver.Label
        try {
            if ($resolver.Server) {
                $result = Resolve-DnsName -Name $domain -Type A -Server $resolver.Server -ErrorAction Stop
            } else {
                $result = Resolve-DnsName -Name $domain -Type A -ErrorAction Stop
            }
            $ips = ($result | Where-Object { $_.IPAddress } | ForEach-Object { $_.IPAddress }) -join ', '
            Write-Host "  $label : OK -> $ips" -ForegroundColor Green
        } catch {
            Write-Host "  $label : NXDOMAIN ou erreur" -ForegroundColor Red
        }
    }
    Write-Host ''
}

Write-Host '--- Test HTTP (bypass DNS si IPs connues) ---' -ForegroundColor Yellow
try {
    $greffio = Invoke-WebRequest -Uri 'https://greffio.willentreprises.com/' -TimeoutSec 15 -UseBasicParsing
    Write-Host "  greffio HTTPS : $($greffio.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host '  greffio HTTPS : echec (souvent DNS local)' -ForegroundColor Red
    Write-Host '  -> Essayez: changer DNS Windows vers 8.8.8.8 puis ipconfig /flushdns' -ForegroundColor DarkYellow
}

try {
    $api = Invoke-RestMethod -Uri 'https://api.greffio.willentreprises.com/api/health' -TimeoutSec 15
    Write-Host "  api health : ok=$($api.ok)" -ForegroundColor Green
} catch {
    Write-Host '  api health : echec' -ForegroundColor Red
}

Write-Host ''
Write-Host 'Contexte complet : docs/contexte-incident-dns-greffio-chatgpt.md' -ForegroundColor Cyan
