# FST Pay — Technical Architecture v1.0

**Document ID:** FST-ARCH-2026-Q2  
**Version:** 1.0  
**Date:** June 17, 2026  
**Owner:** Backend Architect / Tech Lead  
**Status:** 🟢 READY FOR ENGINEERING

---

## 📋 EXECUTIVE SUMMARY

FST Pay uses a modular monolith architecture with clear separation of concerns. This design balances simplicity for MVP deployment with modularity for future scaling.

**Tech Stack:**
- **Backend:** Spring Boot 3.3.6 + Java 17
- **Frontend:** React 19.2.6 + TypeScript 6.0
- **Database:** PostgreSQL 14+
- **Cache:** Redis 6.0+
- **Infrastructure:** Docker + Docker Compose (local), Kubernetes-ready for production
- **API:** REST + WebSocket (future)

**Deployment:**
- Local: Docker Compose (2-container: app + db)
- Staging: Docker on AWS ECS
- Production: Kubernetes on AWS EKS (Phase 2)

---

## 🏗️ SYSTEM ARCHITECTURE

### C4 Context Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        FST Pay System                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐          ┌──────────────┐                 │
│  │   React      │          │    Mobile    │                 │
│  │   Frontend   │          │  App (RN)    │                 │
│  │  (Desktop)   │          │  (Phase 2)   │                 │
│  └──────┬───────┘          └──────┬───────┘                 │
│         │                         │                          │
│         └────────────┬────────────┘                          │
│                      │                                       │
│         HTTP / HTTPS │ REST + WebSocket                      │
│                      ↓                                       │
│         ┌────────────────────────────┐                      │
│         │   Spring Boot Backend      │                      │
│         │  (API Server, auth, logic) │                      │
│         └────────┬───────┬───────────┘                      │
│                  │       │                                   │
│      Cache │     │       │                                   │
│      Redis │     │       │                                   │
│         ┌──┴──┐  │       ├──→ Email Service (SendGrid)      │
│         │     │  │       │                                   │
│         │     │  │       ├──→ Payment Gateway (Razorpay)    │
│         │     │  │       │                                   │
│         │     │  │       ├──→ SMS Service (Twilio)          │
│         │     │  │       │                                   │
│         │     │  ↓       └──→ reCAPTCHA                     │
│         │     │ PostgreSQL                                   │
│         │     │ Database                                     │
│         │     │                                              │
│         └──────┘                                             │
│                                                               │
└─────────────────────────────────────────────────────────────┘

External Services (Cloud):
- Payment Gateway (Razorpay, Instamojo)
- Email Service (SendGrid, SES)
- SMS Service (Twilio)
- Monitoring (DataDog, NewRelic)
- Analytics (Amplitude, Mixpanel)
```

### Container Diagram (Application Layer)

```
┌─────────────────────────────────────────────────────────────┐
│                    Spring Boot Application                    │
│                  (Modular Monolith)                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  HTTP Layer                             │ │
│  │  - AuthController, WalletController, CardController    │ │
│  │  - NotificationController, AnalyticsController         │ │
│  └──────────────────────┬─────────────────────────────────┘ │
│                         │                                     │
│  ┌──────────────────────▼─────────────────────────────────┐ │
│  │              Authentication & Security                  │ │
│  │  - JWT Token Provider (JJWT)                           │ │
│  │  - Spring Security Config                              │ │
│  │  - OTP Service                                          │ │
│  │  - Account Lockout Logic                               │ │
│  │  - Rate Limiter Filter                                 │ │
│  └──────────────────────┬─────────────────────────────────┘ │
│                         │                                     │
│  ┌──────────────────────▼─────────────────────────────────┐ │
│  │                   Business Logic                        │ │
│  │                 (Service Layer)                         │ │
│  │                                                          │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │ │
│  │  │  Auth    │  │ Wallet   │  │ Card     │              │ │
│  │  │ Service  │  │ Service  │  │ Service  │              │ │
│  │  └──────────┘  └──────────┘  └──────────┘              │ │
│  │                                                          │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │ │
│  │  │Transaction│  │ Analytics│  │Notification            │ │
│  │  │ Service  │  │ Service  │  │ Service  │              │ │
│  │  └──────────┘  └──────────┘  └──────────┘              │ │
│  │                                                          │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │ │
│  │  │  User    │  │ Admin    │  │  AI      │              │ │
│  │  │ Service  │  │ Service  │  │ Coach    │              │ │
│  │  └──────────┘  └──────────┘  └──────────┘              │ │
│  └──────────────────────┬─────────────────────────────────┘ │
│                         │                                     │
│  ┌──────────────────────▼─────────────────────────────────┐ │
│  │                Data Access Layer                        │ │
│  │           (Repositories, JPA Entities)                  │ │
│  │                                                          │ │
│  │  UserRepository, WalletRepository, CardRepository...    │ │
│  └──────────────────────┬─────────────────────────────────┘ │
│                         │                                     │
│           ┌─────────────┴─────────────┬─────────────┐        │
│           ↓                           ↓             ↓        │
│       PostgreSQL               Redis Cache     External API   │
│       Database                                  Integrations  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 PROJECT FOLDER STRUCTURE

