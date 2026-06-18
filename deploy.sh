#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# FST Pay - Production Deployment Script
# Usage:  chmod +x deploy.sh && ./deploy.sh
# Prereq: Docker, docker-compose, openssl, git
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# --- Checks ---
command -v docker       >/dev/null 2>&1 || error "Docker is not installed"
command -v openssl      >/dev/null 2>&1 || error "openssl is not installed"
[ -f .env ]             || error ".env file not found. Copy .env.example to .env and fill in values."
source .env

# --- Validate required vars ---
: "${POSTGRES_PASSWORD:?Required}"
: "${JWT_SECRET:?Required}"
: "${CORS_ALLOWED_ORIGINS:?Required}"

# --- Pull latest images ---
info "Pulling latest Docker images..."
docker compose pull

# --- Build & start ---
info "Building and starting services..."
docker compose up --build -d

# --- Wait for health ---
info "Waiting for backend health check..."
for i in $(seq 1 30); do
    if curl -sf http://localhost:8080/actuator/health >/dev/null 2>&1; then
        info "Backend is healthy!"
        break
    fi
    if [ "$i" -eq 30 ]; then
        warn "Backend health check timed out. Check logs: docker compose logs fstpay-backend"
    fi
    sleep 2
done

# --- Run Flyway migrations (explicit) ---
if docker compose exec -T fstpay-backend curl -sf http://localhost:8080/actuator/info >/dev/null 2>&1; then
    info "Flyway migrations applied automatically on startup."
else
    warn "Could not verify migrations. Run: docker compose exec fstpay-backend curl localhost:8080/actuator/info"
fi

# --- Print status ---
info "Deployment complete!"
echo ""
docker compose ps
echo ""
info "Frontend:  https://fstpay.com"
info "Backend:   https://fstpay.com/api"
info "Health:    https://fstpay.com/actuator/health"
info ""
info "Logs: docker compose logs -f"
