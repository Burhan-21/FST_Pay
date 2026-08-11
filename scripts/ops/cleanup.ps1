Write-Host "Executing Docker container and dangling image cleanup..." -ForegroundColor Yellow
docker system prune -f
Write-Host "Cleanup completed." -ForegroundColor Green