```
FST_Pay/
├── backend/                                 # Spring Boot application
│   ├── pom.xml                             # Maven configuration
│   ├── Dockerfile                          # Container definition
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/fstpay/
│   │   │   │   ├── FstPayApplication.java  # Main Spring Boot entry
│   │   │   │   ├── config/                 # Configuration classes
│   │   │   │   │   ├── SecurityConfig.java
│   │   │   │   │   ├── JwtConfig.java
│   │   │   │   │   ├── CorsConfig.java
│   │   │   │   │   ├── CacheConfig.java
│   │   │   │   │   └── AppConfig.java
│   │   │   │   ├── common/                 # Shared utilities
│   │   │   │   │   ├── constants/
│   │   │   │   │   │   ├── AppConstants.java
│   │   │   │   │   │   └── ErrorCodes.java
│   │   │   │   │   ├── filter/
│   │   │   │   │   │   ├── RateLimitFilter.java
│   │   │   │   │   │   ├── JwtFilter.java
│   │   │   │   │   │   └── CorsFilter.java
│   │   │   │   │   ├── exception/
│   │   │   │   │   │   ├── GlobalExceptionHandler.java
│   │   │   │   │   │   ├── AppException.java
│   │   │   │   │   │   └── ValidationException.java
│   │   │   │   │   ├── model/              # Shared DTOs
│   │   │   │   │   │   ├── ApiResponse.java
│   │   │   │   │   │   ├── PagedResponse.java
│   │   │   │   │   │   └── ErrorResponse.java
│   │   │   │   │   └── util/
│   │   │   │   │       ├── JwtUtil.java
│   │   │   │   │       ├── OtpUtil.java
│   │   │   │   │       └── ValidationUtil.java
│   │   │   │   │
│   │   │   │   ├── auth/                   # Authentication module
│   │   │   │   │   ├── controller/
│   │   │   │   │   │   └── AuthController.java
│   │   │   │   │   ├── service/
│   │   │   │   │   │   └── AuthService.java
│   │   │   │   │   ├── dto/
│   │   │   │   │   │   ├── SignupRequest.java
│   │   │   │   │   │   ├── LoginRequest.java
│   │   │   │   │   │   ├── OtpVerifyRequest.java
│   │   │   │   │   │   ├── TokenRefreshRequest.java
│   │   │   │   │   │   └── AuthResponse.java
│   │   │   │   │   └── entity/
│   │   │   │   │       └── OtpToken.java (if storing OTPs in DB)
│   │   │   │   │
│   │   │   │   ├── user/                   # User module
│   │   │   │   │   ├── controller/
│   │   │   │   │   │   └── UserController.java
│   │   │   │   │   ├── service/
│   │   │   │   │   │   └── UserService.java
│   │   │   │   │   ├── dto/
│   │   │   │   │   │   ├── UserDto.java
│   │   │   │   │   │   └── UpdateProfileRequest.java
│   │   │   │   │   ├── entity/
│   │   │   │   │   │   └── User.java       # JPA entity
│   │   │   │   │   └── repository/
│   │   │   │   │       └── UserRepository.java
│   │   │   │   │
│   │   │   │   ├── wallet/                 # Wallet module
│   │   │   │   │   ├── controller/
│   │   │   │   │   │   └── WalletController.java
│   │   │   │   │   ├── service/
│   │   │   │   │   │   └── WalletService.java
│   │   │   │   │   ├── dto/
│   │   │   │   │   │   ├── WalletDto.java
│   │   │   │   │   │   ├── TopupRequest.java
│   │   │   │   │   │   └── TopupResponse.java
│   │   │   │   │   ├── entity/
│   │   │   │   │   │   └── Wallet.java
│   │   │   │   │   └── repository/
│   │   │   │   │       └── WalletRepository.java
│   │   │   │   │
│   │   │   │   ├── card/                   # Card module
│   │   │   │   │   ├── controller/
│   │   │   │   │   │   └── CardController.java
│   │   │   │   │   ├── service/
│   │   │   │   │   │   └── CardService.java
│   │   │   │   │   ├── dto/
│   │   │   │   │   │   ├── CardDto.java
│   │   │   │   │   │   ├── GenerateCardRequest.java
│   │   │   │   │   │   └── CardLimitRequest.java
│   │   │   │   │   ├── entity/
│   │   │   │   │   │   └── Card.java
│   │   │   │   │   └── repository/
│   │   │   │   │       └── CardRepository.java
│   │   │   │   │
│   │   │   │   ├── transaction/            # Transaction module
│   │   │   │   │   ├── controller/
│   │   │   │   │   │   └── TransactionController.java
│   │   │   │   │   ├── service/
│   │   │   │   │   │   └── TransactionService.java
│   │   │   │   │   ├── dto/
│   │   │   │   │   │   ├── TransactionDto.java
│   │   │   │   │   │   └── TransactionFilterDto.java
│   │   │   │   │   ├── entity/
│   │   │   │   │   │   └── Transaction.java
│   │   │   │   │   └── repository/
│   │   │   │   │       └── TransactionRepository.java
│   │   │   │   │
│   │   │   │   ├── analytics/              # Analytics module
│   │   │   │   │   ├── controller/
│   │   │   │   │   │   └── AnalyticsController.java
│   │   │   │   │   ├── service/
│   │   │   │   │   │   └── AnalyticsService.java
│   │   │   │   │   └── dto/
│   │   │   │   │       ├── MonthlySummaryDto.java
│   │   │   │   │       └── CategoryBreakdownDto.java
│   │   │   │   │
│   │   │   │   ├── notification/           # Notification module
│   │   │   │   │   ├── controller/
│   │   │   │   │   │   └── NotificationController.java
│   │   │   │   │   ├── service/
│   │   │   │   │   │   ├── NotificationService.java
│   │   │   │   │   │   ├── EmailService.java
│   │   │   │   │   │   └── PushService.java
│   │   │   │   │   ├── dto/
│   │   │   │   │   │   └── NotificationDto.java
│   │   │   │   │   ├── entity/
│   │   │   │   │   │   └── Notification.java
│   │   │   │   │   └── repository/
│   │   │   │   │       └── NotificationRepository.java
│   │   │   │   │
│   │   │   │   ├── admin/                  # Admin module (Phase 2)
│   │   │   │   │   └── ...
│   │   │   │   │
│   │   │   │   └── aicoach/                # AI Coach module (Phase 2)
│   │   │   │       └── ...
│   │   │   │
│   │   │   └── resources/
│   │   │       ├── application.yml         # Main config
│   │   │       ├── application-dev.yml     # Dev profile
│   │   │       ├── application-prod.yml    # Prod profile
│   │   │       ├── logback-spring.xml      # Logging config
│   │   │       └── db/
│   │   │           └── migration/          # Flyway migrations
│   │   │               ├── V1__init.sql
│   │   │               ├── V2__parental_control.sql
│   │   │               ├── V3__parent_details.sql
│   │   │               ├── V4__card_customization.sql
│   │   │               └── V5__account_lockout.sql
│   │   │
│   │   └── test/
│   │       ├── java/com/fstpay/
│   │       │   ├── auth/
│   │       │   │   ├── AuthServiceTest.java
│   │       │   │   └── AuthControllerTest.java
│   │       │   ├── wallet/
│   │       │   │   └── WalletServiceTest.java
│   │       │   └── integration/
│   │       │       └── ApiIntegrationTest.java
│   │       └── resources/
│   │           └── application-test.yml
│   │
│   └── target/                              # Build output (generated)
│
├── frontend/                                # React TypeScript application
│   ├── package.json                        # NPM dependencies
│   ├── tsconfig.json                       # TypeScript config
│   ├── vite.config.ts                      # Vite build config
│   ├── tailwind.config.js                  # Tailwind CSS config
│   ├── Dockerfile                          # Container definition
│   ├── nginx.conf                          # Nginx reverse proxy
│   ├── index.html                          # HTML entry point
│   ├── src/
│   │   ├── main.tsx                        # React entry
│   │   ├── App.tsx                         # Root component
│   │   ├── index.css                       # Global styles
│   │   │
│   │   ├── api/
│   │   │   ├── axios.ts                    # HTTP client with interceptors
│   │   │   └── endpoints.ts                # API endpoint URLs
│   │   │
│   │   ├── types/
│   │   │   └── index.ts                    # TypeScript interfaces
│   │   │
│   │   ├── context/
│   │   │   ├── AuthContext.tsx             # Auth state
│   │   │   └── ThemeContext.tsx            # Theme state
│   │   │
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.tsx           # Main layout wrapper
│   │   │   │   ├── Navbar.tsx              # Top navigation
│   │   │   │   ├── Sidebar.tsx             # Side navigation
│   │   │   │   ├── CommandPalette.tsx      # Command palette
│   │   │   │   └── ProtectedRoute.tsx      # Route guard
│   │   │   ├── common/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Loading.tsx
│   │   │   │   └── ErrorBoundary.tsx
│   │   │   └── ReCaptcha.tsx               # reCAPTCHA component
│   │   │
│   │   ├── utils/
│   │   │   └── helpers.ts                  # Utilities (format, validate, etc.)
│   │   │
│   │   └── features/
│   │       ├── auth/
│   │       │   ├── Login.tsx               # Login page
│   │       │   └── Register.tsx            # Signup page
│   │       ├── dashboard/
│   │       │   └── Dashboard.tsx           # Dashboard home
│   │       ├── wallet/
│   │       │   └── WalletPage.tsx          # Wallet management
│   │       ├── cards/
│   │       │   └── CardsPage.tsx           # Card management
│   │       ├── transactions/
│   │       │   └── TransactionsPage.tsx    # Transaction history
│   │       ├── analytics/
│   │       │   └── AnalyticsPage.tsx       # Analytics dashboard
│   │       ├── ai-coach/
│   │       │   └── AiCoachPage.tsx         # Coach interaction
│   │       ├── rewards/
│   │       │   └── RewardsPage.tsx         # Rewards dashboard
│   │       ├── admin/
│   │       │   └── AdminPage.tsx           # Admin panel (Phase 2)
│   │       └── settings/
│   │           └── SettingsPage.tsx        # User settings
│   │
│   ├── public/                              # Static assets
│   └── node_modules/                        # NPM packages (generated)
│
├── docker-compose.yml                      # Local deployment (dev)
├── .env.example                            # Environment variables template
├── MASTER_OPERATING_SYSTEM.md             # Org charter (9 roles)
├── PHASE_0_SUMMARY.md                     # Phase 0 sign-off
├── docs/
│   ├── PRD_v1.0.md
│   ├── COMPETITIVE_ANALYSIS_v1.0.md
│   ├── USER_STORIES_v1.0.md
│   ├── SUCCESS_METRICS_v1.0.md
│   ├── USER_FLOWS_v1.0.md
│   └── TECHNICAL_ARCHITECTURE_v1.0.md    # This file
└── README.md
```

