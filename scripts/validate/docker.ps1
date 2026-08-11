Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Validating Docker & Compose Environment " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "ERROR: Docker engine is not installed or not in PATH."
    exit 1
}

Write-Host "[✓] Docker CLI found: $(docker --version)" -ForegroundColor Green

$dockerInfo = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "ERROR: Docker daemon is not running."
    exit 1
}

Write-Host "[✓] Docker daemon is running." -ForegroundColor Green

$composeVersion = docker compose version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "ERROR: Docker Compose plugin is not installed."
    exit 1
}

Write-Host "[✓] Docker Compose plugin found: $composeVersion" -ForegroundColor Green
Write-Host "Validation successful: Docker environment is ready." -ForegroundColor Green
