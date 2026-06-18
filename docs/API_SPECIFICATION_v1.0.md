# FST Pay — API Specification (OpenAPI 3.0) v1.0

**Document ID:** FST-API-2026-Q2  
**Version:** 1.0  
**Date:** June 17, 2026  
**Owner:** API Designer / Backend Lead  
**Status:** 🟢 READY FOR DEVELOPMENT

---

## 📋 OVERVIEW

Complete OpenAPI 3.0 specification for FST Pay REST API. Includes all 50+ endpoints across 8 modules (Auth, User, Wallet, Card, Transaction, Analytics, Notification, Admin).

**Base URL:** `https://api.fstpay.com/api/v1` (production)  
**Staging:** `https://staging-api.fstpay.com/api/v1`  
**Local:** `http://localhost:8080/api/v1`

**Authentication:** JWT Bearer Token in `Authorization` header

---

## 🔐 AUTHENTICATION MODULE

### POST /auth/signup

Register a new user account.

**Request:**
```json
{
  "email": "smburhan.personal@gmail.com",
  "password": "Burhan@1234",
  "fullName": "Burhan Test",
  "dateOfBirth": "2010-01-15"
}
```

**Validation Rules:**
- Email: Valid email format, not already registered
- Password: Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
- DOB: User must be 12+ years old
- All fields required

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "message": "Signup successful. OTP sent to your email.",
    "sessionId": "sess-uuid-123",
    "email": "smburhan.personal@gmail.com",
    "requiresOtp": true,
    "otpExpiresIn": 600
  },
  "timestamp": "2026-06-17T10:30:00Z"
}
```

**Error Responses:**
- 400: Invalid password format / Age too young / Email invalid
- 409: Email already registered
- 429: Too many signup attempts (5/hour per IP)
- 500: Internal server error

**Rate Limiting:** 5 signups per IP per hour

---

### POST /auth/verify-otp

Verify OTP and complete signup.

**Request:**
```json
{
  "sessionId": "sess-uuid-123",
  "otp": "123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Email verified successfully",
    "user": {
      "id": "user-uuid-123",
      "email": "smburhan.personal@gmail.com",
      "fullName": "Burhan Test",
      "role": "USER",
      "createdAt": "2026-06-17T10:30:00Z"
    }
  },
  "timestamp": "2026-06-17T10:32:00Z"
}
```

**Error Responses:**
- 400: Invalid session / OTP mismatch
- 401: OTP expired (>10 minutes)
- 404: Session not found
- 429: Too many OTP attempts (5/10 min)

---

### POST /auth/login

Authenticate user with email and password.

**Request:**
```json
{
  "email": "smburhan.personal@gmail.com",
  "password": "Burhan@1234",
  "captchaToken": "google-recaptcha-token"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Login successful. OTP sent to your email.",
    "sessionId": "sess-uuid-456",
    "requiresOtp": true,
    "otpExpiresIn": 600
  },
  "timestamp": "2026-06-17T10:35:00Z"
}
```

**Error Responses:**
- 400: Invalid credentials / reCAPTCHA failed
- 401: Account locked (after 5 failed attempts) - returns `{ "lockedUntil": "2026-06-17T10:50:00Z" }`
- 429: Too many login attempts (10/min per IP)

**Rate Limiting:** 10 attempts per minute per IP

---

### POST /auth/verify-login-otp

Verify OTP and get JWT tokens.

**Request:**
```json
{
  "sessionId": "sess-uuid-456",
  "otp": "654321"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400,
    "user": {
      "id": "user-uuid-123",
      "email": "smburhan.personal@gmail.com",
      "fullName": "Burhan Test",
      "role": "USER"
    }
  },
  "timestamp": "2026-06-17T10:37:00Z"
}
```

**Error Responses:**
- 400: OTP invalid / Session expired
- 429: Too many OTP attempts (5/10 min)

---

### POST /auth/refresh-token

Refresh JWT access token using refresh token.

**Request Header:**
```
Authorization: Bearer <refreshToken>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400
  },
  "timestamp": "2026-06-17T10:40:00Z"
}
```

**Error Responses:**
- 401: Invalid or expired refresh token
- 403: Refresh token revoked

---

### POST /auth/logout

Logout user and invalidate tokens.

**Request Header:**
```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  },
  "timestamp": "2026-06-17T10:45:00Z"
}
```

---

### POST /auth/resend-otp

Resend OTP email.

**Request:**
```json
{
  "sessionId": "sess-uuid-123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "OTP resent to your email",
    "otpExpiresIn": 600
  }
}
```

**Rate Limiting:** 3 resends per session (10 min window)

---

## 👤 USER MODULE

### GET /users/me

Get current user profile.

**Request Header:**
```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid-123",
    "email": "smburhan.personal@gmail.com",
    "fullName": "Burhan Test",
    "dateOfBirth": "2010-01-15",
    "role": "USER",
    "status": "ACTIVE",
    "createdAt": "2026-06-17T10:30:00Z",
    "updatedAt": "2026-06-17T10:30:00Z"
  }
}
```

---

### PUT /users/me

Update user profile (non-sensitive fields).

**Request:**
```json
{
  "fullName": "Burhan New Name",
  "phone": "+919876543210"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Profile updated successfully",
    "user": { /* updated user object */ }
  }
}
```

---

### POST /users/change-password

Change password.

**Request:**
```json
{
  "currentPassword": "OldPassword@1234",
  "newPassword": "NewPassword@5678"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Password changed successfully"
  }
}
```

**Error Responses:**
- 400: Current password incorrect / New password too weak
- 401: Unauthorized

---

## 💰 WALLET MODULE

### GET /wallets

Get user's wallet details.

**Request Header:**
```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "wallet-uuid-123",
    "userId": "user-uuid-123",
    "balance": 2000.00,
    "currency": "INR",
    "lastTopupAt": "2026-06-16T15:20:00Z",
    "createdAt": "2026-06-17T10:30:00Z"
  }
}
```

---

### POST /wallets/topup

Initiate wallet top-up transaction.

**Request:**
```json
{
  "amount": 2000.00,
  "paymentMethod": "UPI"
}
```

**Validation:**
- Amount: Min ₹100, Max ₹100,000
- Wallet balance + amount ≤ ₹999,999,999.99

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "orderId": "order-uuid-456",
    "amount": 2000.00,
    "paymentUrl": "https://razorpay.com/pay/order-uuid-456",
    "status": "PENDING",
    "createdAt": "2026-06-17T11:00:00Z"
  }
}
```

