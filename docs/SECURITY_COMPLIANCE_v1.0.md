# FST Pay — Security & Compliance v1.0

**Document ID:** FST-SEC-2026-Q2  
**Version:** 1.0  
**Date:** June 17, 2026  
**Owner:** Security & Compliance Lead  
**Status:** 🟢 READY FOR AUDIT

---

## 📋 EXECUTIVE SUMMARY

FST Pay implements comprehensive security and compliance controls aligned with:
- **RBI Guidelines:** Reserve Bank of India regulations for payments and digital wallets
- **GDPR:** General Data Protection Regulation (if serving EU users, Phase 2)
- **DPDP Act:** Digital Personal Data Protection Act, 2023 (India)
- **OWASP Top 10:** Application Security
- **ISO 27001:** Information Security Management

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### Authentication Strategy

#### Multi-Factor Authentication (MFA) Design

```
Step 1: Identity Verification
  User submits: Email + Password
  Backend: Verify credentials against bcrypt hash
  Decision: Valid password?
    YES → Proceed to Step 2
    NO  → Increment failed attempts
           If failed_attempts >= 5:
             → Lock account for 15 minutes
             → Alert user via email
             → Log security event
           → Return error (no info leak)

Step 2: Email OTP Verification
  Backend: Generate 6-digit OTP
  Backend: Encrypt OTP, store with 10-min expiry
  Backend: Send OTP via email (SendGrid)
  User: Enters OTP
  Backend: Verify OTP matches + not expired
  Decision: OTP valid?
    YES → Proceed to Step 3
    NO  → Allow 5 retry attempts
           After 5 failures: Request new OTP

Step 3: JWT Token Issuance
  Backend: Generate JWT access token (24-hour expiry)
  Backend: Generate refresh token (7-day expiry)
  Backend: Return tokens to frontend
  Decision: Tokens issued?
    YES → User logged in
    NO  → Authentication failed
```

### JWT Token Structure

```json
Access Token Payload:
{
  "sub": "user-uuid-123",
  "email": "smburhan.personal@gmail.com",
  "role": "USER",
  "iat": 1623952800,
  "exp": 1624039200,
  "iss": "fstpay.com"
}

Token Claims:
- sub: Subject (user ID)
- email: User email (for quick lookup)
- role: User role (USER, PARENT, ADMIN)
- iat: Issued at timestamp
- exp: Expiration timestamp (24 hours from issue)
- iss: Issuer (FST Pay)

Signature: HMAC-SHA256 with JWT_SECRET (32+ chars, rotated quarterly)
```

### Session Management

```
Session Lifecycle:
  ├─ 1. User logs in → JWT tokens issued
  ├─ 2. Frontend stores tokens:
  │    - Access token: localStorage (< 1 hour risk)
  │    - Refresh token: httpOnly cookie (Phase 2)
  ├─ 3. Each API call includes: Authorization: Bearer <accessToken>
  ├─ 4. Backend validates token:
  │    - Verify signature
  │    - Check expiration
  │    - Verify user not deleted/suspended
  ├─ 5a. Token valid: Process request
  ├─ 5b. Token expired: Return 401
  │      Frontend: Auto-refresh using refreshToken
  │      → POST /api/v1/auth/refresh-token
  │      ← New accessToken issued
  │      → Retry original request
  ├─ 6. User logs out:
  │    - Frontend clears tokens from localStorage
  │    - Refresh token blacklisted in Redis (Phase 2)
  └─ 7. Session end (or 24 hours)
```

### Authorization Model (RBAC)

```
Role Hierarchy:

ADMIN (highest privilege)
  ├─ View all users
  ├─ Suspend/reactivate accounts
  ├─ View system metrics
  ├─ Manage fraud alerts
  └─ Includes all USER permissions

PARENT (parental controls)
  ├─ View linked child accounts (read-only)
  ├─ View child transaction history
  ├─ Receive child spending alerts
  ├─ Send messages to child
  └─ Includes all USER permissions

USER (default role)
  ├─ Manage own wallet
  ├─ Generate virtual cards
  ├─ Make transactions
  ├─ View own transactions & analytics
  ├─ Manage own notifications
  └─ Cannot view/modify others' data

Authorization Checks:
  @PreAuthorize("hasRole('USER')")
  public ResponseEntity<?> getWallet() { }

  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<?> listAllUsers() { }

  @PreAuthorize("hasAnyRole('USER', 'PARENT')")
  public ResponseEntity<?> getNotifications() { }
```

