<#
Frontend real-API staging check on Windows.
Usage: .\scripts\staging.ps1 [up|smoke|down]
#>
param([Parameter(Position = 0)][string]$Task = "up")
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

switch ($Task) {
    "up" {
        if (-not (Test-Path .env)) { Copy-Item .env.example .env }
        $env:VITE_API_MODE = "real"
        npm run dev -- --host 127.0.0.1
    }
    "smoke" {
        npm run e2e
    }
    "down" {
        Write-Host "Stop the frontend dev process in the same terminal."
    }
    default {
        throw "Unknown task '$Task'. Use up|smoke|down."
    }
}
