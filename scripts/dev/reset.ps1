Write-Host "Resetting FST Pay stack (stopping containers and purging volumes)..." -ForegroundColor Red
docker compose --profile full down -v --remove-orphans
Write-Host "Stack reset complete." -ForegroundColor Green
