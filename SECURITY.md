# Security Guidelines - FST Pay Application

## 🔒 Security Standards & Best Practices

This document outlines security best practices and compliance requirements for the FST Pay application.

---

## 1. AUTHENTICATION & AUTHORIZATION

### ✅ Best Practices Implemented

**Multi-Factor Authentication (OTP)**
- All login attempts require OTP verification
- OTP sent via email (rate-limited to prevent spam)
- 6-digit OTP with 10-minute expiration
- Constant-time comparison for OTP verification (prevents timing attacks)

**Account Lockout**
- Account locks after 5 failed login attempts
- 15-minute lockout duration with exponential backoff
- Reset on successful authentication
- Logging of lockout events for security audits

**Password Security**
- Minimum 8 characters enforced
- Passwords hashed using bcrypt (Spring Security default)
- Passwords never logged or displayed
- Change password endpoint available

**JWT Token Management**
- Short-lived access tokens (15 minutes)
- Refresh tokens (7 days) stored in database
- Tokens invalidated on logout
- Secure cookie handling (HttpOnly, SameSite=Strict)

### ⚠️ Recommendations

```java
// Consider implementing additional password requirements
@Component
public class PasswordValidator {
    public boolean isValid(String password) {
        // Must contain: uppercase, lowercase, number, special character
        return password.matches("^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$");
    }
}
```

---

## 2. RATE LIMITING & DDoS PROTECTION

### ✅ Implementation

**Tiered Rate Limiting**
```yaml
# Auth endpoints: 10 requests per minute (strict)
/api/v1/auth/* → 10 req/min

# AI endpoints: 20 requests per minute (moderate)
/api/v1/ai/* → 20 req/min

# General API: 150 requests per minute (standard)
/api/v1/* → 150 req/min
```

**LRU Cache with Size Limits**
- Max 10,000 concurrent IPs tracked
- Automatic eviction of least recently used
- Prevents memory exhaustion attacks

**IP Detection**
- Uses remote address by default (safest)
- X-Forwarded-For only trusted if behind reverse proxy
- Configurable via environment variable

### ⚠️ Recommendations

```bash
# Deploy behind reverse proxy with:
# 1. Request throttling at edge
# 2. WAF rules (AWS WAF, Cloudflare)
# 3. DDoS protection (AWS Shield, Cloudflare DDoS)
# 4. Request filtering (bot detection)
```

---

## 3. DATA PROTECTION

### ✅ Implementation

**Sensitive Data Handling**
- No plaintext passwords stored or logged
- No PII in logs
- BigDecimal for all financial calculations (no floating point)
- Proper rounding and scale enforcement

**Environment Secrets**
- All credentials from environment variables
- `.env` file never committed
- Supports Spring profiles (dev, prod)
- Secrets managed externally in production

### ⚠️ Recommendations for Production

```yaml
# Use external secrets management:

# AWS Option
AWS_REGION: us-east-1
AWS_SECRET_MANAGER: fstpay/prod/secrets

# HashiCorp Vault Option
VAULT_ADDR: https://vault.company.com
VAULT_TOKEN: ${VAULT_TOKEN}
VAULT_PATH: secret/fstpay/prod

# Encryption at Rest
SPRING_JPA_DATABASE_PLATFORM: org.hibernate.dialect.PostgreSQLDialect
# Add TDE (Transparent Data Encryption) at database level
```

---

## 4. SQL INJECTION & DATABASE SECURITY

### ✅ Best Practices

- Using Spring Data JPA (parameterized queries)
- No raw SQL queries
- Input validation on all endpoints
- Prepared statements everywhere

### ⚠️ Recommendations

```java
// Always use parameterized queries
@Query("SELECT u FROM User u WHERE u.email = ?1")  // ✅ Safe
Optional<User> findByEmail(String email);

// NEVER concatenate strings in queries
// String query = "SELECT * FROM users WHERE email = '" + email + "'";  // ❌ NEVER!

// Use JPA specifications for complex queries
Specification<User> spec = (root, query, cb) -> cb.equal(root.get("email"), email);
userRepository.findOne(spec);
```

