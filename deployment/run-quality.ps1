$ErrorActionPreference = 'Stop'
$qaRoot = Split-Path $PSScriptRoot -Parent
$qaNode = Join-Path (Split-Path $qaRoot -Parent) '.qa-npm-cache/_npx/52027bd8fc0022aa/node_modules/node/bin/node.exe'
$qaNpm = 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js'
$env:PATH = (Split-Path $qaNode -Parent) + ';' + $env:PATH
$qaEvidence = Join-Path $qaRoot 'docs/quality/evidence'
$qaResults = @()
function Invoke-QaCommand($qaId, $qaCwd, $qaArguments) {
  Push-Location $qaCwd
  $qaStarted = (Get-Date).ToUniversalTime().ToString('o')
  & $qaNode @qaArguments 2>&1 | Tee-Object -FilePath (Join-Path $qaEvidence ($qaId + '.log')) | Out-Host
  $qaExit = $LASTEXITCODE
  Pop-Location
  $script:qaResults += [pscustomobject]@{ id=$qaId; started=$qaStarted; finished=(Get-Date).ToUniversalTime().ToString('o'); node=(& $qaNode --version); command=($qaNode + ' ' + ($qaArguments -join ' ')); cwd=$qaCwd; exitCode=$qaExit; sourceSha=(& git -C $qaRoot rev-parse HEAD); log=($qaId+'.log') }
  $script:qaResults | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $qaEvidence 'execution.json')
}
Invoke-QaCommand 'node22-clean-install' (Join-Path $qaRoot 'src/backend') @($qaNpm,'ci')
Invoke-QaCommand 'node22-regression' (Join-Path $qaRoot 'src/backend') @($qaNpm,'test')
Invoke-QaCommand 'node22-coverage-critical' (Join-Path $qaRoot 'src/backend') @($qaNpm,'run','test:coverage')
Invoke-QaCommand 'node22-coverage-all-loaded' $qaRoot @('--test','--test-concurrency=1','--experimental-test-coverage','--test-coverage-include=**/src/**','--test-coverage-exclude=**/node_modules/**','tests/backend.test.js','tests/frontend.test.js','tests/order-validation.test.js')
Invoke-QaCommand 'node22-lint' $qaRoot @('deployment/quality-gate.js','lint')
$env:KAYS_HAVEN_API_URL='https://kays-haven-backend.onrender.com'
$env:KAYS_HAVEN_FRONTEND_ORIGIN='https://kayshaven.live'
Invoke-QaCommand 'node22-build-production' $qaRoot @('deployment/build-static.js')
Invoke-QaCommand 'node22-audit' (Join-Path $qaRoot 'src/backend') @($qaNpm,'audit','--json')
if ($qaResults.Where({$_.exitCode -ne 0}).Count) { exit 1 }
