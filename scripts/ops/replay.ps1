param (
    [Parameter(Mandatory=$true)][string]$AdminToken
)

Write-Host "Invoking Outbox Event Replay Endpoint..." -ForegroundColor Cyan
$headers = @{ "Authorization" = "Bearer $AdminToken" }
$res = Invoke-RestMethod -Uri "http://localhost:8080/api/admin/outbox/replay" -Method Post -Headers $headers
Write-Host "Replay Result: $($res | ConvertTo-Json -Compress)" -ForegroundColor Green
