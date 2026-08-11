param (
    [string]$EnvFile = ".env"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Validating Environment Config ($EnvFile) " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

if (-not (Test-Path $EnvFile)) {
    Write-Error "ERROR: Environment file '$EnvFile' does not exist."
    exit 1
}

$requiredVars = @("POSTGRES_PASSWORD", "JWT_SECRET", "CORS_ALLOWED_ORIGINS")
$content = Get-Content $EnvFile

foreach ($var in $requiredVars) {
    $line = $content | Where-Object { $_ -match "^${var}=" }
    if (-not $line) {
        Write-Error "ERROR: Required property '$var' is missing in $EnvFile."
        exit 1
    }
    $val = ($line -split '=', 2)[1]
    if ([string]::IsNullOrWhiteSpace($val)) {
        Write-Error "ERROR: Required property '$var' is empty in $EnvFile."
        exit 1
    }
}

Write-Host "[✓] Environment file '$EnvFile' contains all mandatory variables." -ForegroundColor Green
