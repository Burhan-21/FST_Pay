#!/usr/bin/env bash
set -euo pipefail

SERVICE="${1:-fstpay-backend}"
echo "Tailing logs for service: $SERVICE"
docker compose logs -f "$SERVICE"
