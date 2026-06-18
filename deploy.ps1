# FST Pay - Production Deployment (Windows)
# Usage: .\deploy.ps1
# Prereq: Docker Desktop, openssl

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "[INFO] FST Pay Deployment" -ForegroundColor Green

# Checks
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Docker is not installed" -ForegroundColor Red; exit 1
}
if (-not (Test-Path ".env")) {
    Write-Host "[ERROR] .env file not found. Copy .env.example to .env and fill in values." -ForegroundColor Red; exit 1
}

# Validate required vars (basic check)
$envVars = Get-Content ".env" | Where-Object { $_ -match '^POSTGRES_PASSWORD=|^JWT_SECRET=|^CORS_ALLOWED_ORIGINS=' }
$found = @{}
$envVars | ForEach-Object { $found[$_.Split('=')[0]] = $_.Split('=')[1] }
if (-not $found.ContainsKey('POSTGRES_PASSWORD') -or -not $found['POSTGRES_PASSWORD']) {
    Write-Host "[ERROR] POSTGRES_PASSWORD is required in .env" -ForegroundColor Red; exit 1
}

Write-Host "[INFO] Pulling latest images..."
docker compose pull

Write-Host "[INFO] Building and starting services..."
docker compose up --build -d

Write-Host "[INFO] Waiting for backend health check..."
for ($i = 0; $i -lt 30; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/actuator/health" -TimeoutSec 2 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "[INFO] Backend is healthy!" -ForegroundColor Green
            break
        }
    } catch {}
    if ($i -eq 29) {
        Write-Host "[WARN] Health check timed out. Check logs: docker compose logs fstpay-backend" -ForegroundColor Yellow
    }
    Start-Sleep -Seconds 2
}

Write-Host "[INFO] Deployment complete!" -ForegroundColor Green
Write-Host ""
docker compose ps
Write-Host ""
Write-Host "Frontend:  https://fstpay.com" -ForegroundColor Cyan
Write-Host "Backend:   https://fstpay.com/api" -ForegroundColor Cyan
Write-Host "Logs:      docker compose logs -f" -ForegroundColor Cyan