**Error Responses:**
- 400: Invalid amount / Amount exceeds limits
- 429: Max 5 top-ups per day per user
- 500: Payment gateway error

---

### POST /wallets/topup-webhook

Webhook endpoint for payment gateway (internal use).

**Request (from Razorpay):**
```json
{
  "orderId": "order-uuid-456",
  "paymentId": "pay-uuid-789",
  "status": "SUCCESS"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "transactionId": "txn-uuid-123",
    "walletBalance": 2000.00,
    "message": "Top-up successful"
  }
}
```

**Idempotency:** All webhook calls are idempotent (safe to retry)

---

## 🎴 CARD MODULE

### POST /cards

Generate new virtual card.

**Request:**
```json
{
  "cardType": "VIRTUAL"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "card-uuid-123",
    "userId": "user-uuid-123",
    "cardNumberMasked": "•••• •••• •••• 1234",
    "expiryDate": "12/27",
    "status": "ACTIVE",
    "dailyLimit": 10000.00,
    "createdAt": "2026-06-17T11:05:00Z"
  }
}
```

---

### GET /cards

List all user cards.

**Query Parameters:**
- `status`: ACTIVE, FROZEN, EXPIRED, CANCELLED (optional)
- `limit`: 1-100 (default 20)
- `offset`: 0+ (default 0)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "cards": [
      { /* card object 1 */ },
      { /* card object 2 */ }
    ],
    "pagination": {
      "limit": 20,
      "offset": 0,
      "total": 2,
      "hasMore": false
    }
  }
}
```

---

### GET /cards/{cardId}

Get specific card details (shows full card number only to owner).

**Request:**
```
Authorization: Bearer <accessToken>
GET /api/v1/cards/card-uuid-123
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "card-uuid-123",
    "cardNumber": "4532123456789012",
    "cardNumberMasked": "•••• •••• •••• 9012",
    "cvv": "123",
    "expiryDate": "12/27",
    "cardholderName": "BURHAN TEST",
    "status": "ACTIVE",
    "dailyLimit": 10000.00,
    "spendingToday": 500.00,
    "createdAt": "2026-06-17T11:05:00Z"
  }
}
```

---

### PUT /cards/{cardId}/freeze

Freeze card (block transactions).

**Request:**
```json
{
  "reason": "Lost"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Card frozen successfully",
    "card": {
      "id": "card-uuid-123",
      "status": "FROZEN"
    }
  }
}
```

---

### PUT /cards/{cardId}/unfreeze

Unfreeze card (enable transactions).

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Card unfrozen successfully",
    "card": {
      "id": "card-uuid-123",
      "status": "ACTIVE"
    }
  }
}
```

