# 🧠 FST Pay — Engineering Brain

> **Single source of truth** for architecture, conventions, and decisions.
> Last updated: 2026-07-07

---

## 1. Project Identity

| Field | Value |
|-------|-------|
| **Name** | FST Pay (Fast · Secure · Trusted) |
| **Type** | Final Year Project + Startup MVP |
| **Category** | AI-Powered Virtual Wallet & Virtual Prepaid Card Platform |
| **Repo** | `github.com/Burhan-21/FST_Pay` |
| **Branch** | `master` |

### Vision

Empower teenagers, students, and young professionals to become financially independent through a modern fintech platform combining: Digital Wallet, Virtual Prepaid Cards, Expense Tracking, AI Financial Coach, Savings Goals, Rewards & Gamification, Parent-Teen Financial Management, Monthly Reports, Smart Budgeting, and Financial Health Score.

### Priorities (in order)

1. Security 2. Simplicity 3. Financial Education 4. Performance 5. Scalability 6. Production Readiness

### Target Users

- **Primary:** Teenagers, Students, Pocket money users
- **Secondary:** Young professionals, Working professionals

---

## 2. Tech Stack

### Frontend

| Technology | Purpose |
|-----------|---------|
| React 18 | UI Library |
| TypeScript | Type safety |
| Vite | Build tool |
| Tailwind CSS | Styling |
| React Router | Client-side routing |
| Axios | HTTP client (with interceptors) |

### Backend

| Technology | Purpose |
|-----------|---------|
| Java 21 | Language |
| Spring Boot | Framework |
| Spring Security | Auth & RBAC |
| Spring Data JPA | ORM |
| Maven | Build tool |
| Lombok | Boilerplate reduction |

### Infrastructure

| Service | Technology | Deployment |
|---------|-----------|------------|
| Database | PostgreSQL 16 | Neon (prod) / Docker (dev) |
| Cache | Redis 7 | Upstash (prod) / Docker (dev) |
| Frontend | Vite/React | Vercel |
| Backend | Spring Boot | Render |
| CI/CD | GitHub Actions | `.github/workflows/ci-cd.yml` |
| Containers | Docker + Compose | Local dev & CI |
| Email | Resend API (prod) / SMTP (dev) | — |
| AI | Gemini API | Fallback: local rule engine |
| Auth | JWT + Refresh Tokens + OTP | — |
| CAPTCHA | Google reCAPTCHA v2 | — |

---

## 3. Architecture

**Style: Modular Monolith** — Never introduce microservices unless explicitly requested.

### Package Structure

```
com.fstpay/
├── FstPayApplication.java      # Entry point + admin seeder
├── auth/                        # Authentication & JWT
│   ├── controller/  dto/  entity/  repository/  security/  service/
├── user/                        # User profiles
│   ├── controller/  dto/  entity/  repository/  service/
├── wallet/                      # Core wallet (source of truth)
│   ├── controller/  dto/  entity/  repository/  service/
├── transaction/                 # Financial transactions
│   ├── controller/  dto/  entity/  repository/  service/
├── card/                        # Virtual prepaid cards
│   ├── controller/  dto/  entity/  repository/  service/
├── goal/                        # Savings goals with ledger
│   ├── controller/  dto/  entity/  repository/  service/
├── aicoach/                     # AI financial coach
│   ├── controller/  dto/  entity/  provider/  repository/  service/  strategy/
├── reward/                      # Points, badges, streaks, catalog
│   ├── controller/  dto/  entity/  repository/  service/
├── analytics/                   # Spending analytics
│   ├── controller/  dto/  service/
├── report/                      # Monthly PDF reports
│   ├── controller/  scheduler/  service/
├── notification/                # Email notifications
│   └── service/
├── admin/                       # Admin dashboard
│   ├── controller/  dto/  service/
└── common/                      # Shared infrastructure
    ├── config/                  # SecurityConfig, OpenApiConfig, AppConfig
    ├── constants/               # AppConstants
    ├── dto/                     # ApiResponse<T>
    ├── entity/                  # Shared base entities
    ├── event/                   # Domain Event definitions
    ├── exception/               # Global exception handling
    ├── filter/                  # RateLimitFilter
    ├── repository/              # Shared repos
    ├── rule/                    # Transaction validation rules & Engine
    └── service/                 # AuditService
```

