# Force DNS public sur Windows pour contourner le cache NXDOMAIN de la box.
# Lancer en administrateur :
#   pwsh -ExecutionPolicy Bypass -File scripts/fix-windows-dns-greffio.ps1
#
# Remet ensuite 8.8.8.8 / 1.1.1.1 et vide le cache DNS local.

$ErrorActionPreference = 'Stop'

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host 'ERREUR: relancez PowerShell en Administrateur.' -ForegroundColor Red
    exit 1
}

$adapter = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' -and $_.MediaType -ne '802.3' } | Select-Object -First 1
if (-not $adapter) {
    $adapter = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | Select-Object -First 1
}
if (-not $adapter) {
    Write-Host 'ERREUR: aucune interface réseau active.' -ForegroundColor Red
    exit 1
}

$alias = $adapter.Name
Write-Host "Interface: $alias" -ForegroundColor Cyan

Set-DnsClientServerAddress -InterfaceAlias $alias -ServerAddresses @('8.8.8.8', '1.1.1.1')
ipconfig /flushdns | Out-Null

Write-Host 'DNS configuré: 8.8.8.8 + 1.1.1.1' -ForegroundColor Green
Write-Host 'Cache DNS vidé.' -ForegroundColor Green
Write-Host ''

$domains = @('greffio.willentreprises.com', 'api.greffio.willentreprises.com')
foreach ($domain in $domains) {
    try {
        $result = Resolve-DnsName -Name $domain -Type A -ErrorAction Stop
        $ips = ($result | Where-Object { $_.IPAddress } | ForEach-Object { $_.IPAddress }) -join ', '
        Write-Host "  $domain -> $ips" -ForegroundColor Green
    } catch {
        Write-Host "  $domain -> echec resolution" -ForegroundColor Red
    }
}

Write-Host ''
Write-Host 'Ouvrez https://greffio.willentreprises.com en navigation privée.' -ForegroundColor Cyan
Write-Host 'Ne repassez pas en DNS automatique (DHCP) tant que la box renvoie NXDOMAIN.' -ForegroundColor Yellow
