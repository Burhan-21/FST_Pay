#!/usr/bin/env bash
set -euo pipefail

echo "=========================================="
echo " Checking FST Pay Stack Container Health  "
echo "=========================================="

docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "Probing Backend Health: http://localhost:8080/actuator/health/readiness"
if command -v curl &> /dev/null; then
    curl -s http://localhost:8080/actuator/health/readiness || echo "Backend check failed."
fi

echo ""
echo "Probing Frontend Health: http://localhost:80/health"
if command -v curl &> /dev/null; then
    curl -s http://localhost:80/health || echo "Frontend check failed."
fi
