# Login/Signup Flow Testing Guide

**Application:** FST Pay  
**Test Date:** June 17, 2026  
**Credentials Provided:**
- Email: `smburhan.personal@gmail.com` (Note: You provided "perosnal" - using "personal")
- Password: `Burhan@1234`

---

## 📋 Prerequisites

### Required Services (Must be Running)
1. **PostgreSQL Database**
   - Host: `localhost`
   - Port: `5434`
   - Database: `fstpay`
   - Username: `fstpay`
   - Password: Set via `SPRING_DATASOURCE_PASSWORD` environment variable

2. **Redis Cache**
   - Host: `localhost`
   - Port: `6380`
   - Used for: OTP storage, rate limiting

3. **SMTP Mail Server** (Optional - for email notifications)
   - Host: Configured via `MAIL_HOST`
   - Port: Configured via `MAIL_PORT`
   - Username: Configured via `MAIL_USERNAME`
   - Password: Configured via `MAIL_PASSWORD`

### Environment Variables Required

Create a `.env` file or set these system variables before running:

```bash
# Database
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5434/fstpay
SPRING_DATASOURCE_USERNAME=fstpay
SPRING_DATASOURCE_PASSWORD=<your-db-password>

# Redis
SPRING_REDIS_HOST=localhost
SPRING_REDIS_PORT=6380

# JWT Configuration
JWT_SECRET=<min-32-characters-secret-key>
JWT_EXPIRATION_HOURS=24
JWT_OTP_EXPIRATION_MINUTES=10

# ReCAPTCHA (Get from https://www.google.com/recaptcha/admin)
RECAPTCHA_SECRET_KEY=<your-recaptcha-secret>
RECAPTCHA_SITE_KEY=<your-recaptcha-site-key>

# Email Configuration
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=<your-email@gmail.com>
MAIL_PASSWORD=<your-app-password>

# Admin User (Optional)
APP_ADMIN_EMAIL=admin@fstpay.com
APP_ADMIN_PASSWORD=<strong-password>
APP_ADMIN_FULLNAME=Admin User
```

---

## 🚀 Setup & Startup

### Step 1: Start PostgreSQL
```bash
# Using Docker
docker run -d --name fstpay-db \
  -e POSTGRES_DB=fstpay \
  -e POSTGRES_USER=fstpay \
  -e POSTGRES_PASSWORD=yourpassword \
  -p 5434:5432 \
  postgres:15

# OR if you have PostgreSQL installed locally
createdb -p 5434 -U fstpay fstpay
```

### Step 2: Start Redis
```bash
# Using Docker
docker run -d --name fstpay-redis \
  -p 6380:6379 \
  redis:7-alpine

# OR if you have Redis installed locally
redis-server --port 6380
```

### Step 3: Set Environment Variables
**Windows PowerShell:**
```powershell
$env:SPRING_DATASOURCE_PASSWORD = "yourpassword"
$env:JWT_SECRET = "your-32-character-minimum-secret-key-12345"
$env:RECAPTCHA_SECRET_KEY = "your-recaptcha-secret"
$env:RECAPTCHA_SITE_KEY = "your-recaptcha-site-key"
$env:MAIL_PASSWORD = "your-app-password"
```

**Linux/Mac:**
```bash
export SPRING_DATASOURCE_PASSWORD="yourpassword"
export JWT_SECRET="your-32-character-minimum-secret-key-12345"
export RECAPTCHA_SECRET_KEY="your-recaptcha-secret"
export RECAPTCHA_SITE_KEY="your-recaptcha-site-key"
export MAIL_PASSWORD="your-app-password"
```

### Step 4: Start Backend
```bash
cd backend
mvn clean package -DskipTests
java -jar target/fstpay-backend-1.0.0.jar
```

Expected output:
```
... Started FstPayApplication in 15.234 seconds (process running for 16.891)
... Tomcat started on port(s): 8080 (http) with context path ''
```

### Step 5: Start Frontend
```bash
cd frontend
npm install
npm run dev
```

Expected output:
```
  ➜  Local:   http://localhost:5173/
  ➜  press h + enter to show help
```

---

## ✅ Testing Checklist

### 1. Signup Flow

