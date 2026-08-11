#!/usr/bin/env bash
set -euo pipefail

ADMIN_TOKEN="${1:-}"

if [ -z "$ADMIN_TOKEN" ]; then
    echo "Usage: ./scripts/ops/replay.sh <JWT_ADMIN_TOKEN>"
    exit 1
fi

echo "Invoking Outbox Event Replay Endpoint..."
curl -X POST http://localhost:8080/api/admin/outbox/replay \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json"
echo ""
