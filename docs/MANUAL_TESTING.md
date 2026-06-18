# Manual Testing Guide

## Prerequisites

- Run `docker compose up -d fstpay-postgres fstpay-redis`
- Start backend: `cd backend && mvn spring-boot:run`
- Start frontend: `cd frontend && npm run dev`
- Backend available at `http://localhost:8080`
- Frontend available at `http://localhost:5173`
- Admin credentials (from `.env`): `ADMIN_EMAIL` / `ADMIN_PASSWORD`

All endpoints use `http://localhost:8080/api/v1`.

---

## 1. Failed Login Attempts & Account Lockout

### Steps

```bash
# Attempt 1: wrong password
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"WrongPass1"}'

# Repeat 4 more times (total 5 failures)
# On 6th attempt, account should be locked
```

### Expected Result
- Each failure returns `400 BAD_REQUEST` with `"Invalid email or password"`
- After 5 failures, response says `"Account locked due to too many failed login attempts. Try again in 15 minutes."`

### Reset
Wait 15 minutes or reset directly in DB:
```sql
UPDATE users SET login_attempts = 0, locked_until = NULL WHERE email = 'admin@test.com';
```

---

## 2. OTP Flow

### Steps

```bash
# 1. Login triggers OTP
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Admin@123"}'
# Response: {"success":true,"message":"OTP sent to your email address"}

# 2. Verify with OTP from server logs
# Check backend logs for: "OTP generated for: admin@test.com"
# OTP is 6 digits (e.g., 123456)

# 3. Verify OTP
curl -s -X POST http://localhost:8080/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","otp":"123456"}'
# Response: {"success":true,"data":{"accessToken":"eyJ...","refreshToken":"eyJ...","requiresOtp":false}}
```

### Expected Result
- Valid OTP → 200 with JWT access + refresh tokens
- Invalid OTP → 400 `"Invalid or expired OTP"`
- Expired OTP (5 min) → 400 `"Invalid or expired OTP"`

---

## 3. Token Refresh

### Steps

```bash
# 1. Login to get tokens
LOGIN_RESP=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Admin@123"}')
# Then verify OTP (see section 2 above)

# Extract tokens from verify-otp response
ACCESS_TOKEN="..."
REFRESH_TOKEN="..."

# 2. Use access token
curl -s http://localhost:8080/api/v1/users/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 3. Refresh tokens
curl -s -X POST http://localhost:8080/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"

# 4. Old refresh token should be invalidated
curl -s -X POST http://localhost:8080/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"
# Expected: 400 "Invalid refresh token"
```

### Expected Result
- Refresh returns new access + refresh tokens
- Old refresh token cannot be reused (rotation prevents replay)

---

## 4. Registration

### Steps

```bash
# 1. Register new user (age >= 12)
curl -s -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User","email":"test-'"$(date +%s)"'@example.com","password":"Secure@123","dateOfBirth":"2010-06-15"}'

# 2. Register with underage user (age < 12)
curl -s -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Young User","email":"young-'"$(date +%s)"'@example.com","password":"Secure@123","dateOfBirth":"2020-06-15"}'
```

### Expected Result
- Valid age → `200 OK`, OTP sent
- Underage → `400 BAD_REQUEST` with `"You must be at least 12 years old to register"`

---

## 5. Rate Limiting

### Steps

```bash
# Rapid login attempts (10 in quick succession)
for i in $(seq 1 10); do
  curl -s -o /dev/null -w "%{http_code} " \
    -X POST http://localhost:8080/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@test.com","password":"WrongPass@123"}'
  echo ""
done
```

### Expected Result
- First requests return 400 (wrong password)
- After threshold, requests return 429 TOO_MANY_REQUESTS
- OTP generation per email is rate-limited to 1 per 60 seconds

---

## 6. Invalid Input Testing

### Steps

```bash
# Empty fields
curl -s -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{}'

# Weak password
curl -s -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test","email":"a@b.com","password":"123"}'

# SQL injection attempt
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"'\'' OR 1=1 --"}'

# Negative amount in topup
curl -s -X POST http://localhost:8080/api/v1/wallet/topup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"amount":-100,"paymentMethod":"UPI"}'
```

### Expected Result
- Empty fields → 400 with validation errors
- Weak password → 400 `"Password must be at least 8 characters"`
- SQL injection → 400 `"Invalid email or password"` (no SQL error leaked)
- Negative amount → 400 validation error

---

## 7. API Security Headers

### Steps

```bash
curl -s -D - http://localhost:8080/api/v1/auth/stats | head -20
```

### Expected Headers
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; ...
```

---

## Test Results Log

| Test | Date | Tester | Result | Notes |
|------|------|--------|--------|-------|
| Failed login attempts | | | □ Pass □ Fail | |
| Account lockout (5 attempts) | | | □ Pass □ Fail | |
| OTP generation | | | □ Pass □ Fail | |
| OTP verification | | | □ Pass □ Fail | |
| Token refresh | | | □ Pass □ Fail | |
| Token rotation (replay) | | | □ Pass □ Fail | |
| Registration (valid age) | | | □ Pass □ Fail | |
| Registration (underage) | | | □ Pass □ Fail | |
| Rate limiting (API) | | | □ Pass □ Fail | |
| Rate limiting (OTP) | | | □ Pass □ Fail | |
| Input validation | | | □ Pass □ Fail | |
| SQL injection resistance | | | □ Pass □ Fail | |
| Security headers | | | □ Pass □ Fail | |
