Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Checking FST Pay Stack Container Health  " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

Write-Host "`nProbing Backend Health: http://localhost:8080/actuator/health/readiness" -ForegroundColor Yellow
try {
    $res = Invoke-RestMethod -Uri "http://localhost:8080/actuator/health/readiness" -TimeoutSec 5
    Write-Host "[✓] Backend Readiness: $($res | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Host "[X] Backend health check failed: $_" -ForegroundColor Red
}

Write-Host "`nProbing Frontend Health: http://localhost:80/health" -ForegroundColor Yellow
try {
    $res = Invoke-WebRequest -Uri "http://localhost:80/health" -TimeoutSec 5
    Write-Host "[✓] Frontend Health: $($res.Content.Trim())" -ForegroundColor Green
} catch {
    Write-Host "[X] Frontend health check failed: $_" -ForegroundColor Red
}
