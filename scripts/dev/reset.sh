#!/usr/bin/env bash
set -euo pipefail

echo "Resetting FST Pay stack (stopping containers and purging volumes)..."
docker compose --profile full down -v --remove-orphans
echo "Stack reset complete."