---

## 🗄️ DATABASE SCHEMA

### Core Tables

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    date_of_birth DATE NOT NULL,
    role VARCHAR(50) DEFAULT 'USER', -- ADMIN, USER, PARENT
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, SUSPENDED
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT age_check CHECK (DATE_PART('year', AGE(date_of_birth)) >= 12)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_locked_until ON users(locked_until);

-- Wallets table
CREATE TABLE wallets (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(15, 2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'INR',
    last_topup_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wallets_user_id ON wallets(user_id);

-- Cards table
CREATE TABLE cards (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    card_number_hash VARCHAR(255) NOT NULL, -- Never store plaintext
    cvv_hash VARCHAR(255) NOT NULL,
    expiry_date VARCHAR(5) NOT NULL, -- MM/YY format
    cardholder_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, FROZEN, EXPIRED, CANCELLED
    daily_limit DECIMAL(10, 2) DEFAULT 10000.00,
    spending_today DECIMAL(15, 2) DEFAULT 0.00,
    last_spending_reset DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cards_user_id ON cards(user_id);
CREATE INDEX idx_cards_status ON cards(status);

-- Transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    card_id UUID REFERENCES cards(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL, -- TOPUP, CARD_PURCHASE, TRANSFER, REFUND, CASHBACK
    category VARCHAR(50), -- FOOD, SHOPPING, ENTERTAINMENT, TRAVEL, EDUCATION, UTILITIES, OTHER
    amount DECIMAL(15, 2) NOT NULL,
    merchant_name VARCHAR(255),
    description VARCHAR(500),
    status VARCHAR(50) DEFAULT 'COMPLETED', -- PENDING, COMPLETED, FAILED, CANCELLED
    reference_id VARCHAR(255), -- External payment gateway ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_transactions_type ON transactions(type);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100), -- TRANSACTION, OTP, SECURITY, ALERT, PROMOTION
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Parent-Child relationships
CREATE TABLE parent_child_links (
    id UUID PRIMARY KEY,
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_level VARCHAR(50) DEFAULT 'VIEW_ONLY', -- VIEW_ONLY, MANAGE_SPENDING, FULL_CONTROL
    linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(parent_id, child_id)
);

CREATE INDEX idx_parent_child_parent ON parent_child_links(parent_id);
CREATE INDEX idx_parent_child_child ON parent_child_links(child_id);
```

### Entity Relationship Diagram (ERD)

```
                    ┌──────────────────┐
                    │      users       │
                    │──────────────────│
                    │ id (PK)          │
                    │ email (UNIQUE)   │
                    │ password_hash    │
                    │ full_name        │
                    │ date_of_birth    │
                    │ role             │
                    │ login_attempts   │
                    │ locked_until     │
                    └────────┬─────────┘
                             │
                    ┌────────┴────────┬──────────────┐
                    │                 │              │
                    ↓                 ↓              ↓
            ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
            │   wallets    │  │    cards     │  │notification │
            ├──────────────┤  ├──────────────┤  ├──────────────┤
            │ id (PK)      │  │ id (PK)      │  │ id (PK)      │
            │ user_id (FK) │  │ user_id (FK) │  │ user_id (FK) │
            │ balance      │  │ wallet_id    │  │ type         │
            │ currency     │  │ card_number  │  │ title        │
            └──────┬───────┘  │ cvv_hash     │  │ message      │
                   │          │ expiry_date  │  │ read         │
                   │          │ status       │  └──────────────┘
                   │          │ daily_limit  │
                   │          └──────┬───────┘
                   │                 │
                   ├─────────────────┤
                   ↓                 ↓
            ┌──────────────────────────────┐
            │      transactions            │
            ├──────────────────────────────┤
            │ id (PK)                      │
            │ user_id (FK)                 │
            │ wallet_id (FK)               │
            │ card_id (FK, nullable)       │
            │ type                         │
            │ category                     │
            │ amount                       │
            │ merchant_name                │
            │ status                       │
            └──────────────────────────────┘

            ┌──────────────────────────────┐
            │   parent_child_links         │
            ├──────────────────────────────┤
            │ id (PK)                      │
            │ parent_id (FK → users)       │
            │ child_id (FK → users)        │
            │ permission_level             │
            └──────────────────────────────┘
```

---

## 🔌 EXTERNAL SERVICE INTEGRATIONS

### 1. Payment Gateway (Razorpay / Instamojo)

```
FST Pay App
    ↓ Top-up Request (amount, payment method)
    ↓
Backend (WalletService.topupWallet)
    ↓ Create Order via Razorpay API
    ↓
Razorpay API
    ↓ Return Order ID + Payment Link
    ↓
Frontend: Redirect to Payment Link
    ↓ User pays via UPI/Card
    ↓
Razorpay: Webhook notification (payment.authorized)
    ↓
Backend: Handle webhook, update wallet balance
    ↓
FST App: Show success, wallet updated
```

**Integration Points:**
- `WalletService.initiateTopup()` → Create Razorpay order
- `PaymentWebhookController.handleWebhook()` → Process payment confirmation
- Retry logic for failed webhook delivery
- Idempotency keys to prevent duplicate transactions

### 2. Email Service (SendGrid / AWS SES)

```
Event: User signs up
    ↓
Backend: AuthService.register()
    ↓ Send OTP email
    ↓
EmailService.sendOtp(email, otp)
    ↓ Call SendGrid API
    ↓
SendGrid: Deliver email
    ↓
User: Receives OTP email
```

**Integration Points:**
- `EmailService.sendOtp()` - Send OTP for verification
- `EmailService.sendWelcome()` - Welcome email after signup
- `EmailService.sendTransactionReceipt()` - Transaction notifications
- `EmailService.sendMonthlyReport()` - Monthly summary

### 3. SMS Service (Twilio - Phase 1B)

```
Event: User enables 2FA
    ↓
SmsService.send2FaOtp(phoneNumber, otp)
    ↓ Call Twilio API
    ↓
Twilio: Send SMS
    ↓
User: Receives OTP SMS
```

### 4. reCAPTCHA (Google)

```
Frontend: Signup/Login form
    ↓ User checks "I'm not a robot"
    ↓
Google reCAPTCHA: Challenge/Response
    ↓
Frontend: Get token, send to backend
    ↓
Backend: AuthService.verifyRecaptcha(token)
    ↓ Call Google reCAPTCHA API
    ↓
Google: Return score (0-1)
    ↓
Backend: If score > 0.7, proceed; else reject
```

---

## 🔐 SECURITY ARCHITECTURE

### Authentication Flow

```
User: Email + Password + reCAPTCHA
    ↓
Frontend: POST /api/v1/auth/login
    ↓
Backend: AuthService.login()
    ↓ Verify password (bcrypt)
    ↓ Generate OTP (6 digits, 10-min expiry)
    ↓ Send OTP email
    ↓ Return temporary session ID
    ↓
Response: { sessionId, message: "OTP sent" }
    ↓
User: Enters OTP
    ↓
Frontend: POST /api/v1/auth/verify-otp
    ↓
Backend: AuthService.verifyOtp(sessionId, otp)
    ↓ Verify OTP matches + not expired
    ↓ Generate JWT tokens
    ↓ Return accessToken + refreshToken
    ↓
Response: { accessToken, refreshToken, user }
    ↓
Frontend: Store tokens in localStorage
    ↓
User: Logged in, can access dashboard
```

### Token Management

```
Access Token (24 hours):
- Issued after OTP verification
- Included in Authorization header: "Bearer <token>"
- Contains: userId, role, email
- Short-lived for security

Refresh Token (7 days):
- Issued alongside access token
- Stored in httpOnly cookie (for future)
- Used to get new access token without re-login
- Rotated on each refresh

Token Refresh Flow:
    If API returns 401 (unauthorized):
        ↓
    Check if accessToken expired
        ↓
    POST /api/v1/auth/refresh-token (with refreshToken)
        ↓
    Backend: Validate refreshToken, issue new accessToken
        ↓
    Retry original request with new token
        ↓
    No user interruption (transparent)
```

### Account Lockout

```
Failed Login Attempt:
    ↓
Backend: Increment user.loginAttempts
    ↓
If loginAttempts >= 5:
    ↓
    Set user.lockedUntil = NOW + 15 minutes
    ↓
    Return error: "Account locked. Try again in X minutes"
    ↓
Automatic Unlock:
    ↓
    Next login attempt: Check if NOW > lockedUntil
    ↓
    If yes: Reset loginAttempts = 0, lockedUntil = null, proceed
    ↓
    If no: Deny login with countdown
```

---

## 🔄 DATA FLOW: A COMPLETE TRANSACTION

### User Makes a Purchase

```
1. User on e-commerce site, buys item for ₹500

2. Frontend (e-commerce): Send card details to FST Pay payment processor

3. Backend (PaymentService.processCardTransaction):
   a) Receive card number, amount, merchant name
   b) Validate: Card exists? Card not frozen? Balance >= amount?
   c) Fetch card from DB
   d) Verify card daily limit not exceeded
   e) Create Transaction object (status = PENDING)
   f) Update wallet: balance -= amount
   g) Update card: spending_today += amount
   h) Save to DB (transactional)
   i) If all succeeds: status = COMPLETED
   k) If any fails: status = FAILED, rollback transaction

