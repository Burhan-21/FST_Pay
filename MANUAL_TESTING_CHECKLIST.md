# FST Pay - Login/Signup Manual Testing Checklist

**Test Credentials:**
- **Email:** smburhan.personal@gmail.com
- **Password:** Burhan@1234

**Application URLs:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8080
- Database: PostgreSQL on localhost:5434
- Redis: localhost:6380

---

## 🔐 Test Case 1: User Registration (Signup)

### 1.1 Navigate to Signup Page
- [ ] Open http://localhost:5173
- [ ] See "Sign Up" link or button
- [ ] Click "Sign Up"
- [ ] Signup form displays with fields:
  - [ ] Full Name
  - [ ] Email
  - [ ] Password
  - [ ] Confirm Password
  - [ ] Date of Birth
  - [ ] reCAPTCHA checkbox

### 1.2 Fill Signup Form
- [ ] Full Name: **Burhan Test**
- [ ] Email: **smburhan.personal@gmail.com**
- [ ] Password: **Burhan@1234**
- [ ] Confirm Password: **Burhan@1234**
- [ ] DOB: **01/15/1990** (or any date 12+ years old)

### 1.3 Complete reCAPTCHA
- [ ] reCAPTCHA v2 checkbox appears
- [ ] Click checkbox
- [ ] See "I'm not a robot" verification (may be instant)
- [ ] Checkbox shows as checked

### 1.4 Submit Signup
- [ ] Click "Sign Up" or "Register" button
- [ ] Loading indicator appears
- [ ] After 2-3 seconds:
  - [ ] See message: "Verification code sent to your email"
  - [ ] Redirected to **OTP Verification screen**
  - [ ] See input field for 6-digit OTP code
  - [ ] See "Resend OTP" button
  - [ ] See countdown timer (usually 10 minutes)

### 1.5 Verify Email Received
- [ ] Check inbox for email from FST Pay
- [ ] Email subject: "Your OTP for FST Pay Registration"
- [ ] OTP code visible (6 digits)
- [ ] If no email:
  - [ ] Check spam/junk folder
  - [ ] Or check Redis: `redis-cli -p 6380` → `GET "otp:smburhan.personal@gmail.com"`

### 1.6 Enter OTP
- [ ] Copy OTP code from email (or Redis)
- [ ] Paste into OTP input field on screen
- [ ] Click "Verify" or "Verify OTP" button
- [ ] After 1-2 seconds:
  - [ ] See success message: "Email verified successfully"
  - [ ] Redirected to **Login page**
  - [ ] Can now login with credentials

**Status:** ✅ PASS / ❌ FAIL

---

## 🔑 Test Case 2: User Login

### 2.1 Navigate to Login Page
- [ ] From signup success, should be on login page
- [ ] Or manually open http://localhost:5173 → "Login"
- [ ] See login form with:
  - [ ] Email input field
  - [ ] Password input field
  - [ ] "Remember Me" checkbox (optional)
  - [ ] "Forgot Password" link (optional)
  - [ ] reCAPTCHA checkbox
  - [ ] "Login" button
  - [ ] "Don't have account? Sign Up" link

### 2.2 Enter Login Credentials
- [ ] Email: **smburhan.personal@gmail.com**
- [ ] Password: **Burhan@1234**
- [ ] Leave "Remember Me" unchecked

### 2.3 Complete reCAPTCHA
- [ ] reCAPTCHA v2 checkbox visible
- [ ] Click checkbox
- [ ] Checkbox becomes checked ✓

### 2.4 Click Login Button
- [ ] Click "Login" button
- [ ] Loading indicator appears
- [ ] After 2-3 seconds:
  - [ ] OTP input screen appears
  - [ ] See message: "OTP has been sent to smburhan.personal@gmail.com"
  - [ ] 6-digit input field visible
  - [ ] "Resend OTP" button visible
  - [ ] Countdown timer visible (10 minutes)

### 2.5 Verify OTP During Login
- [ ] Check email for new OTP (different from signup)
- [ ] Or check Redis: `GET "otp:smburhan.personal@gmail.com"`
- [ ] Enter 6-digit OTP
- [ ] Click "Verify" button
- [ ] After 1-2 seconds:
  - [ ] See loading
  - [ ] Redirected to **Dashboard**
  - [ ] See user name/profile info
  - [ ] See wallet, cards, transactions, etc.
  - [ ] See "Logout" button in top right

### 2.6 Verify JWT Token
- [ ] Check browser DevTools → Application → localStorage
- [ ] Should see `authToken` or `accessToken` key
- [ ] Value looks like: `eyJhbGc...` (JWT format)

**Status:** ✅ PASS / ❌ FAIL

---

## 🚫 Test Case 3: Failed Login Attempts & Account Lockout

### 3.1 Attempt Login with Wrong Password (5 times)

#### Attempt #1
- [ ] Email: **smburhan.personal@gmail.com**
- [ ] Password: **WrongPassword123**
- [ ] Complete CAPTCHA
- [ ] Click Login
- [ ] Error appears: **"Invalid email or password"**
- [ ] Still on login page