---

## 🔒 DATA PROTECTION

### Encryption Standards

#### At Rest (Stored Data)

```
Sensitive Data Encryption:
┌─────────────────────────┬──────────────┬─────────────────┐
│ Data Type               │ Encryption   │ Key Management  │
├─────────────────────────┼──────────────┼─────────────────┤
│ Password hashes         │ bcrypt (12   │ Salt per user   │
│                         │ rounds)      │                 │
│ Credit card numbers     │ AES-256-GCM  │ AWS KMS         │
│ CVV                     │ AES-256-GCM  │ AWS KMS         │
│ OTP tokens              │ AES-256-GCM  │ Redis encryption│
│ JWT secret              │ N/A (static) │ AWS Secrets Mgr │
│ API keys (external)     │ AES-256-GCM  │ AWS Secrets Mgr │
│ User PII (email, DOB)   │ Plaintext    │ Database-level  │
│                         │              │ encryption      │
│ Transaction amounts     │ Plaintext    │ Database-level  │
│                         │              │ encryption      │
└─────────────────────────┴──────────────┴─────────────────┘

Database Encryption:
  - PostgreSQL: Use pgcrypto extension
  - Column-level encryption for payment data
  - Transparent Data Encryption (TDE) enabled
  - Backup encryption: AES-256

Key Rotation:
  - Quarterly rotation of JWT_SECRET
  - Automatic key rotation via AWS KMS
  - No manual key handling in application code
```

#### In Transit (Network)

```
All data encrypted during transmission:

HTTP/2 + TLS 1.3:
  ├─ HTTPS only (no HTTP fallback)
  ├─ Certificate: DigiCert / Let's Encrypt
  ├─ HSTS header: max-age=31536000 (1 year)
  ├─ Cipher suites: TLS_AES_256_GCM_SHA384 (preferred)
  ├─ Certificate pinning: Public key pinning (Phase 2)
  └─ Mixed content: BLOCKED

API Security Headers:
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  Content-Security-Policy: default-src 'self'
  Referrer-Policy: strict-origin-when-cross-origin
```

### Password Security

```
Password Requirements:
  ├─ Minimum 8 characters
  ├─ At least 1 uppercase letter (A-Z)
  ├─ At least 1 lowercase letter (a-z)
  ├─ At least 1 digit (0-9)
  ├─ At least 1 special character (!@#$%^&*)
  └─ No spaces

Password Storage:
  ├─ Algorithm: bcrypt with 12 rounds
  ├─ No plaintext storage (ever)
  ├─ Hash never transmitted
  ├─ Each password unique hash (random salt)
  └─ Migration plan: Password not verified until next login

Password Reset Flow:
  1. User clicks "Forgot Password"
  2. Enter email
  3. Backend generates reset token (32-char random)
  4. Send reset link: https://app.fstpay.com/reset?token=xyz
  5. Token valid for 1 hour only
  6. User clicks link, enters new password
  7. Backend validates token, updates password
  8. Token invalidated (single-use)
```

---

## 🛡️ THREAT PROTECTION

### Rate Limiting & DDoS Prevention

```
Endpoint-Level Rate Limiting:

Authentication Endpoints:
  /auth/signup      → 5 requests per hour per IP
  /auth/login       → 10 requests per minute per IP
  /auth/verify-otp  → 5 attempts per OTP (10 min window)
  /auth/resend-otp  → 3 resends per session

AI Coach Endpoints:
  /aicoach/*        → 20 requests per minute per user

General Endpoints:
  All others        → 150 requests per minute per user

Account Lockout:
  Failed logins >= 5   → Account locked 15 minutes
  Failed OTP >= 5      → Request new OTP
  Failed top-ups >= 3  → Request support

Rate Limit Headers:
  X-RateLimit-Limit: 150
  X-RateLimit-Remaining: 145
  X-RateLimit-Reset: 1623952800

When Limit Exceeded:
  HTTP 429 Too Many Requests
  Retry-After: 60 (seconds)
```

