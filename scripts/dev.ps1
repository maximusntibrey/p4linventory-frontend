# Local dev launcher (FIX-1): checks node and npm, installs if needed, warns when the
# backend is down, then starts Vite. No make needed. Usage: .\scripts\dev.ps1
# If PowerShell blocks it: powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Error 'node not found. Install Node 26 (see README).' }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { Write-Error 'npm not found. It ships with Node.' }

$want = (Get-Content .nvmrc -ErrorAction SilentlyContinue | Select-Object -First 1).Trim().TrimStart('v')
$have = (node -v).Trim().TrimStart('v')
if ($want -and $want -ne $have) { Write-Warning "Node $have found, .nvmrc pins $want. Continuing; update when convenient." }

if (-not (Test-Path node_modules)) {
  Write-Host 'node_modules missing: running npm ci'
  npm ci
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

$backend = if ($env:VITE_BACKEND_URL) { $env:VITE_BACKEND_URL } else { 'http://127.0.0.1:8000' }
try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 "$backend/health/" | Out-Null }
catch { Write-Warning "backend $backend/health/ is not up. Start the backend first; the UI will load but API calls will fail." }

npm run dev
