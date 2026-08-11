#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-.env}"

echo "=========================================="
echo " Validating Environment Config ($ENV_FILE) "
echo "=========================================="

if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: Environment file '$ENV_FILE' does not exist."
    exit 1
fi

REQUIRED_VARS=("POSTGRES_PASSWORD" "JWT_SECRET" "CORS_ALLOWED_ORIGINS")

for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -E "^${var}=" "$ENV_FILE" > /dev/null; then
        echo "ERROR: Required property '$var' is missing in $ENV_FILE."
        exit 1
    fi
    val=$(grep -E "^${var}=" "$ENV_FILE" | cut -d'=' -f2-)
    if [ -z "$val" ]; then
        echo "ERROR: Required property '$var' is empty in $ENV_FILE."
        exit 1
    fi
done

echo "[✓] Environment file '$ENV_FILE' contains all mandatory variables."