#### Attempt #2
- [ ] Email: **smburhan.personal@gmail.com**
- [ ] Password: **AnotherWrong456**
- [ ] Complete CAPTCHA
- [ ] Click Login
- [ ] Error: **"Invalid email or password"**

#### Attempt #3
- [ ] Same wrong password
- [ ] Error: **"Invalid email or password"**

#### Attempt #4
- [ ] Same wrong password
- [ ] Error: **"Invalid email or password"**

#### Attempt #5
- [ ] Same wrong password
- [ ] Error appears: **"Account locked. Try again in 15 minutes."**
- [ ] Login button may be disabled
- [ ] Cannot proceed further

### 3.2 Verify Account is Locked
- [ ] Try login with **correct password**: Burhan@1234
- [ ] Error still shows: **"Account locked. Try again in 15 minutes."**
- [ ] Correct password doesn't work

### 3.3 Check Database
```sql
-- Connect to PostgreSQL
psql -h localhost -p 5434 -U fstpay -d fstpay

-- Run query:
SELECT email, login_attempts, locked_until FROM users 
WHERE email = 'smburhan.personal@gmail.com';

-- Expected output:
-- email | login_attempts | locked_until
-- smburhan.personal@gmail.com | 5 | 2026-06-17 11:10:00+00
```
- [ ] Query shows `login_attempts = 5`
- [ ] `locked_until` shows future timestamp (15 mins from now)

### 3.4 Wait 15 Minutes (or Test After Unlock Time)
- [ ] After 15 minutes, try login again
- [ ] Email: **smburhan.personal@gmail.com**
- [ ] Password: **Burhan@1234** (correct)
- [ ] Should work normally
- [ ] Redirected to OTP screen

**Status:** ✅ PASS / ❌ FAIL

---

## ⏱️ Test Case 4: OTP Expiration

### 4.1 Start Signup/Login Flow
- [ ] Initiate signup or login
- [ ] See OTP sent message
- [ ] Note the 10-minute countdown timer

### 4.2 Wait for OTP to Expire
- [ ] Wait 11+ minutes
- [ ] Try to enter old OTP
- [ ] Expected error: **"OTP has expired"** or **"Invalid OTP"**
- [ ] Click "Resend OTP"
- [ ] New OTP sent
- [ ] Enter new OTP
- [ ] Should work

**Status:** ✅ PASS / ❌ FAIL

---

## 🔄 Test Case 5: Resend OTP

### 5.1 Request OTP Resend
- [ ] During login flow, on OTP input screen
- [ ] Click "Resend OTP" button
- [ ] Should see message: "OTP sent to your email"
- [ ] Countdown timer resets to 10 minutes

### 5.2 Verify New OTP Received
- [ ] Check email for another OTP
- [ ] Or check Redis with updated timestamp
- [ ] New OTP is different from previous one

### 5.3 Use New OTP
- [ ] Clear previous OTP input
- [ ] Enter new OTP
- [ ] Click "Verify"
- [ ] Should succeed

### 5.4 Rate Limit OTP Requests
- [ ] Click "Resend OTP" multiple times rapidly (5+ times)
- [ ] After N attempts (usually 3-5), see:
  - [ ] Error: **"Too many requests. Try again in 60 seconds"**
  - [ ] Or: **"OTP resend limit exceeded"**
  - [ ] Resend button disabled for 60 seconds

**Status:** ✅ PASS / ❌ FAIL

---

## 🛡️ Test Case 6: Rate Limiting

### 6.1 Rate Limit Login Endpoint
- [ ] Make 10 rapid login attempts:
```bash
# PowerShell
for ($i = 1; $i -le 15; $i++) {
    $body = @{
        email = "smburhan.personal@gmail.com"
        password = "Burhan@1234"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest `
        -Uri "http://localhost:8080/api/auth/login" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body $body `
        -SkipHttpErrorCheck
    
    Write-Host "Request $i - Status: $($response.StatusCode)"
}
```

### 6.2 Verify Rate Limiting
- [ ] First 10 requests: Status 200 OK (success or OTP sent)
- [ ] Request 11+: Status **429** (Too Many Requests)
- [ ] Error message: **"Rate limit exceeded"**
- [ ] Response header `Retry-After: 60`

### 6.3 Verify Different Endpoints Have Different Limits
- [ ] Auth endpoints: 10 requests/minute
- [ ] AI Coach: 20 requests/minute  
- [ ] Other endpoints: 150 requests/minute

**Status:** ✅ PASS / ❌ FAIL

---

## 🤖 Test Case 7: reCAPTCHA Validation

### 7.1 Signup with CAPTCHA
- [ ] On signup page
- [ ] Leave CAPTCHA unchecked
- [ ] Try to submit form
- [ ] Error: **"Please complete the reCAPTCHA"**
- [ ] Form doesn't submit