**Database Security Checklist:**
- [ ] Principle of least privilege for DB user
- [ ] Connection encryption (SSL/TLS)
- [ ] Regular backups with encryption
- [ ] Automated security patching
- [ ] Activity logging and monitoring
- [ ] Regular vulnerability scanning

---

## 5. API SECURITY

### ✅ Implementation

**CORS Configuration** (Recommended to add)
```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("https://yourdomain.com")
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowCredentials(true)
            .maxAge(3600);
    }
}
```

**CSRF Protection** (Recommended to add)
```java
@Configuration
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf
            .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
        )
        // ... other config
    }
}
```

**Content Security Policy** (Recommended)
```java
@Component
public class SecurityHeadersFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                   HttpServletResponse response, 
                                   FilterChain filterChain) {
        response.setHeader("Content-Security-Policy", 
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'");
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("X-Frame-Options", "DENY");
        response.setHeader("X-XSS-Protection", "1; mode=block");
        filterChain.doFilter(request, response);
    }
}
```

---

## 6. INPUT VALIDATION

### ✅ Implementation

**DTO Validation**
```java
@Data
public class RegisterRequest {
    @NotBlank
    @Email
    private String email;
    
    @NotBlank
    @Size(min = 8, max = 100)
    private String password;
    
    @NotNull
    @PastOrPresent
    private LocalDate dateOfBirth;
    
    private String phone;
}
```

**Global Exception Handling**
```java
@ExceptionHandler(MethodArgumentNotValidException.class)
public ResponseEntity<ApiResponse<Map<String, String>>> handleValidation(
        MethodArgumentNotValidException ex) {
    Map<String, String> errors = ex.getBindingResult()
        .getFieldErrors()
        .stream()
        .collect(Collectors.toMap(
            FieldError::getField,
            FieldError::getDefaultMessage
        ));
    return ResponseEntity.badRequest()
        .body(ApiResponse.error("Validation failed", errors));
}
```

### ⚠️ Frontend Validation

```typescript
// Validate before sending to API
export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function validatePassword(password: string): string[] {
    const issues: string[] = [];
    if (password.length < 8) issues.push("At least 8 characters");
    if (!/[A-Z]/.test(password)) issues.push("At least one uppercase letter");
    if (!/[a-z]/.test(password)) issues.push("At least one lowercase letter");
    if (!/\d/.test(password)) issues.push("At least one number");
    return issues;
}
```

---

## 7. LOGGING & MONITORING

### ⚠️ Recommendations

**Never Log:**
- ❌ Passwords or password hashes
- ❌ API keys or tokens
- ❌ PII (names, emails, phone numbers in plaintext)
- ❌ Credit card numbers
- ❌ OTPs

**Always Log:**
- ✅ Security events (login failures, lockouts)
- ✅ Authorization failures
- ✅ API rate limit violations
- ✅ Database connection failures
- ✅ Unusual transaction amounts

```java
// Good logging
log.warn("Failed login attempt for email: {} (attempt {}/5)", 
    maskEmail(email), user.getLoginAttempts());

log.info("Large transaction processed: amount={}, user={}", 
    amount, user.getId());  // Don't log user email

// Bad logging
log.info("User logged in: " + password);  // ❌ NEVER!
log.debug("Full request body: " + requestBody);  // ❌ Could expose secrets
```

**Setup ELK Stack or Similar:**
```yaml
# logs/logback-spring.xml
<configuration>
  <appender name="ASYNC_FILE" class="ch.qos.logback.classic.AsyncAppender">
    <appender-ref ref="FILE"/>
  </appender>
  
  <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
    <file>logs/fstpay.log</file>
    <rollingPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy">
      <fileNamePattern>logs/fstpay.%d{yyyy-MM-dd}.%i.gz</fileNamePattern>
      <maxFileSize>100MB</maxFileSize>
      <maxHistory>30</maxHistory>
    </rollingPolicy>
  </appender>
</configuration>
```

---

## 8. DEPENDENCY SECURITY

### ✅ Regular Scanning

```bash
# Check for vulnerabilities
mvn org.owasp:dependency-check-maven:check

# Update vulnerable packages
npm audit fix
npm audit fix --force

# Use Snyk for continuous monitoring
snyk test
snyk monitor
```

### Build-Time Checks

