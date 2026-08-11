param (
    [string]$Service = "fstpay-backend"
)

Write-Host "Tailing logs for service: $Service" -ForegroundColor Cyan
docker compose logs -f $Service
