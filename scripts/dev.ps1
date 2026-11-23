# Run the frontend locally on Windows: installs deps if needed, copies .env, starts the Vite dev server.
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
if (-not (Test-Path node_modules)) {
  npm ci
  if ($LASTEXITCODE -ne 0) { Write-Error 'npm ci failed'; exit $LASTEXITCODE }
}
npm run dev
