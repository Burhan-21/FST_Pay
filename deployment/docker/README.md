# Docker Deployment Configurations

This directory maintains container deployment recipes for local development, staging, and self-hosted environments.

---

## Files

- `docker-compose.prod.yml`: Production multi-container composition (PostgreSQL 16, Redis 7, Kafka 3.7, Backend, and Frontend Nginx).
- `docker-compose.override.yml`: Local developer overrides (e.g. port mapping, environment overrides).

## Quick Run

```bash
# Run production profile locally or on VM
docker compose -f deployment/docker/docker-compose.prod.yml up -d --build
```
