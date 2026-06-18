# FST Pay — AI-Powered Digital Wallet

Smart wallet for teens & young adults (ages 12+) with virtual cards, AI coaching, and parental controls.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript 6 + Vite + Tailwind CSS |
| Backend | Java 17 + Spring Boot 3.3.6 + Maven |
| Database | PostgreSQL 16 (with Flyway migrations) |
| Cache | Redis 7 (OTP storage, sessions) |
| Auth | JWT (access + refresh tokens), OTP, reCAPTCHA |
| Rate Limiting | Bucket4j (LRU cache) |

## Quick Start

### Prerequisites
- Java 17+, Node.js 20+, Docker Desktop

### 1. Environment Setup

```bash
cp .env.example .env
# Edit .env with your values (JWT_SECRET, DB password, etc.)
```

### 2. Start Infrastructure (PostgreSQL + Redis)

```bash
docker compose up -d fstpay-postgres fstpay-redis
```

### 3. Backend

```bash
cd backend
mvn clean compile -q    # verify compilation
mvn test               # run 33 unit tests
mvn spring-boot:run    # start on http://localhost:8080
```

### 4. Frontend

```bash
cd frontend
npm install
npm run test           # run 33 unit tests
npm run dev            # start on http://localhost:5173
```

### 5. Full Docker Deployment

```bash
docker compose up --build
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `POSTGRES_PASSWORD` | ✅ | — | Database password |
| `JWT_SECRET` | ✅ | — | Base64-encoded 256+ bit secret |
| `CORS_ALLOWED_ORIGINS` | ✅ | `http://localhost:5173` | Comma-separated origins |
| `MAIL_USERNAME` | — | — | SMTP username |
| `MAIL_PASSWORD` | — | — | SMTP password |
| `ADMIN_EMAIL` | — | — | Auto-seed admin on startup |
| `ADMIN_PASSWORD` | — | — | Admin password (min 8 chars) |
| `RECAPTCHA_SECRET_KEY` | — | — | Google reCAPTCHA v2 |
| `GEMINI_API_KEY` | — | — | AI Coach (Gemini) |
| `REDIS_PASSWORD` | — | — | Redis auth password |
| `LOG_LEVEL` | — | `INFO` | `INFO`, `WARN`, `DEBUG` |

## API Overview

All endpoints prefixed with `/api/v1`.

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/auth/register` | POST | No | Register with email + password |
| `/auth/login` | POST | No | Login with credentials |
| `/auth/verify-otp` | POST | No | Verify 6-digit OTP |
| `/auth/refresh` | POST | No | Refresh JWT token pair |
| `/auth/logout` | POST | Bearer | Invalidate refresh tokens |
| `/auth/stats` | GET | No | Public platform stats |
| `/users/me` | GET/PUT | Bearer | Profile read/update |
| `/users/me/password` | PUT | Bearer | Change password |
| `/wallet` | GET | Bearer | Get wallet balance |
| `/wallet/topup` | POST | Bearer | Add funds (UPI, etc.) |
| `/cards` | GET/POST | Bearer | List / create virtual cards |
| `/cards/{id}/freeze` | POST | Bearer | Freeze a card |
| `/cards/{id}/limit` | PUT | Bearer | Update spending limits |
| `/transactions` | GET | Bearer | Transaction history |
| `/transactions/simulate` | POST | Bearer | Simulate a purchase |
| `/analytics` | GET | Bearer | Spending analytics |
| `/ai-coach/chat` | POST | Bearer | AI financial advice |
| `/rewards` | GET | Bearer | Reward points & streaks |
| `/admin/*` | * | ADMIN | Admin dashboard & stats |

## Testing

```bash
# Backend (38 tests: 33 unit + 5 integration)
cd backend && mvn test

# Integration tests (requires Docker)
cd backend && mvn test -Dtest="com.fstpay.integration.*" -DfailIfNoTests=false

# Frontend (33 tests)
cd frontend && npm run test

# Full build verification
cd frontend && npm run build    # TypeScript + production build
```

## Security Features

- **No hardcoded secrets** — all credentials via environment variables
- **Account lockout** — 5 failed attempts → 15-minute lock
- **Rate limiting** — per-IP, per-endpoint with LRU eviction
- **Password policy** — 8+ chars, uppercase, lowercase, digit, special
- **Age verification** — minimum 12 years old
- **OTP throttling** — 60-second cooldown per email
- **reCAPTCHA** — bot protection on register/login
- **Security headers** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- **JWT rotation** — refresh token invalidated on each use
- **Pessimistic locking** — prevents race conditions on login attempts

## Project Structure

```
├── backend/                    # Spring Boot 3.3.6 (Java 17)
│   ├── src/
│   │   ├── main/java/com/fstpay/
│   │   │   ├── auth/           # Auth, JWT, OTP, reCAPTCHA
│   │   │   ├── wallet/         # Wallet & top-ups
│   │   │   ├── card/           # Virtual cards
│   │   │   ├── transaction/    # Spending & history
│   │   │   ├── analytics/      # Spending analytics
│   │   │   ├── aicoach/        # AI financial coach
│   │   │   ├── reward/         # Points & streaks
│   │   │   ├── user/           # Profile & parental controls
│   │   │   ├── admin/          # Admin dashboard
│   │   │   ├── notification/   # Email service
│   │   │   └── common/         # Config, filters, exceptions
│   │   ├── main/resources/
│   │   │   ├── application.yml
│   │   │   └── db/migration/   # Flyway migrations (V1-V6)
│   │   └── test/               # 4 test classes (33 tests)
│   ├── Dockerfile
│   └── pom.xml
├── frontend/                   # React 19 + TypeScript 6
│   ├── src/
│   │   ├── api/                # Axios client + endpoint definitions
│   │   ├── context/            # Auth, Theme providers
│   │   ├── features/           # Pages (auth, dashboard, wallet, cards...)
│   │   ├── types/              # TypeScript interfaces
│   │   └── utils/              # Helpers + tests
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── docker-compose.override.yml # Local dev overrides
├── nginx.conf
└── .env.example
```