### Frontend Structure

```
frontend/src/
├── App.tsx                      # Route definitions
├── main.tsx                     # Entry point
├── index.css                    # Global styles
├── api/
│   ├── axios.ts                 # Axios instance + JWT interceptors + refresh
│   └── endpoints.ts             # All API endpoint functions
├── components/
│   ├── layout/                  # AppLayout, ProtectedRoute
│   └── ReCaptcha.tsx            # reCAPTCHA wrapper
├── context/
│   ├── AuthContext.tsx           # Auth state + login/register/OTP
│   └── ThemeContext.tsx          # Light/Dark theme
├── features/
│   ├── auth/                    # Login, Register
│   ├── dashboard/               # Main dashboard
│   ├── wallet/                  # Wallet management
│   ├── cards/                   # Virtual card management
│   ├── transactions/            # Transaction history
│   ├── analytics/               # Spending analytics
│   ├── ai-coach/                # AI financial coach chat
│   ├── rewards/                 # Rewards, badges, catalog
│   ├── settings/                # User settings
│   └── admin/                   # Admin panel
├── types/
│   └── index.ts                 # All TypeScript interfaces
├── utils/                       # Helpers, formatters
└── test/                        # Test files
```

---

## 4. Core Entities & Data Model

### User (`users` table)
UUID PK · `email` (unique) · `password_hash` (BCrypt 12) · `full_name` · `phone` · `date_of_birth` · `avatar_url` · `role` (USER/ADMIN) · `is_active` · `parental_control_enabled` · `parental_max_txn_amount` · `parental_restricted_categories` · `parental_pin` · parent fields · `login_attempts` · `locked_until` · timestamps

### Wallet (`wallets` table)
UUID PK · `user_id` (OneToOne, unique) · `balance` (BigDecimal 15,2) · `currency` (default INR) · `is_active` · `version` (optimistic locking) · timestamps

### Transaction (`transactions` table)
UUID PK · `wallet_id` (ManyToOne) · `card_id` (ManyToOne, nullable) · `type` (CREDIT/DEBIT) · `category` · `amount` (BigDecimal 15,2) · `balance_after` · `description` · `merchant` · `reference_id` (unique) · `status` · `created_at`

### VirtualCard (`virtual_cards` table)
UUID PK · `user_id` (ManyToOne) · `card_number` (encrypted) · `card_holder` · `expiry_month/year` · `cvv_hash` · `card_type` (PREPAID) · `status` (ACTIVE/FROZEN/EXPIRED) · `spending_limit` · `daily_limit` · `is_one_time` · `merchant_lock` (ElementCollection) · `card_design` · timestamps

### WalletGoal (`wallet_goals` table)
UUID PK · `user_id` (ManyToOne) · `name` · `description` · `target_amount` · `current_amount` · `allocated_amount` · `withdrawn_amount` · `target_date` · `priority` (LOW/MEDIUM/HIGH) · `icon` · `color` · `status` (ACTIVE/COMPLETED/CANCELLED) · `completed_at` · `cancelled_at` · timestamps

### Reward Entities
- **RewardPoints** — `user_id` · `points` · `xp` · `level` · `streak_days` · `last_streak_at`
- **RewardHistory** — `user_id` · `points_change` · `reason` · `created_at`
- **Badge / UserBadge** — Badge definitions + per-user unlock tracking
- **RewardItem** — Catalog items with `cost_points` · `stock` · `code`
- **RewardRedemption** — Redemption records

### Auth Entities
- **RefreshToken** — token storage with expiry
- **PasswordResetToken** — reset token with expiry

---

## 5. API Standards

**Base:** `/api/v1` · **Format:** JSON · **Docs:** Swagger at `/swagger-ui.html`

### Unified Response Envelope

```java
public class ApiResponse<T> {
    boolean success;
    String message;
    T data;
    Instant timestamp;
}
```

### Endpoint Map

