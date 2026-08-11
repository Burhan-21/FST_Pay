param (
    [string[]]$Profiles = @("core")
)

$profileArgs = $Profiles | ForEach-Object { "--profile $_" }
$cmd = "docker compose $profileArgs up -d"
Write-Host "Executing: $cmd" -ForegroundColor Cyan
Invoke-Expression $cmd
Write-Host "Stack started successfully." -ForegroundColor Green
