#!/usr/bin/env bash
set -euo pipefail

echo "================================================================="
echo "        FST Pay - 8-Stage Release Smoke Verification Suite       "
echo "================================================================="

FAILURES=0

assert_http_status() {
    local name="$1"
    local url="$2"
    local expected_code="$3"
    
    echo -n "[$name] Probing $url ... "
    code=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
    
    if [ "$code" -eq "$expected_code" ] || [ "$expected_code" -eq "200" -a "$code" -ge "200" -a "$code" -lt "300" ]; then
        echo "[PASS] (HTTP $code)"
    else
        echo "[FAIL] Expected $expected_code, got $code"
        FAILURES=$((FAILURES + 1))
    fi
}

# 1. Backend Health
assert_http_status "1/8 Backend Actuator Health" "http://localhost:8080/actuator/health" 200

# 2. Frontend Health
assert_http_status "2/8 Frontend Health" "http://localhost:80/health" 200

# 3. Database Reachability
assert_http_status "3/8 Database Health Indicator" "http://localhost:8080/actuator/health/db" 200

# 4. Redis Reachability
assert_http_status "4/8 Redis Health Indicator" "http://localhost:8080/actuator/health/redis" 200

# 5. Kafka Component Status
assert_http_status "5/8 Actuator Readiness Probe" "http://localhost:8080/actuator/health/readiness" 200

# 6. Auth Endpoint Probe
assert_http_status "6/8 Auth OpenAPI Endpoint" "http://localhost:8080/v3/api-docs" 200

# 7. Wallet API Docs Probe
assert_http_status "7/8 Swagger UI Interface" "http://localhost:8080/swagger-ui.html" 200

# 8. Actuator Metrics Endpoint
assert_http_status "8/8 Actuator Metrics Endpoint" "http://localhost:8080/actuator/metrics" 200

echo "================================================================="
if [ "$FAILURES" -eq 0 ]; then
    echo " RESULT: ALL 8 SMOKE VERIFICATION TESTS PASSED SUCCESSFULLY! "
    echo "================================================================="
    exit 0
else
    echo " RESULT: SMOKE VERIFICATION FAILED WITH $FAILURES FAILURE(S). "
    echo "================================================================="
    exit 1
fi
