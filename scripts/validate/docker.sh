#!/usr/bin/env bash
set -euo pipefail

echo "=========================================="
echo " Validating Docker & Compose Environment "
echo "=========================================="

if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker engine is not installed or not in PATH."
    exit 1
fi

echo "[✓] Docker CLI found: $(docker --version)"

if ! docker info &> /dev/null; then
    echo "ERROR: Docker daemon is not running."
    exit 1
fi

echo "[✓] Docker daemon is running."

if ! docker compose version &> /dev/null; then
    echo "ERROR: Docker Compose plugin is not installed."
    exit 1
fi

echo "[✓] Docker Compose plugin found: $(docker compose version)"

echo "Validation successful: Docker environment is ready."
