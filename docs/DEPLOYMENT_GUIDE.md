# FST Pay — Deployment Guide

## Environments

| Environment | URL | Infrastructure | Notes |
|-------------|-----|---------------|-------|
| Local Dev | http://localhost:5173 | Docker Compose | Hot-reload frontend |
| Staging | https://staging.fstpay.com | Docker on single VM | Prior to production |
| Production | https://fstpay.com | Docker Compose / K8s | Live users |

---

## 1. Local Development

### Infrastructure

```bash
docker compose up -d fstpay-postgres fstpay-redis
```

### Backend

```bash
cd backend
cp .env.example ../.env   # edit secrets
mvn clean compile -q       # verify compilation
mvn test                   # 33 unit tests
mvn spring-boot:run        # http://localhost:8080
```

### Frontend

```bash
cd frontend
npm install
npm run test               # 33 unit tests
npm run dev                # http://localhost:5173
```

### Integration Tests (require Docker)

```bash
cd backend
mvn test -Dtest="com.fstpay.integration.*" -DfailIfNoTests=false
```

---

## 2. Staging Deployment

### Prerequisites
- Docker & Docker Compose v2 on target VM
- Domain pointing to VM with SSL cert
- `.env` file with staging secrets

### Steps

```bash
git pull origin main
cp .env.example .env          # populate with staging values
chmod +x deploy.sh && ./deploy.sh
```

The deploy script:
1. Validates required environment variables
2. Pulls latest Docker images
3. Builds and starts containers
4. Waits for health check (up to 60s)
5. Verifies Flyway migrations

### Verify Deployment

```bash
curl https://staging.fstpay.com/actuator/health
curl https://staging.fstpay.com/api/v1/auth/stats
```

---

## 3. Production Deployment

### Pre-Flight Checklist

- [ ] All 71 tests passing (33 unit + 5 integration + 33 frontend)
- [ ] Manual testing completed and signed off
- [ ] `.env` populated with production secrets (rotate all passwords)
- [ ] SSL certificates valid → not expiring within 30 days
- [ ] Database backup taken
- [ ] DNS propagated (check with `dig`)
- [ ] Rollback plan documented (see below)

### Automated Deployment

```bash
# Linux
chmod +x deploy.sh && ./deploy.sh

# Windows
.\deploy.ps1
```

### Manual Deployment (if automation fails)

```bash
# 1. Build images
docker compose build --no-cache

# 2. Push to registry (if using remote)
docker tag fstpay-backend:latest registry.fstpay.com/fstpay-backend:latest
docker tag fstpay-frontend:latest registry.fstpay.com/fstpay-frontend:latest
docker push registry.fstpay.com/fstpay-backend:latest
docker push registry.fstpay.com/fstpay-frontend:latest

# 3. Pull on production
ssh deploy@prod.fstpay.com
cd /opt/fstpay
git pull
docker compose pull
docker compose up -d

# 4. Verify
docker compose ps
curl http://localhost:8080/actuator/health
```

### Database Migrations

Flyway runs migrations automatically on startup. To manually trigger:

```bash
docker compose exec fstpay-backend curl http://localhost:8080/actuator/info
# Look for: "flyway": {"migrations": [{"version": "6", ...}]}
```

If a migration fails:
1. Check logs: `docker compose logs fstpay-backend`
2. Fix the migration SQL
3. Repair Flyway: `docker compose exec fstpay-backend ./flyway repair`
4. Restart: `docker compose restart fstpay-backend`

---

## 4. Environment Variables Reference

| Variable | Required | Staging Value | Production Value | Notes |
|----------|----------|---------------|------------------|-------|
| `POSTGRES_PASSWORD` | Yes | `<staging-pw>` | `<prod-pw>` | 32+ chars, rotate quarterly |
| `JWT_SECRET` | Yes | `<staging-secret>` | `<prod-secret>` | Base64 256-bit, unique per env |
| `CORS_ALLOWED_ORIGINS` | Yes | `https://staging.fstpay.com` | `https://fstpay.com` | Comma-separated |
| `MAIL_USERNAME` | No | SMTP user | SMTP user | |
| `MAIL_PASSWORD` | No | SMTP password | SMTP password | |
| `ADMIN_EMAIL` | No | `admin@fstpay.com` | `ops@fstpay.com` | |
| `ADMIN_PASSWORD` | No | `<staging-admin-pw>` | `<prod-admin-pw>` | Min 8 chars |
| `RECAPTCHA_SECRET_KEY` | No | reCAPTCHA v2 key | reCAPTCHA v2 key | |
| `GEMINI_API_KEY` | No | Gemini API key | Gemini API key | For AI Coach |
| `REDIS_PASSWORD` | No | Redis password | Redis password | |
| `LOG_LEVEL` | No | `DEBUG` | `WARN` | Lower in production |

---

## 5. Rollback Plan

### Scenario: Deployment causes errors

```bash
# 1. Revert to previous tag
docker compose stop
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d

# Or use previous image tag
docker pull registry.fstpay.com/fstpay-backend:previous-tag
docker tag registry.fstpay.com/fstpay-backend:previous-tag fstpay-backend:latest
docker compose up -d
```

### Scenario: Database migration fails

```bash
# 1. Stop the broken deployment
docker compose stop fstpay-backend

# 2. Restore database from backup
pg_restore -h localhost -U fstpay -d fstpay /backups/pre-deployment.dump

# 3. Roll back application code
git revert HEAD
docker compose up --build -d
```

### Scenario: Critical security issue

```bash
# 1. Block all traffic at nginx/load balancer level
# 2. Assess impact
# 3. Apply hotfix
git checkout -b hotfix/security-issue
# ... fix ...
git commit -m "fix: critical security issue"
git push origin hotfix/security-issue
# Deploy hotfix via CI/CD
# 4. After fix verified, restore traffic
```

### Backup Strategy

- **Database:** Daily `pg_dump` at 2 AM, retain 30 days
- **Environment:** `.env` backed up to vault/password manager
- **Images:** Each deploy tagged with git SHA; retain last 10

---

## 6. Monitoring

### Health Check Endpoints

| Endpoint | Purpose | Expected |
|----------|---------|----------|
| `/actuator/health` | Overall health | `{"status":"UP"}` |
| `/actuator/info` | Build info + Flyway status | App version + migrations |
| `/actuator/metrics` | JVM + request metrics | |
| `/api/v1/auth/stats` | Public API check | `{"success":true}` |

### Alerting Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Response time (p95) | > 500ms | > 2s | Scale up / investigate |
| Error rate | > 1% | > 5% | Rollback if spike |
| DB connections | > 80% | > 95% | Increase pool / optimize |
| Disk usage | > 80% | > 90% | Clean up / expand volume |
| SSL expiry | < 30 days | < 7 days | Renew certificate |

---

## 7. Post-Deployment Verification

```bash
# 1. Health check
curl -f https://fstpay.com/actuator/health

# 2. Public API
curl -f https://fstpay.com/api/v1/auth/stats

# 3. Authenticated flow
# Register, login, verify OTP, get wallet balance

# 4. Check logs for errors
docker compose logs --tail=50 fstpay-backend | grep ERROR

# 5. Verify security headers
curl -s -D - https://fstpay.com/api/v1/auth/stats | grep -i "^X-"

# 6. Check monitoring dashboard
# Confirm error rate, response times, traffic all normal
```
