#!/usr/bin/env bash
set -euo pipefail

PROFILES="${*:-core}"
echo "Starting FST Pay stack with profiles: $PROFILES"

PROFILE_ARGS=""
for p in $PROFILES; do
    PROFILE_ARGS="$PROFILE_ARGS --profile $p"
done

docker compose $PROFILE_ARGS up -d
echo "Stack started successfully."