**Test Case 1.1: Register New Account**

1. Open browser: `http://localhost:5173`
2. Click on **"Sign Up"** link
3. Fill in the registration form:
   - **Full Name:** Burhan Test
   - **Email:** smburhan.personal@gmail.com
   - **Password:** Burhan@1234
   - **Confirm Password:** Burhan@1234
   - **Date of Birth:** 1990-01-15 (Must be 12+)

4. **Verify CAPTCHA:**
   - ✅ reCAPTCHA v2 checkbox should appear
   - ✅ Check the reCAPTCHA box
   - ✅ Should see success message

5. **Click Register:**
   - ✅ Should see loading indicator
   - ✅ Should receive email with OTP (if mail configured)
   - ✅ Should redirect to "OTP Verification" page

**Expected Result:** ✅ User sees OTP verification screen

---

**Test Case 1.2: Verify OTP During Signup**

1. Check email for OTP code (or check Redis: `redis-cli -p 6380 keys "otp:*"`)
2. On OTP verification screen, enter the 6-digit code
3. Click **"Verify OTP"**
4. **Expected Result:** 
   - ✅ Account created successfully
   - ✅ Redirected to login page
   - ✅ Account can now be used for login

**Password Validation During Signup:**
- ✅ Minimum 8 characters (Burhan@1234 = 11 chars ✅)
- ✅ Uppercase letter: B, T ✅
- ✅ Lowercase letter: u, r, h, a, n, t, e, s, t ✅
- ✅ Number: 1, 2, 3, 4 ✅
- ✅ Special character: @ ✅

---

### 2. Login Flow

**Test Case 2.1: Successful Login**

1. Open `http://localhost:5173`
2. Click **"Login"** (if redirected from signup)
3. Enter credentials:
   - **Email:** smburhan.personal@gmail.com
   - **Password:** Burhan@1234

4. **Verify CAPTCHA:**
   - ✅ reCAPTCHA checkbox appears
   - ✅ Check reCAPTCHA
   - ✅ "Verify CAPTCHA" button appears

5. Click **"Verify CAPTCHA"** then **"Login"**

6. **Verify OTP Screen:**
   - ✅ Message: "OTP sent to smburhan.personal@gmail.com"
   - ✅ OTP input field appears
   - ✅ "Resend OTP" button available

**Expected Result:** ✅ OTP verification screen displayed

---

**Test Case 2.2: OTP Verification After Login**

1. Check email or Redis for OTP
2. Enter 6-digit OTP code
3. Click **"Verify"** or **"Verify OTP"**

**Expected Result:**
- ✅ JWT token received
- ✅ Redirected to dashboard
- ✅ User info displayed
- ✅ "Logout" button visible

**Network check:**
```bash
# JWT Token should be in response:
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "id": "...",
      "email": "smburhan.personal@gmail.com",
      "fullName": "Burhan Test",
      "role": "USER"
    }
  }
}
```

---

### 3. Account Lockout Testing

**Test Case 3.1: Failed Login Attempts**

**Required:** Account must exist (from signup test)

1. On login page, enter correct email but WRONG password (5 times):
   - Attempt 1: Wrong password → ✅ "Invalid email or password"
   - Attempt 2: Wrong password → ✅ "Invalid email or password"
   - Attempt 3: Wrong password → ✅ "Invalid email or password"
   - Attempt 4: Wrong password → ✅ "Invalid email or password"
   - Attempt 5: Wrong password → ✅ **ACCOUNT LOCKED**

2. **After 5 Failed Attempts:**
   - ✅ Error message: "Account locked. Try again in 15 minutes."
   - ✅ Login button disabled or shows countdown
   - ✅ Cannot login with correct password until 15 mins pass

3. **After 15 Minutes:**
   - ✅ Can login again with correct password
   - ✅ Login attempts counter resets

**Database Verification:**
```sql
-- Connect to PostgreSQL
psql -h localhost -p 5434 -U fstpay -d fstpay

-- Check user account
SELECT id, email, login_attempts, locked_until 
FROM users 
WHERE email = 'smburhan.personal@gmail.com';

-- Expected output:
-- id | email | login_attempts | locked_until
-- uuid | smburhan.personal@gmail.com | 0 | NULL (after successful login)
-- uuid | smburhan.personal@gmail.com | 5 | 2026-06-17 11:10:00+00 (locked)
```

