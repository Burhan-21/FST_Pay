Write-Host "Stopping FST Pay container stack..." -ForegroundColor Yellow
docker compose --profile full down
Write-Host "Stack stopped successfully." -ForegroundColor Green