### Account Lockout Mechanism

```
Tracking:
  user.login_attempts: INTEGER (default 0)
  user.locked_until: TIMESTAMP (nullable)

Logic:
  On failed login:
    if user.locked_until > NOW:
      → Deny login ("Account locked for X minutes")
    else:
      → Reset locked_until = null
      → Increment login_attempts
      
    if login_attempts >= 5:
      → Set locked_until = NOW + 15 minutes
      → Send email: "Multiple failed login attempts"
      → Log security event

  On successful login:
    → Set login_attempts = 0
    → Set locked_until = null

  Automatic unlock:
    → Scheduled job runs every 5 minutes
    → Finds all users with locked_until < NOW
    → Resets locked_until = null
```

### SQL Injection & Input Validation

```
Parameterized Queries (using Spring Data JPA):
  VULNERABLE:
    String sql = "SELECT * FROM users WHERE email = '" + email + "'";
    
  SECURE:
    @Query("SELECT u FROM User u WHERE u.email = ?1")
    User findByEmail(String email);

Input Validation:
  ├─ Email: Valid format, max 255 chars
  ├─ Password: 8-64 chars, regex validation
  ├─ Amounts: Numeric, max 15 digits (₹999,999,999,999.99)
  ├─ User names: Alphanumeric + spaces, max 255 chars
  ├─ Merchant names: Alphanumeric + symbols, max 255 chars
  └─ All validated server-side (never trust client)

Prepared Statements:
  Always used by JPA/Hibernate (automatic)
  
XSS Protection:
  └─ All user inputs sanitized before display (React auto-escapes)

CSRF Protection:
  └─ JWT-based (stateless) - no CSRF token needed
     (Alternative: CSRF token via cookie for Phase 2)
```

### API Authentication Bypass Prevention

```
Token Validation:
  ├─ Verify JWT signature with JWT_SECRET
  ├─ Verify token not expired
  ├─ Verify user exists and not deleted
  ├─ Verify user not suspended
  ├─ Verify token matches user role
  └─ Reject if any check fails

Endpoint Protection:
  @RestController
  @RequestMapping("/api/v1/wallet")
  public class WalletController {
    
    @GetMapping
    @PreAuthorize("hasRole('USER')")  // Auth required
    public ResponseEntity<?> getWallet() {
      // Automatically checks JWT + role
    }
  }

Public Endpoints (no auth required):
  ├─ POST /api/v1/auth/signup
  ├─ POST /api/v1/auth/login
  ├─ POST /api/v1/auth/verify-otp
  ├─ GET /health
  └─ All others require valid JWT
```

---

## 📋 COMPLIANCE REQUIREMENTS

### RBI Guidelines (Reserve Bank of India)

#### Prepaid Payment Instrument (PPI) Compliance

```
Classification: PPI (Prepaid Payment Instrument)
  FST Pay wallet is classified as "Semi-closed PPI"
  
Licensing Requirements:
  ├─ Authorization from RBI (Phase 1)
  ├─ Bank partner required for fund management
  ├─ PPI license holder OR bank partner's license
  └─ Compliance department mandatory

Regulatory Obligations:
  ├─ Know Your Customer (KYC) verification
  │  └─ Name, DOB, address, ID proof (Aadhaar/PAN)
  │
  ├─ Anti-Money Laundering (AML) checks
  │  ├─ Transaction monitoring (>₹10K flagged)
  │  ├─ Suspicious Activity Reports (SARs)
  │  └─ Currency transaction reporting
  │
  ├─ Customer Due Diligence (CDD)
  │  ├─ Age verification (12+ mandatory)
  │  ├─ Address verification
  │  └─ Beneficial owner identification
  │
  ├─ Transaction Limits (RBI-mandated)
  │  ├─ Single top-up: Max ₹100,000
  │  ├─ Daily limit: Max ₹200,000
  │  ├─ Monthly limit: Max ₹500,000
  │  └─ Wallet balance max: ₹999,999.99
  │
  ├─ Dispute Resolution
  │  ├─ 90-day dispute window for transactions
  │  ├─ Response within 10 days
  │  └─ Resolution within 60 days
  │
  └─ Quarterly Compliance Reporting
     ├─ Transaction reports to RBI
     ├─ Complaint reports
     ├─ Security audit results
     └─ KYC-AML audit reports
```

