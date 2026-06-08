# Smoke checks prod Greffio (API + front public).
$ErrorActionPreference = 'Continue'

$checks = @(
  @{ Name = 'API health'; Url = 'https://api.greffio.willentreprises.com/api/health' },
  @{ Name = 'API ready'; Url = 'https://api.greffio.willentreprises.com/api/ready' },
  @{ Name = 'Front home'; Url = 'https://greffio.willentreprises.com/' },
  @{ Name = 'Front tarifs'; Url = 'https://greffio.willentreprises.com/tarifs' },
  @{ Name = 'Front simulateur'; Url = 'https://greffio.willentreprises.com/simulateur?type=statuts' },
  @{ Name = 'API app-version'; Url = 'https://api.greffio.willentreprises.com/api/app-version' }
)

$failed = 0
foreach ($check in $checks) {
  try {
    $response = Invoke-WebRequest -Uri $check.Url -UseBasicParsing -TimeoutSec 20
    $ok = $response.StatusCode -ge 200 -and $response.StatusCode -lt 400
    if ($ok) {
      Write-Host "[OK] $($check.Name) ($($response.StatusCode))"
    } else {
      Write-Host "[FAIL] $($check.Name) ($($response.StatusCode))"
      $failed += 1
    }
  } catch {
    Write-Host "[FAIL] $($check.Name) - $($_.Exception.Message)"
    $failed += 1
  }
}

if ($failed -gt 0) { exit 1 }
Write-Host 'Smoke prod OK.'
