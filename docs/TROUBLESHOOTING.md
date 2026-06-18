# FST Pay — Troubleshooting Guide

## Build & Compilation

### Backend: "package org.springframework.boot does not exist"

```
Check: Maven wrapper or installed Maven version
Fix:   mvn clean compile -q
       # If persists: check JAVA_HOME points to JDK 17, not JRE
```

### Backend: "java.lang.UnsupportedClassVersionError"

```
Check: Java version
Fix:   java -version  # must be 17+
       set JAVA_HOME=C:\Program Files\Java\jdk-17
```

### Frontend: "npm ERR! code ERESOLVE"

```
Check: Node.js version
Fix:   node -v  # must be 18+
       npm install --legacy-peer-deps
```

### Frontend: TypeScript compilation errors

```
Check: TypeScript version
Fix:   cd frontend && npx tsc --noEmit
       # Fix any type errors before building
```

---

## Database

### "Connection to localhost:5434 refused"

```
Check: Is PostgreSQL running?
Fix:   docker compose up -d fstpay-postgres
       docker compose logs fstpay-postgres
```

### "Flyway migration failed"

```
Check: Logs for specific SQL error
Fix:   docker compose logs fstpay-backend | grep -i flyway
       # Fix migration SQL, then:
       docker compose exec fstpay-backend ./flyway repair
       docker compose restart fstpay-backend
```

### "ERROR: relation 'users' does not exist"

```
Check: Are migrations applied?
Fix:   docker compose exec fstpay-backend curl localhost:8080/actuator/info
       # If no migrations: check spring.flyway.enabled=true
       # If broken: flyway repair + restart
```

### "PSQLException: FATAL: password authentication failed"

```
Check: POSTGRES_PASSWORD in .env matches docker-compose.yml
Fix:   Update .env or docker-compose.yml to match
       docker compose down -v  # WARNING: destroys data
       docker compose up -d
```

---

## Redis

### "Redis not available. Saving OTP to local map"

```
Check: Is Redis running?
Fix:   docker compose up -d fstpay-redis
       docker compose logs fstpay-redis
```

### "ERR AUTH <password> failed"

```
Check: REDIS_PASSWORD in .env matches docker-compose.yml
Fix:   Update .env or docker-compose.yml
       docker compose restart fstpay-redis
```

---

## Authentication

### "Invalid reCAPTCHA token"

```
Root Cause 1: RECAPTCHA_SECRET_KEY not set in .env
Fix:         Leave RECAPTCHA_SECRET_KEY empty in dev mode
             In dev mode, reCAPTCHA is bypassed when secret is empty

Root Cause 2: Frontend not sending recaptchaToken in request
Fix:         Check VITE_RECAPTCHA_SITE_KEY in frontend/.env
             Ensure recaptchaToken is included in POST body
```

### "Account locked" after a few failed logins

```
Fix:   Wait 15 minutes for automatic unlock
       Or reset in DB: UPDATE users SET login_attempts=0, locked_until=NULL WHERE email='...';
```

### "Please wait before requesting a new OTP"

```
Fix:   Wait 60 seconds between OTP requests
       This is intentional rate-limiting (60s cooldown per email)
```

### JWT token expired

```
Fix:   Use /auth/refresh endpoint with your refresh token
       If refresh token also expired, login again
```

---

## Deployment

### "docker compose command not found"

```
Fix:   Use docker-compose (v1) instead of docker compose (v2)
       Or update Docker Desktop to latest version
```

### Health check timeout on deploy

```
Check: docker compose logs fstpay-backend | tail -50
       Common causes:
       - Database not ready (wait for PostgreSQL health check)
       - Flyway migration stuck
       - Port 8080 already in use
```

### "Port 8080 is already allocated"

```
Fix:   netstat -ano | findstr :8080
       Stop conflicting process or change port in docker-compose.yml
```

### Frontend shows blank page after deploy

```
Check: Browser console for errors
       - 404 on JS/CSS assets → nginx not serving correct dist/
       - CORS errors → CORS_ALLOWED_ORIGINS mismatch
       - API 401 → JWT_SECRET changed (users need to re-login)
```

---

## Security

### SSL certificate expired

```
Fix:   # Renew with Let's Encrypt
       docker compose run --rm certbot renew
       docker compose restart nginx
```

### "Mixed Content" warning in browser

```
Fix:   Ensure all assets loaded over HTTPS
       Check proxy_pass in nginx.conf uses https for backend
```

### Rate limiting too aggressive

```
Check: application.yml → app.rate-limit section
       Adjust: capacity, refillTokens, refillPeriod, cacheMaxSize
       Restart: docker compose restart fstpay-backend
```

---

## Common Error Messages

| Error | Likely Cause | Fix |
|-------|-------------|-----|
| `Whitelabel Error Page` | Backend exception, no handler | Check backend logs |
| `Network Error` | Frontend can't reach backend | Check VITE_API_URL |
| `401 Unauthorized` | Missing/expired JWT | Login again |
| `403 Forbidden` | Insufficient role (not ADMIN) | Check user role |
| `429 Too Many Requests` | Rate limited | Wait and retry |
| `500 Internal Server Error` | Backend crash | Check logs, report bug |

---

## Getting Help

- **GitHub Issues:** https://github.com/fstpay/fstpay/issues
- **Internal Slack:** #fstpay-engineering
- **On-Call:** See PagerDuty schedule

When reporting an issue, include:
1. Steps to reproduce
2. Full error message and stack trace
3. Backend logs from `docker compose logs --tail=100 fstpay-backend`
4. Browser console output (for frontend issues)
5. Environment: local/staging/production