---

### 4. Rate Limiting Testing

**Test Case 4.1: Rate Limiting per Endpoint**

**Authentication Endpoint Rate Limit:** 10 requests/minute

1. Make 10 login attempts quickly:
```bash
for i in {1..10}; do
  curl -X POST http://localhost:8080/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"password"}'
done
```

2. On 11th request:
   - ✅ Status code: `429 (Too Many Requests)`
   - ✅ Header: `Retry-After: 60`
   - ✅ Error message: "Rate limit exceeded"

**Expected Result:** ✅ 11th request blocked

---

**Test Case 4.2: Rate Limiting Bypass Detection**

1. Try to spoof IP using X-Forwarded-For header:
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "X-Forwarded-For: 192.168.1.1" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

2. **Expected Result:**
   - ✅ Request NOT bypassed (should still count toward rate limit)
   - ✅ Attacker cannot bypass rate limiting with spoofed IPs

---

### 5. JWT Token Management

**Test Case 5.1: Token Refresh**

1. After successful login + OTP:
   - ✅ Receive `accessToken` (24-hour expiry)
   - ✅ Receive `refreshToken` (7-day expiry)

2. Call any protected endpoint with accessToken:
```bash
curl -H "Authorization: Bearer <accessToken>" \
  http://localhost:8080/api/user/profile
```
- ✅ Status: 200 OK
- ✅ User data returned

3. Wait for token to expire (or modify header to invalid token):
```bash
curl -H "Authorization: Bearer <invalid-token>" \
  http://localhost:8080/api/user/profile
```
- ✅ Status: 401 Unauthorized

4. **Automatic Refresh (Frontend):**
   - Frontend should automatically call refresh endpoint
   - Receive new accessToken
   - Retry original request
   - ✅ Request succeeds transparently

---

### 6. Type Safety Validation

**Test Case 6.1: Input Validation**

1. Try signup with invalid inputs:

   **Invalid Email:**
   ```
   Email: "invalid-email" (no @)
   Expected: ✅ Error: "Invalid email format"
   ```

   **Weak Password:**
   ```
   Password: "short" (5 characters < 8 min)
   Expected: ✅ Error: "Password must be at least 8 characters"
   ```

   **Invalid DOB (Age < 12):**
   ```
   DOB: 2020-01-01 (6 years old)
   Expected: ✅ Error: "Must be at least 12 years old"
   ```

2. **Expected Result:** ✅ All validations working client-side

---

### 7. CAPTCHA Verification

**Test Case 7.1: Real reCAPTCHA**

**Prerequisites:**
- Must have valid `RECAPTCHA_SECRET_KEY` and `RECAPTCHA_SITE_KEY`
- Get these from: https://www.google.com/recaptcha/admin

**Steps:**

1. On signup/login page, observe reCAPTCHA:
   - ✅ reCAPTCHA v2 checkbox visible
   - ✅ Google branding visible
   - ✅ Accessible for all users

2. Check reCAPTCHA box:
   - ✅ May show "I'm not a robot" challenge
   - ✅ May auto-verify
   - ✅ Status changes to checked

3. Submit form:
   - ✅ Frontend sends reCAPTCHA token
   - ✅ Backend verifies token with Google
   - ✅ Only proceeds if valid

**Invalid CAPTCHA Test:**

1. Try to submit without checking:
   - ✅ Form submission blocked
   - ✅ Error: "Please complete the reCAPTCHA"

2. Try with invalid token:
   - ✅ Backend returns: "CAPTCHA verification failed"

---

## 🔍 Debugging & Monitoring

### Check Backend Logs
```bash
# If running in terminal
# Look for errors like:
# - "Connection refused" (Redis not running)
# - "Connection to ... refused" (Database not running)
# - "Invalid JWT secret" (JWT_SECRET not set)
```

### Monitor Redis
```bash
# Connect to Redis
redis-cli -p 6380

# Check OTP storage
KEYS "otp:*"
GET "otp:smburhan.personal@gmail.com"

# Check rate limiting
KEYS "ratelimit:*"
GET "ratelimit:192.168.1.1:login"

# Clear all (for testing)
FLUSHALL  # WARNING: Only in development!
```

