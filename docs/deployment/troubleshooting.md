# FST Pay Diagnostic & Troubleshooting Guide

This guide provides diagnostic workflows for resolving common operational issues in containerized environments.

---

## 1. Diagnostic Workflows

### Issue 1: Backend Container Exits Immediately (Crash-Loop)
**Symptoms**: Container `fstpay-backend` state is `Exited (1)`.

**Diagnostic Steps**:
1. Check backend container logs:
   ```bash
   docker compose logs fstpay-backend
   ```
2. Look for `StartupEnvironmentValidator`:
   - If log shows `CRITICAL: STARTUP ENVIRONMENT VALIDATION FAILED`, check missing or weak environment variables (`JWT_SECRET` length, `CORS_ALLOWED_ORIGINS` wildcard, etc.).
   - Verify `.env` parameters against `docs/deployment/configuration.md`.

---

### Issue 2: Database Connection Failures
**Symptoms**: Log shows `PSQLException: Connection to fstpay-postgres:5432 refused` or `HikariPool - Exception during pool initialization`.

**Diagnostic Steps**:
1. Verify PostgreSQL container status:
   ```bash
   docker compose ps fstpay-postgres
   ```
2. Test database readiness manually:
   ```bash
   docker exec fstpay-postgres pg_isready -U fstpay -d fstpay
   ```
3. Check PostgreSQL logs:
   ```bash
   docker compose logs fstpay-postgres
   ```

---

### Issue 3: Outbox Event Processing Stalls
**Symptoms**: Events are saved to `outbox_events` table but consumers are not processing events.

**Diagnostic Steps**:
1. Check Kafka container health:
   ```bash
   docker compose --profile messaging ps
   ```
2. Run manual event replay trigger:
   ```bash
   ./scripts/ops/replay.sh <ADMIN_TOKEN>
   ```