4. Backend (NotificationService):
   a) Create Notification: "Card purchase: ₹500 from Amazon"
   b) Save to DB
   c) Send in-app notification (WebSocket)
   d) Queue email: "Your transaction was successful"

5. Backend (AnalyticsService):
   a) Categorize transaction: "Shopping"
   b) Update analytics cache (daily/monthly aggregates)

6. Frontend (e-commerce): Show success to user

7. User opens FST Pay app (minutes later):
   a) Dashboard loads: Wallet balance updated (₹1,500)
   b) Transaction appears in "Recent Transactions"
   c) Notification badge shows new notification
   d) Monthly analytics chart updated (Shopping +₹500)
```

---

## 🚀 DEPLOYMENT ARCHITECTURE

### Local Development (Docker Compose)

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: fstpay
      POSTGRES_USER: fstpay
      POSTGRES_PASSWORD: (from .env)
    ports:
      - "5434:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6380:6379"
    volumes:
      - redis_data:/data

  backend:
    build: ./backend
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/fstpay
      SPRING_REDIS_HOST: redis
      (all env vars from .env file)
    ports:
      - "8080:8080"
    depends_on:
      - postgres
      - redis

  frontend:
    build: ./frontend
    ports:
      - "5173:80"
    depends_on:
      - backend
```

