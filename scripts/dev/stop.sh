#!/usr/bin/env bash
set -euo pipefail

echo "Stopping FST Pay container stack..."
docker compose --profile full down
echo "Stack stopped successfully."