---

### PUT /cards/{cardId}/daily-limit

Set daily spending limit on card.

**Request:**
```json
{
  "dailyLimit": 5000.00
}
```

**Validation:**
- Limit: ₹100 - ₹50,000

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Daily limit updated",
    "card": {
      "id": "card-uuid-123",
      "dailyLimit": 5000.00
    }
  }
}
```

---

### DELETE /cards/{cardId}

Cancel card (cannot be undone).

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Card cancelled successfully"
  }
}
```

---

## 💳 TRANSACTION MODULE

### GET /transactions

Get user transaction history.

**Query Parameters:**
- `limit`: 1-100 (default 20)
- `offset`: 0+ (default 0)
- `type`: TOPUP, CARD_PURCHASE, TRANSFER, REFUND, CASHBACK (optional)
- `category`: FOOD, SHOPPING, etc. (optional)
- `status`: PENDING, COMPLETED, FAILED, CANCELLED (optional)
- `startDate`: ISO 8601 date (optional)
- `endDate`: ISO 8601 date (optional)
- `minAmount`: Number (optional)
- `maxAmount`: Number (optional)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "txn-uuid-123",
        "type": "CARD_PURCHASE",
        "category": "FOOD",
        "amount": 500.00,
        "merchantName": "Dominos",
        "description": "Pizza order",
        "status": "COMPLETED",
        "createdAt": "2026-06-17T12:00:00Z"
      },
      { /* more transactions */ }
    ],
    "pagination": {
      "limit": 20,
      "offset": 0,
      "total": 150,
      "hasMore": true
    }
  }
}
```

---

### GET /transactions/{transactionId}

Get detailed transaction information.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "txn-uuid-123",
    "walletId": "wallet-uuid-123",
    "cardId": "card-uuid-123",
    "type": "CARD_PURCHASE",
    "category": "FOOD",
    "amount": 500.00,
    "merchantName": "Dominos",
    "status": "COMPLETED",
    "referenceId": "pay-gateway-123",
    "createdAt": "2026-06-17T12:00:00Z",
    "updatedAt": "2026-06-17T12:00:05Z"
  }
}
```

---

### POST /transactions/categorize

Manually recategorize a transaction.

**Request:**
```json
{
  "category": "SHOPPING"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Transaction recategorized",
    "transaction": {
      "id": "txn-uuid-123",
      "category": "SHOPPING"
    }
  }
}
```

---

### GET /transactions/export

Export transactions as CSV.

**Query Parameters:**
- `startDate`: ISO 8601 date
- `endDate`: ISO 8601 date
- `format`: csv, pdf (default csv)

**Response (200 OK - file download):**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="fstpay_transactions_2026-06.csv"