### Production Architecture (AWS ECS)

```
┌─────────────────────────────────────────────────┐
│                AWS Cloud                         │
│                                                  │
│  ┌───────────────────────────────────────────┐ │
│  │  CloudFront (CDN)                         │ │
│  │  - Frontend static files                  │ │
│  │  - Caching, DDoS protection               │ │
│  └────────────────┬────────────────────────┘ │
│                   │                           │
│  ┌────────────────▼────────────────────────┐ │
│  │  Application Load Balancer (ALB)         │ │
│  │  - Route /api → Backend                  │ │
│  │  - Route / → Frontend                    │ │
│  │  - SSL/TLS termination                   │ │
│  └────────────────┬────────────────────────┘ │
│                   │                           │
│  ┌────────────────▼────────────────────────┐ │
│  │  ECS Fargate (Containerized Services)    │ │
│  │                                          │ │
│  │  Task 1 - Backend:                       │ │
│  │    - Spring Boot container               │ │
│  │    - Min 2 instances (HA)                │ │
│  │    - Auto-scaling: CPU >70%              │ │
│  │                                          │ │
│  │  Task 2 - Frontend:                      │ │
│  │    - React/Nginx container               │ │
│  │    - Min 2 instances                     │ │
│  │                                          │ │
│  └────────────────┬────────────────────────┘ │
│                   │                           │
│  ┌────────────────┴──────────────────────┐  │
│  │                                        │  │
│  ↓                                        ↓  │
│ RDS PostgreSQL                        ElastiCache (Redis)
│ - Multi-AZ                            - 2-node cluster
│ - Automated backups                   - Pub/Sub for realtime
│ - Point-in-time recovery              │
│                                        │
│ AWS Secrets Manager                    │
│ - Database credentials                 │
│ - JWT secret                           │
│ - API keys (Razorpay, SendGrid, etc)  │
│                                        │
│ CloudWatch                             │
│ - Logs aggregation                     │
│ - Metrics & monitoring                 │
│ - Alarms & notifications               │
│                                        │
│ Route53                                │
│ - DNS routing                          │
│ - Health checks                        │
│                                        │
└─────────────────────────────────────────────┘
```