```bash
# Add to CI/CD pipeline
./gradlew dependencyCheckAnalyze
npm audit
./mvnw clean verify -P security
```

---

## 9. DEPLOYMENT SECURITY

### ✅ Checklist

- [ ] **HTTPS Only**: All traffic encrypted (TLS 1.2+)
- [ ] **Security Headers**: HSTS, CSP, X-Frame-Options, etc.
- [ ] **Database**: Encrypted connections, backups
- [ ] **Secrets Management**: External vault, never in code
- [ ] **Firewalls**: Restrict access to only needed ports
- [ ] **API Gateway**: Rate limiting, request validation
- [ ] **WAF**: Web Application Firewall rules
- [ ] **Logging**: Centralized, encrypted, retained
- [ ] **Monitoring**: Alerts on security events
- [ ] **Patches**: Regular OS and dependency updates

### Infrastructure as Code Example

```terraform
# Secure Spring Boot deployment

resource "aws_security_group" "app_sg" {
  name = "fstpay-app-sg"
  
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

---

## 10. COMPLIANCE & STANDARDS

### 🏦 Financial App Requirements

- [ ] PCI DSS compliance (if handling cards)
- [ ] GDPR compliance (EU users)
- [ ] SOC 2 Type II certification
- [ ] Regular penetration testing
- [ ] Annual security audit
- [ ] Incident response plan

### Age Verification (Youth Protection)

```java
@Data
public class RegisterRequest {
    @NotNull
    @PastOrPresent
    private LocalDate dateOfBirth;
    
    @ValidateAge  // Custom validator
    private LocalDate dateOfBirth;
}

@Component
public class AgeValidator implements ConstraintValidator<ValidateAge, LocalDate> {
    @Override
    public boolean isValid(LocalDate dob, ConstraintValidatorContext context) {
        if (dob == null) return false;
        
        LocalDate minimumAge = LocalDate.now().minusYears(12);
        if (dob.isAfter(minimumAge)) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate(
                "Users must be at least 12 years old"
            ).addConstraintViolation();
            return false;
        }
        
        if (dob.isBefore(LocalDate.now().minusYears(100))) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate(
                "Invalid date of birth"
            ).addConstraintViolation();
            return false;
        }
        
        return true;
    }
}
```

---

## 11. INCIDENT RESPONSE PLAN

### Security Incident Classification

| Severity | Description | Response Time |
|----------|-------------|---|
| Critical | Data breach, system compromise | 1 hour |
| High | Failed login attempts spike, DDoS | 4 hours |
| Medium | Unusual transaction patterns | 24 hours |
| Low | Failed API calls, minor anomalies | 72 hours |

### Response Procedures

```yaml
# Security Incident Checklist

On Detection:
  1. Identify severity level
  2. Isolate affected systems if needed
  3. Preserve logs and evidence
  4. Notify security team
  5. Open incident ticket

Investigation:
  6. Review logs and metrics
  7. Identify root cause
  8. Determine scope of impact
  9. Notify affected users if needed
  10. Document findings

Remediation:
  11. Apply patches/fixes
  12. Deploy to production
  13. Verify resolution
  14. Close incident ticket
  15. Post-mortem within 7 days
```

---

## 12. SECURITY HEADERS (Configuration)

```yaml
# Add to application.yml or SecurityConfig
server:
  servlet:
    session:
      cookie:
        http-only: true
        secure: true
        same-site: strict
        max-age: 1800

spring:
  web:
    resources:
      cache:
        cachecontrol:
          max-age: 31536000
          must-revalidate: true
```

---

## 🚨 CRITICAL ACTIONS BEFORE PRODUCTION

1. **Rotate ALL secrets** generated during development
2. **Enable HTTPS** (Let's Encrypt for free)
3. **Set up WAF** (Cloudflare, AWS WAF)
4. **Configure rate limiting** per user and IP
5. **Enable database encryption** at rest
6. **Set up monitoring** and alerting
7. **Create backup/restore plan**
8. **Test disaster recovery** procedure
9. **Document incident response** plan
10. **Get security audit** from professional firm

---

## 📞 Security Contact

**Security Email:** security@fstpay.com  
**Responsible Disclosure:** See SECURITY_POLICY.md

**Do NOT open public issues for security vulnerabilities.**