| Module | Prefix | Auth |
|--------|--------|------|
| Auth | `/api/v1/auth/**` | Public |
| Users | `/api/v1/users/**` | Authenticated |
| Wallet | `/api/v1/wallet/**` | Authenticated |
| Cards | `/api/v1/cards/**` | Authenticated |
| Transactions | `/api/v1/transactions/**` | Authenticated |
| Analytics | `/api/v1/analytics/**` | Authenticated |
| AI Coach | `/api/v1/ai-coach/**` | Authenticated |
| Goals | `/api/v1/goals/**` | USER, ADMIN |
| Rewards | `/api/v1/rewards/**` | USER, ADMIN |
| Reports | `/api/v1/reports/**` | USER, ADMIN |
| Parental | `/api/v1/parental/**` | PARENT, ADMIN |
| Teen | `/api/v1/teen/**` | USER, ADMIN |
| Admin | `/api/v1/admin/**` | ADMIN only |
| Health | `/actuator/health` | Public |

### API Rules
- RESTful verbs · Standard HTTP status codes · Pagination (`page`, `size`, `totalElements`, `totalPages`) · Filtering & sorting · OpenAPI docs · Versioned endpoints

---

## 6. Security

### Authentication Flow
1. Register → OTP sent via email → Verify OTP → Account activated
2. Login → reCAPTCHA validated → Credentials checked → OTP sent → Verify → JWT + Refresh Token issued
3. JWT in `Authorization: Bearer <token>` header · Access token short-lived · Refresh token rotation

### Security Configuration
- **CSRF:** Disabled (JWT Bearer auth, stateless)
- **Sessions:** Stateless (`SessionCreationPolicy.STATELESS`)
- **CORS:** Configurable via `cors.allowed-origins`
- **Password:** BCrypt (strength 12)
- **Headers:** CSP, X-Frame-Options DENY, HSTS, X-Content-Type-Options, Referrer-Policy

### Roles
`ROLE_USER` · `ROLE_PARENT` · `ROLE_ADMIN`

### Protections
- Account lockout: 5 failed attempts → 15 min lock
- Rate limiting: Redis-backed via `RateLimitFilter` (LRU cache, no memory leak)
- OTP rate limiting: 60s cooldown
- Age validation: minimum 12 years
- Input validation on all endpoints
- Audit logging via `AuditService`
- No secrets in code — all via env vars

---

## 7. AI Coach Architecture

### Provider Pattern
```
AiProvider (interface)
├── GeminiProvider     — Primary (Gemini API)
├── OpenAiProvider     — Future secondary
└── FallbackProvider   — Local rule-based engine
```

**Critical Rule:** App MUST function if all external AI services are down.

### Strategy Pattern (Rule-Based Tips)
```
TipStrategy (interface)
├── FoodOverspend
├── ShoppingOverspend
├── EntertainmentOverspend
├── SavingsLow
└── GoalBehindSchedule
```

### AI Modules
Budget Planner · Spending Analyzer · Financial Coach Chat · Financial Health Score · Savings Advisor · Goal Recommendations · Spending Forecast · Smart Tips

---

## 8. Wallet Rules

> **The wallet is the source of truth for user balance.**

1. Savings goals use a **dedicated ledger** (`allocated_amount`, `withdrawn_amount`)
2. Allocating money to a goal → deducts from wallet → records `GOAL_ALLOCATION` transaction
3. Withdrawing from a goal → restores wallet balance → records `GOAL_WITHDRAWAL` transaction
4. **Financial records must NEVER be silently modified or deleted**
5. All BigDecimal ops use `scale(2)` with `RoundingMode.HALF_UP`
6. Wallet uses `@Version` for optimistic locking (concurrent update protection)

---

## 9. Rewards System

### Earning Points
Savings · Budget completion · Goal completion · Daily streaks · Referrals

### System Components
- **Points + XP + Levels** — progression system
- **Badges** — achievement-based unlocks
- **Streak tracking** — daily engagement
- **Catalog** — redeemable items with point costs
- **Redemption history** — audit trail

**Rule:** Reward values MUST be configurable, never hardcoded.

---

## 10. Parent Features

Email invitation linking · Monthly reports · Pocket money transfers · Spending limits (`parental_max_txn_amount`) · Merchant restrictions (`parental_restricted_categories`) · Approval for high-value transactions · Spending analytics

---

## 11. Engineering Standards