### CI/CD Pipeline

```
Developer: Commit to main branch
    ↓
GitHub Actions:
    ↓
1. Build Phase:
   - Checkout code
   - Backend: mvn clean package
   - Frontend: npm install && npm run build
   - Build Docker images
   - Push to ECR (AWS Container Registry)
    ↓
2. Test Phase:
   - Run unit tests (JUnit, Jest)
   - Run integration tests
   - Security scanning (OWASP, Snyk)
   - Code coverage check (min 80%)
    ↓
3. Deploy Phase (to Staging):
   - Pull images from ECR
   - Deploy to ECS (staging environment)
   - Run smoke tests
   - Run E2E tests
    ↓
4. Manual Approval:
   - Team reviews staging environment
   - Approves release to production
    ↓
5. Deploy Phase (to Production):
   - Blue-green deployment
   - Canary traffic shift (10% → 50% → 100%)
   - Monitor error rate & latency
   - Rollback if issues detected
```

---

## 📈 SCALABILITY CONSIDERATIONS

### Horizontal Scaling

```
Current (MVP):
- 1 backend instance
- 1 frontend instance
- 1 PostgreSQL instance
- 1 Redis instance

Phase 2 (10K MAU):
- 2-3 backend instances (load balanced)
- 2 frontend instances
- 1 PostgreSQL (RDS Multi-AZ)
- 2 Redis nodes (cluster mode)

Phase 3 (100K MAU):
- 5-10 backend instances (auto-scaling)
- Separate API server pool
- Read replicas for analytics queries
- Redis cluster (multiple nodes)
- Dedicated rate-limiter service

Phase 4 (1M+ MAU):
- Microservices: auth, wallet, card, transaction, analytics
- Event-driven architecture (Kafka)
- Database sharding by user_id
- Multi-region deployment
```

