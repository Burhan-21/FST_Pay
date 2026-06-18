# Pre-Deployment Checklist

## 1. Security Scan

### Automated Scans

```bash
# Check for hardcoded secrets
grep -rn "password\s*=\s*['\"]" backend/src/ --include="*.java" --include="*.yml" --include="*.properties"
# Should find only ${...} environment variable references

# Check for exposed endpoints
grep -rn "@RequestMapping\|@GetMapping\|@PostMapping" backend/src/main/java/ | grep -v test

# Check for debug/dev settings
grep -rn "spring\.devtools\|debug=true\|show-sql" backend/src/main/resources/
# Should be in application.yml only if conditional on profile
```

### Dependency Vulnerabilities

```bash
# Backend
cd backend
mvn dependency-check:check          # OWASP dependency check
mvn versions:display-dependency-updates

# Frontend
cd frontend
npm audit                           # Check for vulnerable packages
npm outdated                        # Check for outdated packages
```

### Manual Security Review

- [ ] No hardcoded secrets in source code (verified above)
- [ ] `.env` in `.gitignore` (verified: `cat .gitignore | grep .env`)
- [ ] JWT secret is strong and unique per environment
- [ ] CORS origins restricted to known domains
- [ ] SSL/TLS configured for all external endpoints
- [ ] Rate limiting configured for auth endpoints
- [ ] Account lockout enabled (5 attempts, 15 min lockout)
- [ ] Password policy enforced (8+ chars, mixed case, digits, special)
- [ ] reCAPTCHA enabled on registration and login
- [ ] Security headers present (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- [ ] No sensitive data in API error messages
- [ ] Database backups encrypted

---

## 2. Performance Baseline

### Metrics to Record

| Metric | Tool/Command | Baseline Value | Pre-Deploy | Post-Deploy |
|--------|-------------|----------------|------------|-------------|
| API p95 response time | `curl -w "%{time_total}"` | < 200ms | | |
| API p99 response time | Load test | < 500ms | | |
| Registration throughput | `hey -n 100 -c 10` | > 50 req/s | | |
| Login throughput | `hey -n 100 -c 10` | > 50 req/s | | |
| Token refresh throughput | `hey -n 100 -c 10` | > 100 req/s | | |
| Memory usage (idle) | Docker stats | < 512MB | | |
| Memory usage (load) | Docker stats | < 1GB | | |
| DB connections (idle) | `SELECT count(*) FROM pg_stat_activity` | < 10 | | |
| DB connections (load) | `SELECT count(*) FROM pg_stat_activity` | < 30 | | |

### Load Test Commands

```bash
# Install hey (Go HTTP load tester)
# https://github.com/rakyll/hey

# Test registration endpoint
hey -n 200 -c 20 -m POST \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Load Test","email":"load-'"$(date +%s)"'@test.com","password":"LoadTest@123","dateOfBirth":"2005-06-15"}' \
  http://localhost:8080/api/v1/auth/register

# Test authenticated endpoint (after obtaining token)
ACCESS_TOKEN="..."
hey -n 500 -c 20 \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  http://localhost:8080/api/v1/users/me

# Test public stats (unauthenticated)
hey -n 1000 -c 50 \
  http://localhost:8080/api/v1/auth/stats
```

### Check for

- Memory leak: run load test for 5 minutes, verify memory stabilizes
- Connection pool exhaustion: verify DB connections within pool limits
- Rate limiting not triggered for legitimate traffic
- No 5xx errors (0% error rate under normal load)

---

## 3. Rollback Plan

### Quick Rollback (Docker Compose)

```bash
# If deployment causes errors:
# Option A: Revert to previous image tag
export PREVIOUS_TAG="v1.2.3"  # git tag of last working version
docker compose stop
docker compose up -d  # uses :latest from registry

# Option B: Rebuild from previous git commit
git log --oneline -5
git checkout <previous-working-commit>
docker compose up --build -d
```

### Database Rollback

```bash
# If Flyway migration causes issues:

# 1. Stop backend (prevents further writes)
docker compose stop fstpay-backend

# 2. Restore from backup
pg_restore --clean --if-exists \
  -h localhost -U fstpay -d fstpay \
  /backups/fstpay-pre-deploy-$(date +%Y%m%d).dump

# 3. Clean Flyway tracking for undone migration
docker compose exec fstpay-backend \
  ./flyway repair

# 4. Restart with old code
git checkout <pre-migration-tag>
docker compose up --build -d
```

### DNS / Traffic Rollback

```bash
# If using blue-green or canary:
# Switch load balancer to point to previous deployment group

# If using simple DNS:
# Update DNS A record to point to previous VM IP
# Wait for TTL to propagate (typically 60-300s)
```

### Data Safety

- Production database backed up immediately before deployment
- Backups stored in separate location from production VMs
- Backup retention: daily for 30 days, weekly for 6 months, monthly for 2 years
- Backups encrypted at rest with GPG

---

## 4. Final Pre-Deployment Checklist

- [ ] All 71 tests pass (33 unit + 5 integration + 33 frontend)
- [ ] No lint errors (frontend: `npm run lint`)
- [ ] Frontend builds with 0 TypeScript errors
- [ ] Backend compiles with 0 errors
- [ ] Security scan complete — no critical/high vulnerabilities
- [ ] Performance baseline recorded
- [ ] Database backup taken
- [ ] `.env` file verified with correct production values
- [ ] SSL certificates valid (> 30 days until expiry)
- [ ] DNS records point to correct target
- [ ] Rollback plan documented and shared with team
- [ ] Deployment window agreed with stakeholders
- [ ] Monitoring dashboards ready (Grafana/Datadog)
- [ ] On-call engineer notified
- [ ] Feature flags configured (if applicable)
- [ ] Smoke test script prepared
- [ ] `CHANGELOG.md` updated with release notes

---

## 5. Post-Deployment Verification

```bash
# 1. Health check
curl -f https://fstpay.com/actuator/health || echo "FAIL"

# 2. Public API
curl -f https://fstpay.com/api/v1/auth/stats || echo "FAIL"

# 3. Auth flow (smoke test)
EMAIL="smoke-$(date +%s)@test.com"
curl -s -X POST https://fstpay.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"fullName\":\"Smoke Test\",\"email\":\"$EMAIL\",\"password\":\"SmokeTest@123\",\"dateOfBirth\":\"2005-06-15\"}"

# 4. Error rate check
docker compose logs --tail=200 fstpay-backend | grep -c "ERROR\|Exception"
# Should be 0

# 5. Performance check
curl -w "p95: %{time_total}s\n" -o /dev/null -s https://fstpay.com/api/v1/auth/stats
```

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Development Lead | | | |
| QA Lead | | | |
| Security Lead | | | |
| DevOps Lead | | | |
| Product Manager | | | |