### Code Organization (Every Feature)
```
module/
├── controller/    # HTTP orchestration only — NO business logic
├── dto/           # Request/Response DTOs — NEVER return entities
├── entity/        # JPA entities
├── repository/    # Data access only
└── service/       # ALL business logic lives here
```

### Mandatory Patterns
- Clean Architecture · SOLID · Repository Pattern · Service Layer · DTO Pattern
- Dependency Injection · Global Exception Handling · Input Validation · Logging
- REST Best Practices · OpenAPI Documentation

### Never Do
- ❌ Business logic in Controllers
- ❌ Return JPA entities from APIs
- ❌ Hardcode secrets
- ❌ Duplicate business logic
- ❌ Skip validation
- ❌ Skip security checks
- ❌ Delete financial transactions
- ❌ Use `parseFloat()` without validation (use `parseMoneyInput()`)

### Exception Handling
`GlobalExceptionHandler` (@RestControllerAdvice) handles:
- `ResourceNotFoundException` → 404
- `BadRequestException` → 400
- `DuplicateResourceException` → 409
- `BadCredentialsException` → 401
- `AccessDeniedException` → 403
- `MethodArgumentNotValidException` → 400 (field-level errors)
- `DataIntegrityViolationException` → 409
- `ObjectOptimisticLockingFailureException` → 409 (retry prompt)
- `Exception` (catch-all) → 500

### Naming Conventions
- Java: `camelCase` variables, `PascalCase` classes, `UPPER_SNAKE_CASE` constants
- TypeScript: `camelCase` variables, `PascalCase` types/components
- DB: `snake_case` columns and tables
- API: `/api/v1/kebab-case`

---

## 12. Database Standards

- PostgreSQL 16 · UUID primary keys (`GenerationType.UUID`)
- `created_at` / `updated_at` timestamps on all entities
- Soft delete where appropriate · **Never delete financial transactions**
- Every financial action has an audit trail
- Optimistic locking on Wallet (`@Version`)
- BigDecimal(15,2) for all monetary fields
- Flyway migrations (auto-run on startup)

---

## 13. Frontend Standards

### Token Management
- Stored in `localStorage`: `fst_access_token`, `fst_refresh_token`
- Auto-attached via Axios request interceptor
- 401 → automatic refresh with queue (prevents race conditions)
- Failed refresh → clear tokens → redirect to `/login`

### Routing
- Public: `/login`, `/register`
- Protected: `/dashboard`, `/wallet`, `/cards`, `/transactions`, `/analytics`, `/ai-coach`, `/rewards`, `/settings`
- Admin: `/admin` (requires `ADMIN` role)
- Default: `/ → /dashboard`

### Helper Utilities
`parseMoneyInput()` · `validateCurrencyAmount()` · `safeDivide()` · `calculatePercentage()` · `formatCurrency()` · `formatDate()` · `debounce()` · `retryPromise()` · `maskCardNumber()`

---

## 14. UI Design System

| Token | Value |
|-------|-------|
| Primary | `#2070FF` |
| Secondary | `#78D3FF` |
| Dark BG | `#0E1726` |
| Light BG | `#F7FAFF` |
| Success | `#22C55E` |
| Warning | `#F59E0B` |
| Error | `#EF4444` |
| AI Accent | `#7C3AED` |
| Reward Accent | `#FBBF24` |

### Typography
- **Logo:** Sora
- **UI:** Inter
- **Numbers/Money:** JetBrains Mono

### Style
Glassmorphism · Soft Claymorphism · Premium Fintech Aesthetic · Light + Dark modes

### Animations
Smooth transitions · Micro-interactions · 3D card effects · Loading skeletons · Animated charts · Floating UI elements

---

## 15. Testing

### Current Coverage
- **Backend:** 47 tests (42 unit + 5 integration)
- **Frontend:** 33 tests in `helpers.test.ts`
- **Total:** 80 tests, all passing

### Standards
- Every module: Unit Tests + Integration Tests + Security Tests (where applicable)
- CI/CD must fail on failing tests
- Backend integration tests use H2 (local) / PostgreSQL (CI)
- Frontend tests via Vitest

---

## 16. Deployment

### Environments

