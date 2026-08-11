# FST Pay Platform - Production Operational Runbook

This manual defines standard operating procedures (SOPs) for managing, deploying, operating, and restoring the FST Pay container stack.

---

## 1. Environment & System Prerequisites

- **Docker Engine**: Version `24.0+`
- **Docker Compose**: Version `2.20+`
- **System Memory**: Minimum `4 GB` free RAM (`8 GB` recommended for full profile)
- **Ports Required**:
  - `8080`: Backend REST API & Actuator
  - `80`: Frontend UI / Nginx
  - `5434`: PostgreSQL
  - `6380`: Redis
  - `9092`: Kafka (Messaging profile)
  - `8081`: Kafka UI (Messaging profile)
  - `16686`: Jaeger UI (Observability profile)

---

## 2. Startup Sequence

### Step 2.1: Verify Prerequisites & Environment
```bash
# Validate Docker installation & daemon
./scripts/validate/docker.sh

# Validate environment properties
./scripts/validate/environment.sh .env.prod
```

### Step 2.2: Launch Core Services Stack
To launch the core stack (PostgreSQL, Redis, Backend, Frontend):
```bash
./scripts/dev/start.sh core
```

To launch the full platform stack including Kafka and Jaeger tracing:
```bash
./scripts/dev/start.sh full
```

---

## 3. Operations & Observability

### Health Monitoring
```bash
# Probe container states & endpoints
./scripts/ops/health.sh
```

### Log Aggregation
```bash
# Stream backend logs
./scripts/ops/logs.sh fstpay-backend

# Stream frontend logs
./scripts/ops/logs.sh fstpay-frontend
```

### Outbox Event Replay (Operations)
```bash
# Replay unprocessed/failed outbox events
./scripts/ops/replay.sh <ADMIN_JWT_TOKEN>
```

---

## 4. Disaster Recovery & Rollback

### Database Backup
```bash
docker exec fstpay-postgres pg_dump -U fstpay fstpay > fstpay_backup_$(date +%Y%m%d_%H%M%S).sql
```

### Database Restore
```bash
cat fstpay_backup.sql | docker exec -i fstpay-postgres psql -U fstpay -d fstpay
```

### Stack Shutdown & Volume Reset
```bash
# Stop containers gracefully
./scripts/dev/stop.sh

# Full stack reset (erases state for clean re-deploy)
./scripts/dev/reset.sh
```

---

## 5. Deployment Verification Checklist

Before certifying a production deployment:
- [ ] `./scripts/validate/docker.sh` returns `PASS`.
- [ ] `./scripts/validate/environment.sh .env` returns `PASS`.
- [ ] `docker compose ps` shows all containers in `healthy` status.
- [ ] `./scripts/release/smoke-test.sh` completes all 8 stages with `0` failures.