### 7.2 Login with CAPTCHA
- [ ] On login page
- [ ] Leave CAPTCHA unchecked
- [ ] Try to submit form
- [ ] Error: **"Please complete the reCAPTCHA"**
- [ ] Form doesn't submit

### 7.3 CAPTCHA with Invalid Token
- [ ] Check CAPTCHA
- [ ] Manually edit network request (DevTools)
- [ ] Send empty or fake token
- [ ] Backend should return: **"CAPTCHA verification failed"**

**Status:** ✅ PASS / ❌ FAIL

---

## ✅ Test Case 8: Input Validation

### 8.1 Invalid Email Format
- [ ] Signup email field: **"notanemail"**
- [ ] Error: **"Please enter a valid email address"**
- [ ] Form won't submit

### 8.2 Password Too Short
- [ ] Signup password field: **"Short"** (less than 8 chars)
- [ ] Error: **"Password must be at least 8 characters"**
- [ ] Or error appears in real-time as typing

### 8.3 Passwords Don't Match
- [ ] Password: **Burhan@1234**
- [ ] Confirm Password: **DifferentPassword123**
- [ ] Error: **"Passwords do not match"**
- [ ] Form won't submit

### 8.4 Age Too Young
- [ ] DOB: **01/01/2020** (6 years old)
- [ ] Error: **"You must be at least 12 years old"**
- [ ] Form won't submit

### 8.5 Invalid Login Email
- [ ] Email: **"invalid@@domain.com"**
- [ ] Error: **"Invalid email format"** (on focus blur or submit)

**Status:** ✅ PASS / ❌ FAIL

---

## 🔒 Test Case 9: JWT Token Refresh

### 9.1 Login Successfully
- [ ] Complete full login flow
- [ ] See dashboard
- [ ] Check localStorage for `authToken`

### 9.2 Simulate Token Expiration
- [ ] Open DevTools → Network tab
- [ ] Perform an action (e.g., view wallet)
- [ ] If token is expired, frontend should:
  - [ ] Automatically call `/api/auth/refresh`
  - [ ] Receive new token
  - [ ] Retry original request
  - [ ] User sees no interruption

### 9.3 Manual Token Refresh Test
```bash
# Get current tokens
$token = @{
    refreshToken = "<your-refresh-token-from-localStorage>"
} | ConvertTo-Json

# Call refresh endpoint
$response = Invoke-WebRequest `
    -Uri "http://localhost:8080/api/auth/refresh" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body $token

# Should get new access token
$response.Content | ConvertFrom-Json
```
- [ ] Status 200 OK
- [ ] Response contains new `accessToken`

**Status:** ✅ PASS / ❌ FAIL

---

## 📊 Test Case 10: Successful Logout

### 10.1 Logout from Dashboard
- [ ] Click "Logout" button (usually top right)
- [ ] See confirmation message (optional)
- [ ] Redirected to login page
- [ ] localStorage is cleared (`authToken` removed)

### 10.2 Verify Tokens Removed
- [ ] DevTools → Application → localStorage
- [ ] No `authToken` present
- [ ] No `refreshToken` present

### 10.3 Try Accessing Protected Routes
- [ ] Try to directly access `/dashboard`
- [ ] Should redirect to login page
- [ ] Cannot access without logging in again

**Status:** ✅ PASS / ❌ FAIL

---

## 📝 Summary Report

| Test Case | Status | Notes |
|-----------|--------|-------|
| 1. User Registration | ✅/❌ | |
| 2. User Login | ✅/❌ | |
| 3. Account Lockout | ✅/❌ | |
| 4. OTP Expiration | ✅/❌ | |
| 5. Resend OTP | ✅/❌ | |
| 6. Rate Limiting | ✅/❌ | |
| 7. reCAPTCHA | ✅/❌ | |
| 8. Input Validation | ✅/❌ | |
| 9. JWT Refresh | ✅/❌ | |
| 10. Logout | ✅/❌ | |

**Overall Status:** ✅ ALL PASS / ⚠️ SOME FAILED / ❌ CRITICAL ISSUES

---

## 🐛 Issues Found

| Issue # | Description | Severity | Status |
|---------|-------------|----------|--------|
| 1 | | 🔴 Critical | |
| 2 | | 🟠 High | |
| 3 | | 🟡 Medium | |

---

## ✋ Tester Sign-Off

- **Tester Name:** ___________________________
- **Date:** ___________________________
- **Time Spent:** ___________________________
- **Environment:** Local / Dev / Staging / Production
- **Browser:** Chrome / Firefox / Safari / Edge
- **OS:** Windows / Mac / Linux

**Approval:**
- [ ] Ready for deployment
- [ ] Needs fixes before deployment
- [ ] Blocked on external dependencies

**Comments:**
___________________________________________________________________
___________________________________________________________________
___________________________________________________________________

---

**Last Updated:** June 17, 2026  
**Version:** 1.0  
**Created For:** smburhan.personal@gmail.com : Burhan@1234