### GDPR Compliance (if serving EU users, Phase 2)

```
Data Subject Rights:
  ├─ Right to Access: GET /users/me/data (download account data)
  ├─ Right to Erasure: DELETE /users/me (right to be forgotten)
  ├─ Right to Portability: GET /users/me/export (download all data)
  ├─ Right to Rectification: PUT /users/me (correct inaccurate data)
  ├─ Right to Restrict Processing: Settings > Restrict Processing
  └─ Right to Object: Opt-out of marketing emails

Consent Management:
  ├─ Explicit consent for each processing activity
  ├─ Checkbox for terms & privacy policy
  ├─ Separate consent for marketing emails
  ├─ Consent records stored with timestamp
  └─ Easy withdrawal of consent

Data Processing:
  ├─ Minimal data collection (purpose limitation)
  ├─ Data retention: 7 years (legal + compliance)
  ├─ Regular deletion of old data
  ├─ Data Protection Impact Assessment (DPIA)
  └─ Privacy by Design (encryption, pseudonymization)

Data Breach Notification:
  ├─ Notified to DPA within 72 hours of discovery
  ├─ Notified to data subjects if high risk
  ├─ Breach register maintained (internal)
  └─ Assessment of impact on rights
```

### DPDP Act (Digital Personal Data Protection Act, India)

```
Applicability:
  ├─ Covers all personal data processing in India
  ├─ FST Pay as "Data Fiduciary" (processor)
  ├─ Bank partner as "Data Controller" (owner)
  └─ RBI as regulator

Key Requirements:
  ├─ Consent Framework
  │  ├─ Explicit consent for each processing
  │  ├─ Consent record maintained
  │  ├─ Easy withdrawal mechanism
  │  └─ Children (<18) require parental consent
  │
  ├─ Data Minimization
  │  ├─ Collect only necessary data
  │  ├─ Delete after retention period (7 years)
  │  ├─ Regular data audits
  │  └─ Purpose-limitation principle
  │
  ├─ Sensitive Personal Data
  │  ├─ Genetic data, biometric data, religious beliefs, etc.
  │  ├─ Enhanced protection required
  │  ├─ Explicit consent mandatory
  │  └─ Audit trail maintained
  │
  ├─ Data Subject Rights (similar to GDPR)
  │  ├─ Access, correction, erasure, portability
  │  ├─ Opt-out of profiling
  │  └─ Request transparency in automated decisions
  │
  ├─ Data Breach Notification
  │  ├─ Notify significant breach to IAMAI/regulator
  │  ├─ Breach assessment within 30 days
  │  ├─ Data subject notification (if necessary)
  │  └─ Breach register maintained
  │
  └─ Privacy Impact Assessment
     ├─ Assess new data processing activities
     ├─ Document risks and mitigation
     └─ Review annually
```

---

## 🧪 SECURITY TESTING & AUDITING

### Security Test Plan