| Component | Dev | Production |
|-----------|-----|------------|
| Frontend | `localhost:5173` | `fst-pay.vercel.app` |
| Backend | `localhost:8080` | `fstpay-backend.onrender.com` |
| Database | Docker `localhost:5434` | Neon PostgreSQL |
| Redis | Docker `localhost:6380` | Upstash Redis |

### Key Environment Variables
See `.env.example` for complete list. Required: `POSTGRES_PASSWORD`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`

### CI/CD Pipeline (`.github/workflows/ci-cd.yml`)
1. **Backend:** Compile → Unit Tests → Integration Tests → Build JAR → Upload artifact
2. **Frontend:** Install → Lint → Test → Build → Upload artifact
3. **Docker:** Build images → Verify compose config

### Deployment Files
- `docker-compose.yml` — Full stack (postgres, redis, backend, frontend, nginx)
- `render.yaml` — Render blueprint
- `backend/Dockerfile` — Backend container
- `frontend/Dockerfile` — Frontend container
- `nginx.conf` — Reverse proxy
- `deploy.sh` / `deploy.ps1` — Deployment scripts

### Rules
- Docker required · Environment variables only · No secrets in Git
- Health check: `/actuator/health`

---

## 17. Current Status

### ✅ Completed Modules
| Module | Backend | Frontend | Tests |
|--------|---------|----------|-------|
| Auth (JWT + OTP + reCAPTCHA) | ✅ | ✅ | ✅ |
| User Management | ✅ | ✅ | ✅ |
| Wallet | ✅ | ✅ | ✅ |
| Virtual Cards | ✅ | ✅ | ✅ |
| Transactions | ✅ | ✅ | ✅ |
| Analytics | ✅ | ✅ | — |
| AI Coach (Gemini + Fallback) | ✅ | ✅ | — |
| Savings Goals | ✅ | ✅ | — |
| Rewards & Gamification | ✅ | ✅ | — |
| Monthly Reports | ✅ | ✅ | — |
| Admin Dashboard | ✅ | ✅ | — |
| Notifications (Email) | ✅ | — | — |
| Parent-Teen Control Module | ✅ | ✅ | ✅ |
| Security Hardening | ✅ | ✅ | ✅ |
| CI/CD Pipeline | ✅ | ✅ | ✅ |
| Docker & Deployment | ✅ | ✅ | ✅ |

### 🔲 Planned Modules
- OpenAI provider integration
- Push notifications
- Advanced financial reports (PDF export)

### Implementation Review
All 37 items from code review checklist completed (see `IMPLEMENTATION_CHECKLIST.md`).

---

## 18. Future Roadmap (Post-MVP)

### Phase 2
- Full parent-teen linking with email invitation flow
- Real payment gateway integration (Razorpay/Stripe)
- Advanced analytics with ML-based predictions
- Push notifications (Firebase)
- Multi-currency support

### Phase 3
- Physical card integration
- P2P transfers between FST Pay users
- Bill splitting
- Subscription tracking
- Investment education module
- Social features (leaderboards)

### Phase 4
- Open banking API integration
- KYC verification
- Credit score building features
- Merchant partnerships
- White-label solution

---

## 19. Architecture Decision Log

| # | Decision | Rationale | Date |
|---|----------|-----------|------|
| 1 | Modular Monolith over Microservices | MVP scope, team size, deployment simplicity. Modules are cleanly separated for future extraction if needed. | 2026-06 |
| 2 | JWT over Session-based Auth | Stateless, mobile-friendly, works with Vercel + Render split deployment | 2026-06 |
| 3 | CSRF Disabled | JWT Bearer auth via Authorization header (not cookies). Per OWASP/Spring Security best practices. | 2026-06 |
| 4 | PostgreSQL over MongoDB | Financial data requires ACID transactions, relational integrity, and complex queries | 2026-06 |
| 5 | Gemini API as Primary AI | Cost-effective, strong context handling, generous free tier for MVP | 2026-06 |
| 6 | Rule-Based AI Fallback | Ensures app works offline/when AI quota exhausted. Strategy pattern for extensibility. | 2026-06 |
| 7 | Redis for Rate Limiting | Sub-millisecond lookups, TTL support, shared state across instances | 2026-06 |
| 8 | LRU Cache for Rate Limiter | Prevents memory leak from unbounded IP tracking. LinkedHashMap with size cap. | 2026-06 |
| 9 | Optimistic Locking on Wallet | Prevents double-spend on concurrent requests without pessimistic lock overhead | 2026-06 |
| 10 | BCrypt Strength 12 | Balances security vs response time (~250ms per hash) | 2026-06 |
| 11 | UUID Primary Keys | No sequential ID enumeration, safe for public APIs, distributed-ready | 2026-06 |
| 12 | Vercel + Render Split | Free tiers, auto-deploy from Git, adequate for MVP traffic | 2026-06 |
| 13 | Tailwind CSS | Rapid UI development, consistent design tokens, small bundle with purge | 2026-06 |
| 14 | Axios over Fetch | Interceptors for JWT, request/response transforms, better error handling | 2026-06 |
| 15 | Dedicated Goal Ledger | Separates wallet balance from goal allocations, clean audit trail | 2026-07 |
| 16 | Event-Driven Parental Decoupling | Decoupled notification & ledger transfers from parent module via domain events; removed Aadhaar/PAN KYC requirements for linking. | 2026-07 |

---

## 20. Documentation Index

| Document | Path |
|----------|------|
| Product Requirements | `docs/01-PRD.md` |
| Architecture | `docs/02-Architecture.md` |
| Database Schema | `docs/03-Database.md` |
| API Specification | `docs/04-API-Spec.md` |
| Security Compliance | `docs/05-Security.md` |
| Frontend Specification | `docs/06-Frontend-Spec.md` |
| Deployment Guide | `docs/07-Deployment.md` |
| Brand Guidelines | `docs/08-Brand-Guidelines.md` |
| Decision Log | `docs/09-Decisions.md` |
| User Stories | `docs/USER_STORIES_v1.0.md` |
| User Flows | `docs/USER_FLOWS_v1.0.md` |
| Feature Tickets | `docs/FEATURE_TICKETS_v1.0.md` |
| Competitive Analysis | `docs/COMPETITIVE_ANALYSIS_v1.0.md` |
| Success Metrics | `docs/SUCCESS_METRICS_v1.0.md` |
| Troubleshooting | `docs/TROUBLESHOOTING.md` |
| Manual Testing | `docs/MANUAL_TESTING.md` |
| Pre-Deploy Checklist | `docs/PRE_DEPLOYMENT_CHECKLIST.md` |
| Changelog | `docs/CHANGELOG.md` |
| Implementation Review | `IMPLEMENTATION_CHECKLIST.md` |
| Security Guide | `SECURITY.md` |

---

## 21. Quick Reference for AI Assistants

### Before writing code, always:
1. Check which module the change belongs to
2. Follow the `controller → service → repository` pattern
3. Use DTOs for all API boundaries
4. Add validation annotations
5. Handle exceptions via existing patterns in `GlobalExceptionHandler`
6. Use `ApiResponse<T>` wrapper for all responses
7. Use `BigDecimal` (never `double`) for money
8. Add `@Slf4j` logging
9. Write tests

### Key files to reference:
- **API Response:** `common/dto/ApiResponse.java`
- **Exception Handling:** `common/exception/GlobalExceptionHandler.java`
- **Security Config:** `common/config/SecurityConfig.java`
- **Constants:** `common/constants/AppConstants.java`
- **Frontend Types:** `frontend/src/types/index.ts`
- **API Endpoints:** `frontend/src/api/endpoints.ts`
- **Axios Config:** `frontend/src/api/axios.ts`
- **Auth Context:** `frontend/src/context/AuthContext.tsx`
- **Environment Template:** `.env.example`

### Common commands:
```bash
# Backend
cd backend && mvn clean compile        # Compile
cd backend && mvn test                  # Unit tests
cd backend && mvn spring-boot:run       # Run dev server

# Frontend
cd frontend && npm install              # Install deps
cd frontend && npm run dev              # Dev server (port 5173)
cd frontend && npm run build            # Production build
cd frontend && npm test -- --run        # Run tests

# Docker
docker compose up -d                    # Start all services
docker compose down                     # Stop all services
docker compose logs -f fstpay-backend   # Backend logs
```

---

> **Keep this document updated** whenever architectural decisions change, modules are added, or conventions evolve. This is the living memory of FST Pay.