### Database Optimization

```
Current Indexing:
- email (UNIQUE, frequent searches)
- user_id (foreign key)
- created_at (date range queries)
- status (filtering)

Future (Phase 3+):
- Partitioning: transactions by date (monthly)
- Read replicas for analytics
- Materialized views: monthly_spending_by_category
- Denormalization: recent_balance cache
```

---

## 🛡️ Error Handling & Resilience

### API Response Standards

```json
// Success Response (200)
{
  "success": true,
  "data": { /* payload */ },
  "timestamp": "2026-06-17T10:30:00Z"
}

// Error Response (400/401/500)
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Password must be at least 8 characters",
    "details": {
      "field": "password",
      "constraint": "minLength"
    }
  },
  "timestamp": "2026-06-17T10:30:00Z"
}

// Error Codes:
- VALIDATION_ERROR (400)
- UNAUTHORIZED (401)
- FORBIDDEN (403)
- NOT_FOUND (404)
- CONFLICT (409)
- RATE_LIMIT_EXCEEDED (429)
- INTERNAL_SERVER_ERROR (500)
- SERVICE_UNAVAILABLE (503)
```

### Retry Logic

```
Idempotent Operations (can be safely retried):
- GET requests
- Top-up wallet (use idempotency key)
- Transaction queries

Non-Idempotent (require special handling):
- Money transfer (use transaction ID tracking)
- OTP generation (use session ID to prevent duplicates)

Retry Strategy:
- Max retries: 3
- Backoff: Exponential (100ms, 200ms, 400ms)
- Status codes to retry: 408, 429, 500, 502, 503
- Do not retry: 400, 401, 403, 404
```