```
Phase 0 → Phase 1 (MVP):
  ├─ Static Analysis
  │  ├─ SonarQube (code quality + security)
  │  ├─ Snyk (dependency scanning)
  │  ├─ OWASP Dependency-Check
  │  └─ Run on: Every commit (CI/CD)
  │
  ├─ Dynamic Analysis
  │  ├─ OWASP ZAP (web application scanning)
  │  ├─ Burp Suite (manual testing)
  │  └─ Run on: Weekly (staging) + Pre-release
  │
  ├─ Penetration Testing
  │  ├─ Third-party security firm (Phase 1)
  │  ├─ Focus areas:
  │  │  ├─ Authentication/authorization
  │  │  ├─ Payment gateway integration
  │  │  ├─ Data encryption
  │  │  ├─ API security
  │  │  └─ Session management
  │  └─ Run on: Pre-release (30 days before launch)
  │
  ├─ Vulnerability Scanning
  │  ├─ Database: 
  │  │  ├─ SQL injection
  │  │  ├─ Privilege escalation
  │  │  └─ Data leakage
  │  │
  │  ├─ API:
  │  │  ├─ Rate limiting bypass
  │  │  ├─ Authentication bypass
  │  │  ├─ Authorization bypass
  │  │  ├─ Parameter tampering
  │  │  └─ Sensitive data exposure
  │  │
  │  ├─ Frontend:
  │  │  ├─ XSS (Cross-Site Scripting)
  │  │  ├─ CSRF (Cross-Site Request Forgery)
  │  │  ├─ Prototype pollution
  │  │  └─ DOM-based vulnerabilities
  │  │
  │  └─ Infrastructure:
  │     ├─ Weak SSL/TLS
  │     ├─ Exposed secrets
  │     ├─ Misconfigured S3 buckets
  │     └─ Unencrypted data at rest
  │
  └─ Compliance Testing
     ├─ RBI compliance checklist
     ├─ GDPR compliance checklist
     ├─ DPDP compliance checklist
     └─ OWASP Top 10 verification

Frequency:
  - Pre-commit: Static analysis + linting
  - Nightly: Full security scan
  - Weekly: OWASP ZAP + Snyk
  - Monthly: Manual penetration test
  - Quarterly: Third-party audit
```

### Security Monitoring & Incident Response

```
Real-Time Monitoring:
  ├─ Failed login attempts (track per user/IP)
  ├─ Unusual transaction patterns (>3σ from mean)
  ├─ Rate limit violations
  ├─ API errors (4xx, 5xx spikes)
  ├─ Data access patterns (track who accesses what)
  ├─ Certificate expiry (30-day warning)
  └─ Dependency vulnerabilities (auto-checked daily)

Alerting Thresholds:
  ├─ 5+ failed logins from same IP → Alert
  ├─ Transaction >₹50,000 from new user → Alert
  ├─ 10+ rate limit violations → Alert
  ├─ 429 (rate limit) errors >1% of traffic → Alert
  ├─ 5xx errors >5% of requests → Alert
  └─ Unauthorized API access attempts → Alert

Incident Response Procedures:

  TIER 1: Security Event (low severity)
    Examples: Failed login, low-value fraud
    Response time: 24 hours
    Procedure:
      ├─ Log event with timestamp, user, details
      ├─ Monitor for pattern (if repeated)
      ├─ Send email alert to user
      └─ Document in incident log

  TIER 2: Security Issue (medium severity)
    Examples: Unauthorized access, attempted exploit
    Response time: 4 hours
    Procedure:
      ├─ Immediate investigation by security team
      ├─ Containment: Disable affected account if necessary
      ├─ Notification: Affected users within 24 hours
      ├─ Remediation: Code fix or infrastructure change
      ├─ Testing: Verify fix + re-deploy
      └─ Communication: Post-mortem within 7 days

  TIER 3: Security Breach (critical severity)
    Examples: Data leak, payment fraud, system compromise
    Response time: 1 hour
    Procedure:
      ├─ Immediate: Activate incident response team
      ├─ Investigation: Forensics + log analysis
      ├─ Containment: Isolate affected systems
      ├─ Notification: 
      │  ├─ RBI + regulators within 72 hours
      │  ├─ Affected users within 72 hours
      │  ├─ Public disclosure (if required)
      │  └─ Media statement (if necessary)
      ├─ Remediation: Technical fixes + process changes
      ├─ Recovery: System restoration + data integrity check
      ├─ Communication:
      │  ├─ Daily updates to stakeholders
      │  ├─ Post-mortem within 14 days
      │  └─ Third-party audit within 30 days
      └─ Learning: Document + update procedures

  Incident Log Template:
    ├─ Incident ID: INC-2026-001
    ├─ Date/Time: 2026-06-17 10:30:00 UTC
    ├─ Severity: CRITICAL
    ├─ Description: What happened
    ├─ Impact: How many users, how much data
    ├─ Root Cause: Why it happened
    ├─ Timeline: Event → Detection → Response
    ├─ Remediation: What was done
    ├─ Lessons Learned: Process improvements
    └─ Owner: Who was responsible
```

