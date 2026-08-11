Write-Host "================================================Strict Validation=================" -ForegroundColor Cyan
Write-Host "        FST Pay - 8-Stage Release Smoke Verification Suite       " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

$failures = 0

function Test-Endpoint {
    param (
        [string]$Name,
        [string]$Url,
        [int]$ExpectedCode = 200
    )

    Write-Host -NoNewline "[$Name] Probing $Url ... "
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
        $code = [int]$response.StatusCode
        if ($code -eq $ExpectedCode -or ($ExpectedCode -eq 200 -and $code -ge 200 -and $code -lt 300)) {
            Write-Host "[PASS] (HTTP $code)" -ForegroundColor Green
        } else {
            Write-Host "[FAIL] Expected $ExpectedCode, got $code" -ForegroundColor Red
            $script:failures++
        }
    } catch {
        if ($_.Exception.Response) {
            $code = [int]$_.Exception.Response.StatusCode
            if ($code -eq $ExpectedCode) {
                Write-Host "[PASS] (HTTP $code)" -ForegroundColor Green
                return
            }
        }
        Write-Host "[FAIL] Exception: $($_.Exception.Message)" -ForegroundColor Red
        $script:failures++
    }
}

Test-Endpoint -Name "1/8 Backend Actuator Health" -Url "http://localhost:8080/actuator/health"
Test-Endpoint -Name "2/8 Frontend Health" -Url "http://localhost:80/health"
Test-Endpoint -Name "3/8 Database Health Indicator" -Url "http://localhost:8080/actuator/health/db"
Test-Endpoint -Name "4/8 Redis Health Indicator" -Url "http://localhost:8080/actuator/health/redis"
Test-Endpoint -Name "5/8 Actuator Readiness Probe" -Url "http://localhost:8080/actuator/health/readiness"
Test-Endpoint -Name "6/8 Auth OpenAPI Endpoint" -Url "http://localhost:8080/v3/api-docs"
Test-Endpoint -Name "7/8 Swagger UI Interface" -Url "http://localhost:8080/swagger-ui.html"
Test-Endpoint -Name "8/8 Actuator Metrics Endpoint" -Url "http://localhost:8080/actuator/metrics"

Write-Host "=================================================================" -ForegroundColor Cyan
if ($failures -eq 0) {
    Write-Host " RESULT: ALL 8 SMOKE VERIFICATION TESTS PASSED SUCCESSFULLY! " -ForegroundColor Green
    Write-Host "=================================================================" -ForegroundColor Cyan
    exit 0
} else {
    Write-Host " RESULT: SMOKE VERIFICATION FAILED WITH $failures FAILURE(S). " -ForegroundColor Red
    Write-Host "=================================================================" -ForegroundColor Cyan
    exit 1
}