id,date,merchant,category,amount,status
txn-uuid-123,2026-06-17,Dominos,FOOD,500.00,COMPLETED
...
```

---

## 📊 ANALYTICS MODULE

### GET /analytics/summary

Get monthly spending summary.

**Query Parameters:**
- `month`: YYYY-MM format (optional, default current month)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "month": "2026-06",
    "totalSpending": 8500.00,
    "totalIncome": 10000.00,
    "netSavings": 1500.00,
    "categoryBreakdown": {
      "FOOD": {
        "amount": 2100.00,
        "percentage": 24.7,
        "transactionCount": 15
      },
      "SHOPPING": {
        "amount": 2125.00,
        "percentage": 25.0,
        "transactionCount": 8
      },
      "ENTERTAINMENT": {
        "amount": 1275.00,
        "percentage": 15.0,
        "transactionCount": 12
      },
      "EDUCATION": {
        "amount": 2550.00,
        "percentage": 30.0,
        "transactionCount": 4
      },
      "OTHER": {
        "amount": 450.00,
        "percentage": 5.3,
        "transactionCount": 6
      }
    },
    "comparisonWithPreviousMonth": {
      "percentageChange": 18.0,
      "direction": "UP"
    }
  }
}
```

---

### GET /analytics/daily-trend

Get daily spending trend for month.

**Query Parameters:**
- `month`: YYYY-MM (optional, default current month)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "month": "2026-06",
    "dailyData": [
      {
        "date": "2026-06-01",
        "spending": 250.00,
        "transactionCount": 3
      },
      {
        "date": "2026-06-02",
        "spending": 450.00,
        "transactionCount": 5
      },
      { /* more days */ }
    ],
    "averageDailySpending": 283.33,
    "highestSpendingDay": "2026-06-15",
    "highestSpendingAmount": 1200.00
  }
}
```

---

### GET /analytics/category-trend

Get category spending trend over time.

**Query Parameters:**
- `months`: Number of months to include (default 3)
- `category`: Specific category (optional)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "category": "FOOD",
    "trend": [
      {
        "month": "2026-04",
        "amount": 1900.00
      },
      {
        "month": "2026-05",
        "amount": 2000.00
      },
      {
        "month": "2026-06",
        "amount": 2100.00
      }
    ]
  }
}
```

---

### GET /analytics/insights

Get AI-generated insights.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "insights": [
      {
        "id": "insight-1",
        "type": "SPENDING_INCREASE",
        "message": "Your food spending increased 20% this month",
        "category": "FOOD",
        "percentageChange": 20,
        "impact": "HIGH"
      },
      {
        "id": "insight-2",
        "type": "SAVING_OPPORTUNITY",
        "message": "Reducing entertainment by 25% would save ₹300/month",
        "category": "ENTERTAINMENT",
        "potentialSavings": 300,
        "impact": "MEDIUM"
      }
    ]
  }
}
```

---

## 🔔 NOTIFICATION MODULE

### GET /notifications

Get user notifications.

**Query Parameters:**
- `limit`: 1-100 (default 20)
- `offset`: 0+ (default 0)
- `read`: true, false (optional)
- `type`: TRANSACTION, OTP, SECURITY, ALERT, PROMOTION (optional)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif-uuid-123",
        "type": "TRANSACTION",
        "title": "Payment successful",
        "message": "₹500 deducted from your wallet for Dominos order",
        "read": false,
        "createdAt": "2026-06-17T12:00:00Z"
      },
      { /* more notifications */ }
    ],
    "pagination": {
      "limit": 20,
      "offset": 0,
      "total": 42,
      "unreadCount": 3,
      "hasMore": true
    }
  }
}
```

---

### PUT /notifications/{notificationId}/read

Mark notification as read.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Notification marked as read"
  }
}
```

---

### PUT /notifications/read-all

Mark all notifications as read.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "All notifications marked as read",
    "count": 3
  }
}
```

---

### DELETE /notifications/{notificationId}

Delete notification.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Notification deleted"
  }
}
```

---

### PUT /notifications/preferences

Update notification preferences.

**Request:**
```json
{
  "emailNotifications": true,
  "pushNotifications": true,
  "notificationTypes": {
    "TRANSACTION": true,
    "SECURITY": true,
    "PROMOTION": false
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Preferences updated"
  }
}
```

---

## 👨‍👩‍👧 FAMILY MODULE (Phase 2)

### POST /family/link-request

Send parent link request.

**Request:**
```json
{
  "parentEmail": "parent@example.com"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "message": "Link request sent to parent"
  }
}
```

---

### GET /family/child/{childId}

Get child's financial summary (parent only).

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "child": {
      "id": "user-uuid-123",
      "fullName": "Burhan Test",
      "monthlySpending": 8500.00,
      "walletBalance": 1500.00,
      "categoryBreakdown": { /* same as analytics */ }
    }
  }
}
```