---

## 📊 MONITORING & OBSERVABILITY

### Key Metrics to Track

```
Application Metrics:
- Request latency (p50, p95, p99)
- Error rate (4xx, 5xx)
- Throughput (requests/sec)
- Cache hit ratio

Business Metrics:
- Signups (daily, weekly, monthly)
- Active users (DAU, MAU)
- GTV (Gross Transaction Value)
- Transaction success rate

Infrastructure Metrics:
- CPU utilization
- Memory usage
- Disk I/O
- Network I/O
- Database connection pool

Health Checks:
- /actuator/health - Spring Boot
- Database connectivity
- Redis connectivity
- External service status (Razorpay, SendGrid)
```

### Logging Strategy

```
Log Levels:
- ERROR: Payment failures, authentication issues, unhandled exceptions
- WARN: Rate limit exceeded, slow queries, retry attempts
- INFO: User signup, login, major transactions
- DEBUG: Request parameters, internal state (dev only)

Log Aggregation:
- CloudWatch (AWS)
- Elasticsearch + Kibana (future)
- Structured logging (JSON format for easy parsing)

Example Log:
{
  "timestamp": "2026-06-17T10:30:45.123Z",
  "level": "INFO",
  "logger": "com.fstpay.auth.service.AuthService",
  "message": "User logged in successfully",
  "userId": "user-uuid-123",
  "email": "user@example.com",
  "ipAddress": "203.0.113.42",
  "requestId": "req-uuid-456"
}
```

---

## 🔄 API VERSIONING STRATEGY

```
Current: /api/v1/*

Endpoint Examples:
- POST /api/v1/auth/signup
- POST /api/v1/auth/login
- GET /api/v1/wallet
- POST /api/v1/wallet/topup
- GET /api/v1/transactions?limit=20&offset=0
- POST /api/v1/card/freeze

Future Versioning (Phase 2):
- /api/v2/* for breaking changes
- Parallel support: /v1/ + /v2/ both active
- Deprecation timeline: 6 months warning

Backwards Compatibility:
- New optional fields added without version bump
- Removed fields → v2
- Changed field type → v2
- Changed endpoint path → v2
```

---

## 📋 TECH STACK DECISIONS

### Why Spring Boot?

```
✅ Mature ecosystem (microservices-ready)
✅ Built-in security (Spring Security)
✅ Data access (Spring Data JPA)
✅ Transaction management
✅ Testing frameworks
❌ Heavy framework (mitigated by good defaults)
```

### Why React?

```
✅ Component reusability
✅ TypeScript support (type safety)
✅ Large ecosystem (routing, state, UI libraries)
✅ Developer experience (hot reload, dev tools)
✅ React Native potential (Phase 2, mobile)
```

### Why PostgreSQL?

```
✅ ACID compliance (financial transactions)
✅ JSONB for flexible fields (Phase 2)
✅ Excellent indexing for queries
✅ Full-text search support
✅ Open source, cost-effective
```

### Why Redis?

```
✅ Fast caching (sub-millisecond)
✅ Rate limiting (atomic operations)
✅ Session storage
✅ Pub/Sub for real-time notifications
✅ Pub/Sub for realtime features (chat, notifications)
```

---

## 🎯 PERFORMANCE TARGETS

```
MVP Targets (Launch):
- API response time (p95): < 500ms
- Page load time: < 2s
- Cache hit ratio: > 80%
- Database query time (p95): < 100ms

Phase 2 Targets (10K MAU):
- API response time (p95): < 300ms
- Page load time: < 1.5s
- Cache hit ratio: > 85%
- Database query time (p95): < 50ms

Phase 3 Targets (100K MAU):
- API response time (p95): < 200ms
- Page load time: < 1s
- Cache hit ratio: > 90%
- Database query time (p95): < 30ms
```

---

## ⚡ TECH DEBT TRACKING

### Current Decisions (MVP):

✅ Monolith: Good for MVP, refactor to microservices in Phase 3  
✅ Centralized auth: Sufficient for MVP, OAuth2 in Phase 2  
✅ In-memory rate limiting: Works for MVP, Redis-based in Phase 2  
✅ Email notifications only: Add SMS/push in Phase 2  

### Future Refactoring:

- Extract services: auth, wallet, card, transaction, analytics
- Event-driven architecture: Kafka/RabbitMQ
- API gateway: Kong or AWS API Gateway
- GraphQL option: Parallel to REST (Phase 3)
- Caching layer: More aggressive (Phase 2)

---

**Document Version:** 1.0  
**Last Updated:** June 17, 2026  
**Confidence:** 90% (architecture validated, ready for development)