---

## 🔍 AUDIT & COMPLIANCE REPORTS

### Internal Audit Checklist

```
Monthly Audit (Run 1st of month):
  ☐ Review failed login attempts (>100 = investigate)
  ☐ Check for unusual transaction patterns
  ☐ Verify all API endpoints are authenticated
  ☐ Check database backup encryption
  ☐ Verify SSL/TLS certificates valid
  ☐ Review access logs for anomalies
  ☐ Check password policy compliance
  ☐ Verify rate limiting is enforced
  ☐ Review third-party service status
  ☐ Test disaster recovery plan

Quarterly Audit (Run every 3 months):
  ☐ Third-party security assessment
  ☐ Code review for security vulnerabilities
  ☐ Penetration testing (high-risk areas)
  ☐ Compliance review (RBI, GDPR, DPDP)
  ☐ Data inventory audit (what we store)
  ☐ Data retention policy review
  ☐ Employee access audit (who has what)
  ☐ Incident response drill (test procedures)
  ☐ Backup restoration test
  ☐ Disaster recovery plan update

Annual Audit (Run every 12 months):
  ☐ Full security assessment (external firm)
  ☐ SOC 2 Type II compliance
  ☐ Regulatory compliance review (RBI, GDPR, DPDP)
  ☐ Privacy Impact Assessment
  ☐ Business continuity plan review
  ☐ Insurance review + claims audit
  ☐ Staff security training effectiveness
  ☐ Vendor security review
  ☐ Update security policies
  ☐ Stakeholder reporting
```

### Regulatory Reporting

```
RBI Quarterly Report (due 30 days after quarter end):
  ├─ Total top-ups processed (₹)
  ├─ Transaction success rate (%)
  ├─ Disputed transactions count
  ├─ Complaints received + resolution status
  ├─ Security incidents count
  ├─ Data breaches count
  ├─ User KYC compliance (%)
  ├─ API downtime (hours)
  └─ Audit findings + remediation status

Annual Compliance Report:
  ├─ RBI compliance summary
  ├─ GDPR compliance status (if EU)
  ├─ DPDP compliance status
  ├─ Security audit results
  ├─ Penetration testing results
  ├─ Incident summary + learnings
  ├─ Policy updates
  ├─ Training & awareness metrics
  └─ Goals for next year
```

---

## 🚨 SECURITY INCIDENT PLAYBOOK

### DDoS Attack

```
Detection:
  - Traffic spike >10x normal (detected by CloudWatch)
  - Majority from single IP or IP range
  - Requests to same endpoint

Response:
  1. Activate incident response team (5 min)
  2. Enable AWS WAF + CloudFront geo-blocking
  3. Rate limiting increased automatically
  4. Check RDS + Redis for overload
  5. Enable auto-scaling (if not already)
  6. Notify customers (if service degraded)
  7. Contact AWS DDoS Response Team
  8. Monitor for 24 hours post-attack
  9. Document lessons learned
```

### Data Breach (Payment Card Data)

```
Detection:
  - Unusual database access patterns
  - Credit card data exported to unauthorized location
  - Alert from Snyk/OWASP

Response (CRITICAL - 1 hour SLA):
  1. Activate incident response team (IMMEDIATE)
  2. Isolate affected systems from network
  3. Stop all transactions (if payment data compromised)
  4. Forensics: Determine what data was accessed
  5. Notify:
     - RBI within 1 hour
     - Payment processor (Razorpay) immediately
     - Affected users within 72 hours
     - Public disclosure (if required)
  6. Remediation:
     - Apply security patch
     - Re-encrypt payment data
     - Rotate encryption keys
     - Update fraud detection rules
  7. Recovery:
     - Restore from backup
     - Test system integrity
     - Re-enable transactions
  8. Communication:
     - Daily updates to stakeholders
     - Post-mortem within 14 days
     - Third-party audit within 30 days
  9. Follow-up:
     - Update security policies
     - Incident response drill
     - Staff training refresh
```