---

## ⚙️ ADMIN MODULE (Phase 2)

### GET /admin/users

List all users (admin only).

**Query Parameters:**
- `role`: ADMIN, USER, PARENT
- `status`: ACTIVE, INACTIVE, SUSPENDED
- `limit`: 1-100
- `offset`: 0+

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "users": [ /* list of users */ ],
    "pagination": { /* pagination */ }
  }
}
```

---

### PUT /admin/users/{userId}/suspend

Suspend user account (admin only).

**Request:**
```json
{
  "reason": "Suspicious activity"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "User account suspended"
  }
}
```

---

## 🔍 RATE LIMITING

All endpoints follow these rate limits:

```
Authentication endpoints:
  - /auth/* → 10 requests/minute per IP

AI Coach endpoints:
  - /aicoach/* → 20 requests/minute per user

General endpoints:
  - All others → 150 requests/minute per user

Response Headers:
  X-RateLimit-Limit: 150
  X-RateLimit-Remaining: 145
  X-RateLimit-Reset: 1623952800

When limit exceeded (429 Too Many Requests):
  Retry-After: 60
  
  Response:
  {
    "success": false,
    "error": {
      "code": "RATE_LIMIT_EXCEEDED",
      "message": "Too many requests. Try again in 60 seconds"
    }
  }
```

---

## ✅ ERROR CODES REFERENCE

| Code | Status | Description |
|------|--------|-------------|
| VALIDATION_ERROR | 400 | Input validation failed |
| INVALID_REQUEST | 400 | Malformed request |
| INSUFFICIENT_BALANCE | 400 | Wallet/card balance too low |
| LIMIT_EXCEEDED | 400 | Daily/monthly limit exceeded |
| UNAUTHORIZED | 401 | Missing or invalid JWT token |
| TOKEN_EXPIRED | 401 | JWT token expired |
| FORBIDDEN | 403 | User lacks permission |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource already exists |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| INTERNAL_SERVER_ERROR | 500 | Backend error |
| SERVICE_UNAVAILABLE | 503 | Service temporarily down |

---

## 📦 REQUEST/RESPONSE STANDARDS

### All Responses Follow This Format

```json
{
  "success": true/false,
  "data": { /* response payload */ } OR "error": { /* error payload */ },
  "timestamp": "2026-06-17T10:30:00Z"
}
```

### Request Headers (Required)

```
Content-Type: application/json
Authorization: Bearer <accessToken> (for protected endpoints)
X-Request-ID: <unique-request-id> (optional, for tracing)
```

### Response Headers (Always Included)

```
Content-Type: application/json
X-Request-ID: <echo-of-request-id>
Cache-Control: no-cache, no-store, must-revalidate
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
```

---

## 📝 PAGINATION STANDARD

All list endpoints support pagination:

```json
{
  "data": {
    "items": [ /* list */ ],
    "pagination": {
      "limit": 20,
      "offset": 0,
      "total": 500,
      "hasMore": true
    }
  }
}
```

Query parameters:
- `limit`: 1-100 (default 20)
- `offset`: 0+ (default 0)

---

## 🔐 SECURITY HEADERS

All responses include:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'
Referrer-Policy: strict-origin-when-cross-origin
```

---

## 🧪 TESTING ENDPOINTS

```
Local/Staging Only:

POST /test/reset-db
- Clears all data (dev only, use with caution)

POST /test/seed-data
- Creates sample users, transactions, etc.

GET /health
- Returns service health status

GET /actuator/health
- Spring Boot health endpoint details
```

---

**Document Version:** 1.0  
**Total Endpoints:** 50+  
**Modules:** 8 (Auth, User, Wallet, Card, Transaction, Analytics, Notification, Admin)  
**Last Updated:** June 17, 2026  
**Ready for:** Development