### Monitor Database
```bash
# Connect to PostgreSQL
psql -h localhost -p 5434 -U fstpay -d fstpay

# Check users
SELECT id, email, login_attempts, locked_until, created_at FROM users;

# Check OTP table
SELECT id, email, otp_code, expires_at, created_at FROM otp_tokens;

# Check rate limiter events (if logged)
SELECT * FROM audit_logs WHERE action = 'RATE_LIMIT_EXCEEDED';
```

---

## 📊 Test Report Template

```
TEST RESULTS - Login/Signup Flow
================================

Test Date: ___________
Tester: ___________
Backend Version: ___________
Frontend Version: ___________

SIGNUP TESTS
============
☐ Test 1.1: Register New Account - PASS / FAIL
☐ Test 1.2: Verify OTP During Signup - PASS / FAIL
☐ Password validation - PASS / FAIL
☐ Age validation (12+) - PASS / FAIL

LOGIN TESTS
===========
☐ Test 2.1: Successful Login - PASS / FAIL
☐ Test 2.2: OTP Verification After Login - PASS / FAIL
☐ JWT Token received - PASS / FAIL
☐ Token stored in localStorage - PASS / FAIL

SECURITY TESTS
===============
☐ Test 3.1: Account Lockout (5 attempts) - PASS / FAIL
☐ Test 4.1: Rate Limiting - PASS / FAIL
☐ Test 4.2: Rate Limit Bypass Blocked - PASS / FAIL
☐ Test 5.1: Token Refresh - PASS / FAIL

CAPTCHA TESTS
==============
☐ Test 7.1: reCAPTCHA Required - PASS / FAIL
☐ reCAPTCHA Verification Working - PASS / FAIL

TYPE SAFETY TESTS
==================
☐ Test 6.1: Email Validation - PASS / FAIL
☐ Test 6.1: Password Validation - PASS / FAIL
☐ Test 6.1: Age Validation - PASS / FAIL

OVERALL STATUS: PASS / FAIL
Issues Found: ___________
Blocked On: ___________
Notes: ___________
```

---

## 🚨 Common Issues & Solutions

### Issue: "Connection refused" - PostgreSQL
**Solution:** 
```bash
# Start PostgreSQL
docker start fstpay-db
# OR
pg_ctl start -D /usr/local/var/postgres
```

### Issue: "Connection refused" - Redis
**Solution:**
```bash
# Start Redis
docker start fstpay-redis
# OR
redis-server --port 6380
```

### Issue: "Invalid JWT secret" error
**Solution:**
```bash
# Set JWT_SECRET with minimum 32 characters
$env:JWT_SECRET = "my-secret-key-must-be-at-least-32-characters-long-!!"
```

### Issue: "CAPTCHA verification failed"
**Solution:**
1. Verify RECAPTCHA_SECRET_KEY is correct
2. Check time sync (CAPTCHA tokens are time-sensitive)
3. Verify domain is whitelisted in reCAPTCHA admin

### Issue: OTP not received in email
**Solution:**
```bash
# Check mail configuration
# 1. Verify MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD
# 2. Check spam folder
# 3. Verify Redis has OTP: redis-cli -p 6380 get "otp:email@domain.com"
# 4. Check backend logs for mail errors
```

### Issue: OTP keeps expiring (10 min default)
**Solution:**
```bash
# Extend OTP expiry time
$env:JWT_OTP_EXPIRATION_MINUTES = 30
```

---

## ✨ Key Test Credentials

**Email:** smburhan.personal@gmail.com  
**Password:** Burhan@1234  
**Status:** Ready for testing ✅

---

## 📝 Notes

- All timestamps in logs are UTC (GMT+0)
- Account lockout duration: 15 minutes
- Failed login attempts reset after successful login
- OTP valid for 10 minutes
- reCAPTCHA tokens valid for ~2 minutes
- JWT accessToken valid for 24 hours
- JWT refreshToken valid for 7 days

---

**Last Updated:** June 17, 2026  
**Document Version:** 1.0

