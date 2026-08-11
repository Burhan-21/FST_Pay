#!/usr/bin/env bash
set -euo pipefail

echo "Executing Docker container and dangling image cleanup..."
docker system prune -f
echo "Cleanup completed."