### Account Compromise

```
Detection:
  - Multiple failed login attempts followed by successful login from new IP
  - Unusual transaction pattern (large amount, new merchant)
  - User reports unauthorized access

Response (TIER 2 - 4 hour SLA):
  1. Immediate: Disable account temporarily (notify user)
  2. Investigation: Review transaction history + login logs
  3. Forensics:
     - Check if password was compromised
     - Check for session hijacking (JWT theft)
     - Check for phishing indicators
  4. Containment:
     - Force password reset (send link via email)
     - Invalidate all active sessions
     - Block suspicious IPs temporarily
  5. Notification:
     - Email user: "Account compromised, access blocked"
     - List suspicious transactions
     - Offer fraud dispute form
  6. Remediation:
     - User changes password
     - Enable SMS 2FA (Phase 2)
     - User reviews connected apps
  7. Resolution:
     - Refund fraudulent transactions
     - Re-enable account
     - Follow-up check after 7 days
```

---

## 📚 SECURITY BEST PRACTICES

### Developer Guidelines

```
Password Storage:
  ✅ Use bcrypt with 12+ rounds
  ❌ Never store plaintext passwords
  ❌ Never use MD5, SHA1, or weak hashing

API Security:
  ✅ Always validate input server-side
  ✅ Use parameterized queries
  ✅ Return generic error messages
  ✅ Log all access attempts
  ❌ Never expose system info in errors
  ❌ Never log sensitive data (passwords, tokens)

Secrets Management:
  ✅ Use AWS Secrets Manager
  ✅ Rotate secrets quarterly
  ✅ Never commit secrets to git
  ✅ Use environment variables
  ❌ Never hardcode secrets
  ❌ Never use placeholder defaults

Code Review Checklist:
  ☐ No hardcoded passwords/API keys
  ☐ Input validation present
  ☐ SQL injection prevention
  ☐ XSS prevention (React auto-escape)
  ☐ CSRF protection (if applicable)
  ☐ Authentication check
  ☐ Authorization check
  ☐ Rate limiting (if needed)
  ☐ Error handling (no data leaks)
  ☐ Logging present (no sensitive data)
  ☐ Dependencies up-to-date
```

### Operations Guidelines

```
Server Hardening:
  ✅ Disable root SSH
  ✅ Use SSH keys (no password)
  ✅ Enable firewall (UFW/Security Groups)
  ✅ Regular OS patches (weekly)
  ✅ Disable unused ports
  ✅ Run services as non-root
  ✅ Use HTTPS only
  ✅ Enable audit logging

Database Security:
  ✅ Encryption at rest
  ✅ Encryption in transit
  ✅ Regular backups (daily)
  ✅ Test backup restoration (quarterly)
  ✅ Restrict user access (principle of least privilege)
  ✅ Remove default accounts
  ✅ Strong passwords
  ✅ SQL injection prevention

Monitoring & Logging:
  ✅ Centralized logging (CloudWatch/ELK)
  ✅ Real-time alerting
  ✅ Log retention (90 days minimum)
  ✅ Archive logs (7 years for compliance)
  ✅ Monitor system resources
  ✅ Monitor application errors
  ✅ Monitor security events
```

---

## 📞 SECURITY CONTACTS

```
Incident Response Team:
  ├─ Security Lead: security@fstpay.com
  ├─ Backend Architect: backend@fstpay.com
  ├─ DevOps Lead: devops@fstpay.com
  └─ Product Manager: product@fstpay.com

External Contacts:
  ├─ RBI: Report compliance issues
  ├─ Payment Processor: Razorpay support
  ├─ Insurance: Cyber liability claims
  └─ Legal: Data protection / breach notification

Security Mailing List:
  security@fstpay.com (internal)
  security-report@fstpay.com (bug bounty - Phase 2)
```

---

**Document Version:** 1.0  
**Last Updated:** June 17, 2026  
**Compliance Status:** Ready for RBI pre-licensing review  
**Next Review:** Upon regulatory feedback or 6 months (whichever is sooner)

