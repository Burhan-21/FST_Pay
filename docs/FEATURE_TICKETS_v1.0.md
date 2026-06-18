# FST Pay — Feature Ticket List v1.0

**Document ID:** FST-TICKETS-2026-Q2
**Version:** 1.0
**Date:** June 17, 2026
**Owner:** Product Manager / Engineering Team
**Status:** READY FOR SPRINT PLANNING

---

## SPRINT OVERVIEW

| Sprint | Duration | Focus | Tickets | Points |
|--------|----------|-------|---------|--------|
| Sprint 0 | Days 1-3 | Foundation | T-001 to T-010 | 34 |
| Sprint 1 | Days 4-10 | Core Wallet | T-011 to T-025 | 42 |
| Sprint 2 | Days 11-17 | Cards + Transactions | T-026 to T-040 | 38 |
| Sprint 3 | Days 18-24 | Analytics + AI | T-041 to T-055 | 40 |
| Sprint 4 | Days 25-28 | Polish + Launch | T-056 to T-065 | 26 |

**Total MVP Effort:** 65 tickets / 180 story points
**Estimated Timeline:** 4 weeks (28 days)

---

## PRIORITY LEGEND

| Priority | Label | Description |
|----------|-------|-------------|
| P0 | 🔴 Critical | Must-have for MVP launch |
| P1 | 🟠 High | Core feature, blocks other work |
| P2 | 🟡 Medium | Important but can slip sprint |
| P3 | 🟢 Low | Nice-to-have post-MVP |

---

## SPRINT 0 — FOUNDATION (Days 1-3)

### T-001: Project Scaffolding
| Field | Detail |
|-------|--------|
| **Description** | Initialize Spring Boot project with modules, React+Vite+Tailwind, Docker compose, PostgreSQL, Redis |
| **Acceptance Criteria** | Both apps start locally, DB migrations run, health endpoint returns 200 |
| **Dependencies** | None |
| **Priority** | P0 🔴 |
| **Story Points** | 5 |
| **Definition of Done** | Apps run via `docker-compose up`, health check passes, developers can build |

### T-002: Database Schema & Migrations
| Field | Detail |
|-------|--------|
| **Description** | Create Flyway V1-V5 migrations: users, wallets, virtual_cards, transactions, rewards, refresh_tokens, ai_sessions, indexes |
| **Acceptance Criteria** | All 5 migrations run cleanly, rollback works, indexes on email/status/timestamps |
| **Dependencies** | T-001 |
| **Priority** | P0 🔴 |
| **Story Points** | 5 |
| **Definition of Done** | `flyway migrate` clean + `flyway info` shows success |

### T-003: User Entity & Repository
| Field | Detail |
|-------|--------|
| **Description** | User entity with id, email, password_hash, full_name, phone, DOB, role, is_active, parental controls, login_attempts, locked_until |
| **Acceptance Criteria** | Entity maps to DB, repository supports findByEmail, unique constraint on email |
| **Dependencies** | T-002 |
| **Priority** | P0 🔴 |
| **Story Points** | 3 |
| **Definition of Done** | Repository integration test passes |

### T-004: JWT Provider & Security Config
| Field | Detail |
|-------|--------|
| **Description** | JJWT token provider with access (15min) + refresh (7day) tokens, Spring Security config with permitAll for auth endpoints |
| **Acceptance Criteria** | Token generation, validation, refresh all work; unauthenticated requests to protected endpoints return 401 |
| **Dependencies** | T-003 |
| **Priority** | P0 🔴 |
| **Story Points** | 5 |
| **Definition of Done** | Unit tests pass, CURL test confirms auth flow |

### T-005: Global Exception Handler & API Response
| Field | Detail |
|-------|--------|
| **Description** | `@RestControllerAdvice` with standardized `ApiResponse<T>` format {success, message, data, timestamp}. Handle validation, auth, not found, rate limit errors |
| **Acceptance Criteria** | All errors return consistent JSON shape, no stack traces leak to client |
| **Dependencies** | T-001 |
| **Priority** | P0 🔴 |
| **Story Points** | 3 |
| **Definition of Done** | Integration test validates error shapes |

### T-006: Rate Limiter Filter
| Field | Detail |
|-------|--------|
| **Description** | Bucket4j rate limiter with LRU cache (10K limit), config tiers: auth=10/min, AI=20/min, general=150/min. X-Forwarded-For protection |
| **Acceptance Criteria** | Excess requests return 429, cache auto-evicts old entries, IP spoofing prevented |
| **Dependencies** | T-001 |
| **Priority** | P0 🔴 |
| **Story Points** | 5 |
| **Definition of Done** | Load test confirms limits enforced, no memory leak |

### T-007: Frontend — Tailwind Design System
| Field | Detail |
|-------|--------|
| **Description** | tailwind.config.js with custom colors (primary/accent/surface/danger/warning), fonts (Inter/Outfit/Deltha/Mono), animations, shadows, index.css with glassmorphism/claymorphism utilities |
| **Acceptance Criteria** | Dark + light mode toggleable, glass-card and clay-card styles render correctly |
| **Dependencies** | T-001 |
| **Priority** | P0 🔴 |
| **Story Points** | 3 |
| **Definition of Done** | Design tokens documented, both themes verified |

### T-008: Frontend — Auth Context & Axios Setup
| Field | Detail |
|-------|--------|
| **Description** | AuthContext with user state, login/register/verifyOtp/logout methods, localStorage token persistence. Axios instance with JWT interceptor + refresh queue |
| **Acceptance Criteria** | Login persists across refresh, 401 triggers token refresh, concurrent requests handled correctly |
| **Dependencies** | T-004, T-007 |
| **Priority** | P0 🔴 |
| **Story Points** | 3 |
| **Definition of Done** | Auth flow E2E verified |

### T-009: Frontend — App Layout + Routing
| Field | Detail |
|-------|--------|
| **Description** | AppLayout with Sidebar (responsive), Navbar, ProtectedRoute, CommandPalette. React Router setup with all routes |
| **Acceptance Criteria** | Mobile sidebar overlay works, desktop sidebar always visible, Cmd+K opens search, protected routes redirect to login |
| **Dependencies** | T-008 |
| **Priority** | P0 🔴 |
| **Story Points** | 3 |
| **Definition of Done** | All routes accessible, auth guard works |

### T-010: Constants & App Config
| Field | Detail |
|-------|--------|
| **Description** | AppConstants.java centralizing magic numbers/strings: rate limits, lockout threshold, token expiry, money scale, pagination defaults. Frontend endpoints.ts with all API paths |
| **Acceptance Criteria** | No hardcoded constants in business logic, single source of truth |
| **Dependencies** | T-001 |
| **Priority** | P0 🔴 |
| **Story Points** | 2 |
| **Definition of Done** | All modules reference constants |

---

## SPRINT 1 — CORE WALLET (Days 4-10)

### T-011: Backend — Auth Registration
| Field | Detail |
|-------|--------|
| **Description** | POST /auth/register — email+password+fullName+DOB validation, age check (min 12), password hash, OTP email, account creation |
| **Acceptance Criteria** | Valid registration returns requiresOtp=true, duplicate email returns 409, age < 12 rejected, password < 8 rejected |
| **Dependencies** | T-004, T-005 |
| **Priority** | P0 🔴 |
| **Story Points** | 5 |
| **Definition of Done** | Integration test covers all scenarios |

### T-012: Backend — Auth Login & OTP Verify
| Field | Detail |
|-------|--------|
| **Description** | POST /auth/login — email+password validation, returns requiresOtp=true on success. POST /auth/verify-otp — validates OTP, returns JWT pair |
| **Acceptance Criteria** | Correct credentials → OTP sent → OTP verified → tokens returned. Incorrect OTP → error. 5 failed logins → 15min lockout |
| **Dependencies** | T-011 |
| **Priority** | P0 🔴 |
| **Story Points** | 5 |
| **Definition of Done** | Auth flow E2E tested, lockout verified |

### T-013: Backend — Token Refresh & Logout
| Field | Detail |
|-------|--------|
| **Description** | POST /auth/refresh — validates refresh token, rotates pair. POST /auth/logout — invalidates refresh token |
| **Acceptance Criteria** | Refresh returns new tokens, old refresh token invalidated, logout prevents reuse |
| **Dependencies** | T-012 |
| **Priority** | P0 🔴 |
| **Story Points** | 3 |
| **Definition of Done** | Refresh rotation verified, race condition tested |

### T-014: Backend — OTP Service
| Field | Detail |
|-------|--------|
| **Description** | 6-digit OTP generation, Redis storage with 5min TTL, email delivery via Spring Mail, rate limit (60s cooldown per email) |
| **Acceptance Criteria** | OTP delivered via email, expires after 5min, cannot spam (60s cooldown), wrong OTP rejected |
| **Dependencies** | T-011 |
| **Priority** | P0 🔴 |
| **Story Points** | 3 |
| **Definition of Done** | OTP flow integration test |

### T-015: Frontend — Login Page
| Field | Detail |
|-------|--------|
| **Description** | Email + password form, reCAPTCHA integration, error display, loading state, redirect to OTP or dashboard on success |
| **Acceptance Criteria** | Valid credentials → OTP page, invalid → inline error, reCAPTCHA token sent, responsive design |
| **Dependencies** | T-008, T-012 |
| **Priority** | P0 🔴 |
| **Story Points** | 3 |
| **Definition of Done** | Login flow works end-to-end |

### T-016: Frontend — Register Page
| Field | Detail |
|-------|--------|
| **Description** | Full name + email + password + DOB form, age validation (min 12), reCAPTCHA, OTP verification step |
| **Acceptance Criteria** | Valid registration → OTP page, invalid fields → inline errors, DOB picker works, responsive |
| **Dependencies** | T-008, T-011 |
| **Priority** | P0 🔴 |
| **Story Points** | 3 |
| **Definition of Done** | Registration flow complete |

### T-017: Backend — Wallet Create & Balance
| Field | Detail |
|-------|--------|
| **Description** | Wallet auto-created on user registration (0 balance). GET /wallet returns balance. POST /wallet/topup with amount + method validation |
| **Acceptance Criteria** | Wallet created on signup, balance returned with GET, top-up updates balance, BigDecimal precision correct |
| **Dependencies** | T-011 |
| **Priority** | P0 🔴 |
| **Story Points** | 3 |
| **Definition of Done** | Wallet operations verified |

### T-018: Backend — Wallet Top-up
| Field | Detail |
|-------|--------|
| **Description** | POST /wallet/topup — amount validation (min ₹1, max ₹1L), overflow protection, transaction record created, balance updated atomically |
| **Acceptance Criteria** | Top-up updates balance, minimum/maximum enforced, concurrent updates safe, overflow rejected |
| **Dependencies** | T-017 |
| **Priority** | P0 🔴 |
| **Story Points** | 3 |
| **Definition of Done** | Load test confirms atomicity |

### T-019: Backend — Wallet History
| Field | Detail |
|-------|--------|
| **Description** | GET /wallet/history — paginated transaction list for user's wallet, sort by date desc, filter by type |
| **Acceptance Criteria** | Returns paginated results, default page size 20, sorted newest first |
| **Dependencies** | T-017, T-018 |
| **Priority** | P0 🔴 |
| **Story Points** | 2 |
| **Definition of Done** | Pagination verified |

### T-020: Frontend — Wallet Page
| Field | Detail |
|-------|--------|
| **Description** | Balance display card, top-up form with quick amounts (₹500/1000/2000/5000), payment method selector (UPI/Card/Bank), transaction history list |
| **Acceptance Criteria** | Balance loads and updates, top-up form works, history paginated, responsive, loading/error states |
| **Dependencies** | T-017, T-018, T-019 |
| **Priority** | P0 🔴 |
| **Story Points** | 5 |
| **Definition of Done** | Wallet page fully functional |

### T-021: Backend — User Profile CRUD
| Field | Detail |
|-------|--------|
| **Description** | GET /users/me, PUT /users/me (name, phone, DOB), PUT /users/me/password (current+new). Only update own profile |
| **Acceptance Criteria** | Profile read/update works, password change requires current password, authorization enforced |
| **Dependencies** | T-004 |
| **Priority** | P0 🔴 |
| **Story Points** | 3 |
| **Definition of Done** | Profile CRUD tested |

### T-022: Frontend — Settings Page
| Field | Detail |
|-------|--------|
| **Description** | Profile edit form, password change form, theme toggle, account info display |
| **Acceptance Criteria** | Profile updates save, password changes work, theme persists, form validation active |
| **Dependencies** | T-021 |
| **Priority** | P1 🟠 |
| **Story Points** | 3 |
| **Definition of Done** | Settings page functional |

### T-023: Frontend — Theme Context & Toggle
| Field | Detail |
|-------|--------|
| **Description** | Dark/light mode context, persisted to localStorage, toggle in Navbar + Settings, smooth CSS transitions |
| **Acceptance Criteria** | Theme persists across refresh, toggle works from both locations, all components respect theme |
| **Dependencies** | T-007 |
| **Priority** | P1 🟠 |
| **Story Points** | 2 |
| **Definition of Done** | Theme verified in both modes |

### T-024: Docker Compose Setup
| Field | Detail |
|-------|--------|
| **Description** | docker-compose.yml with PostgreSQL 16, Redis 7, backend (port 8080), frontend (port 5173). Health checks, volumes, networks |
| **Acceptance Criteria** | `docker-compose up` starts all 4 containers, frontend → backend → database connectivity verified |
| **Dependencies** | T-001 |
| **Priority** | P0 🔴 |
| **Story Points** | 3 |
| **Definition of Done** | Local development environment ready |

### T-025: Environment Configuration
| Field | Detail |
|-------|--------|
| **Description** | .env.example with all variables documented, backend application.yml externalized (no hardcoded secrets), frontend .env template |
| **Acceptance Criteria** | No secrets in code, all config via environment variables, .env.example is complete reference |
| **Dependencies** | T-001 |
| **Priority** | P0 🔴 |
| **Story Points** | 2 |
| **Definition of Done** | New developer can set up from example |

---

## SPRINT 2 — CARDS + TRANSACTIONS (Days 11-17)

### T-026: Backend — Virtual Card Entity
| Field | Detail |
|-------|--------|
| **Description** | VirtualCard entity: id, userId, cardNumber (masked stored), cardHolder, expiry, status (ACTIVE/FROZEN/EXPIRED), limits, design, merchantLock, isOneTime |
| **Acceptance Criteria** | Entity maps to DB, cardNumber stored as masked, status defaults to ACTIVE |
| **Dependencies** | T-002, T-003 |
| **Priority** | P0 🔴 |
| **Story Points** | 3 |
| **Definition of Done** | Repository tests pass |

### T-027: Backend — Card Generation
| Field | Detail |
|-------|--------|
| **Description** | POST /cards — generate virtual card with BIN (4xxxxx), random number, CVV, expiry (3 years). Limit validation. Max 5 active cards per user |
| **Acceptance Criteria** | Card generated with valid BIN, limits respected, max 5 cards enforced, design stored as JSON |
| **Dependencies** | T-026 |
| **Priority** | P0 🔴 |
| **Story Points** | 5 |
| **Definition of Done** | Card generation verified |

### T-028: Backend — Card Freeze/Unfreeze & Delete
| Field | Detail |
|-------|--------|
| **Description** | POST /cards/{id}/freeze, POST /cards/{id}/unfreeze, DELETE /cards/{id}. Status transitions: ACTIVE↔FROZEN, only EXPIRED cards can be deleted |
| **Acceptance Criteria** | Freeze updates status, double-freeze returns error, delete only on expired cards |
| **Dependencies** | T-027 |
| **Priority** | P0 🔴 |
| **Story Points** | 2 |
| **Definition of Done** | Status transitions tested |

### T-029: Backend — Card Limits & Design Update
| Field | Detail |
|-------|--------|
| **Description** | PUT /cards/{id}/limit (spending, daily validation: daily <= total), PUT /cards/{id}/design (bg, mascot, customPic as JSON) |
| **Acceptance Criteria** | Limits validated (daily <= total), design JSON stored/returned, authorization enforced |
| **Dependencies** | T-027 |
| **Priority** | P1 🟠 |
| **Story Points** | 3 |
| **Definition of Done** | Limit/design updates verified |

### T-030: Frontend — Cards Page
| Field | Detail |
|-------|--------|
| **Description** | Card list with visual card UI, generate card form (limits, design customization), freeze/unfreeze toggle, limit editing, design picker |
| **Acceptance Criteria** | Cards displayed with mask, generate works, freeze updates UI, limits editable, design customizable, max 5 enforced |
| **Dependencies** | T-027, T-028, T-029 |
| **Priority** | P0 🔴 |
| **Story Points** | 8 |
| **Definition of Done** | Cards page fully functional, type-safe |

### T-031: Backend — Transaction Entity & Recording
| Field | Detail |
|-------|--------|
| **Description** | Transaction entity: id, walletId, cardId, type (CREDIT/DEBIT), category, amount, balanceAfter, description, merchant, referenceId, status. Auto-generated reference IDs |
| **Acceptance Criteria** | Transaction created on top-up and spend, reference ID unique, balanceAfter calculated correctly |
| **Dependencies** | T-002 |
| **Priority** | P0 🔴 |
| **Story Points** | 3 |
| **Definition of Done** | Transaction recording verified |

### T-032: Backend — Transaction Listing
| Field | Detail |
|-------|--------|
| **Description** | GET /transactions — paginated, filterable by category, type, date range. GET /transactions/{id} — single transaction detail |
| **Acceptance Criteria** | Pagination works (default 20), filters applied correctly, only user's own transactions returned |
| **Dependencies** | T-031 |
| **Priority** | P0 🔴 |
| **Story Points** | 3 |
| **Definition of Done** | Listing + filtering tested |

### T-033: Backend — Simulate Spend
| Field | Detail |
|-------|--------|
| **Description** | POST /transactions/simulate — test transaction without real payment. Validates balance, creates DEBIT record, detects overspending |
| **Acceptance Criteria** | Balance checked, transaction recorded, overspending flagged if category > budget, card limit checked |
| **Dependencies** | T-031, T-027 |
| **Priority** | P1 🟠 |
| **Story Points** | 3 |
| **Definition of Done** | Simulate scenario tested |

### T-034: Frontend — Transactions Page
| Field | Detail |
|-------|--------|
| **Description** | Transaction list with filter (category, type), date grouping, amount display (green/red), category emoji, pagination |
| **Acceptance Criteria** | List loads, filters work, pagination functional, amounts formatted correctly, responsive |
| **Dependencies** | T-032 |
| **Priority** | P0 🔴 |
| **Story Points** | 5 |
| **Definition of Done** | Transactions page functional |

### T-035: Frontend — Dashboard Page
| Field | Detail |
|-------|--------|
| **Description** | Welcome greeting, balance card, quick stats (spent, saved, score, streak), recent transactions list, category breakdown, AI coach teaser |
| **Acceptance Criteria** | All widgets load data, greeting personalized, financial score calculated, responsive grid |
| **Dependencies** | T-020, T-034 |
| **Priority** | P0 🔴 |
| **Story Points** | 5 |
| **Definition of Done** | Dashboard fully functional |

### T-036: Backend — Email Notification Service
| Field | Detail |
|-------|--------|
| **Description** | Spring Mail sender with HTML templates for: welcome email, OTP, transaction alert, monthly report |
| **Acceptance Criteria** | Emails sent with correct templates, HTML rendered properly, attachments supported (PDF) |
| **Dependencies** | T-001 |
| **Priority** | P1 🟠 |
| **Story Points** | 3 |
| **Definition of Done** | Email delivery integration test |

### T-037: Frontend — Command Palette
| Field | Detail |
|-------|--------|
| **Description** | Cmd+K quick search overlay with navigation shortcuts (go to wallet, cards, etc.), keyboard navigation |
| **Acceptance Criteria** | Opens with Cmd+K, keyboard navigable, routes to correct page, closes on Escape |
| **Dependencies** | T-009 |
| **Priority** | P2 🟡 |
| **Story Points** | 3 |
| **Definition of Done** | Command palette functional |

### T-038: Backend — Admin User Seeding
| Field | Detail |
|-------|--------|
| **Description** | Admin account creation on startup via env vars (ADMIN_EMAIL, ADMIN_PASSWORD). Only if not exists |
| **Acceptance Criteria** | Admin user created on first startup, not duplicated on restart, credentials from env only |
| **Dependencies** | T-003, T-004 |
| **Priority** | P1 🟠 |
| **Story Points** | 2 |
| **Definition of Done** | Admin seeding verified |

### T-039: Frontend — Admin Page
| Field | Detail |
|-------|--------|
| **Description** | Protected admin panel with stats (total users, total balance, etc.), user management (future), only visible to ADMIN role |
| **Acceptance Criteria** | Only ADMIN users can access, stats load, non-admin redirected |
| **Dependencies** | T-038 |
| **Priority** | P2 🟡 |
| **Story Points** | 3 |
| **Definition of Done** | Admin page functional |

### T-040: Frontend — ReCaptcha Component
| Field | Detail |
|-------|--------|
| **Description** | Google reCAPTCHA v3 wrapper component, integrates with login/register forms, invisibly validates |
| **Acceptance Criteria** | reCAPTCHA token sent with auth requests, component renders without visible checkbox |
| **Dependencies** | T-007 |
| **Priority** | P1 🟠 |
| **Story Points** | 2 |
| **Definition of Done** | reCAPTCHA verified in auth flow |

---

## SPRINT 3 — ANALYTICS + AI (Days 18-24)

### T-041: Backend — Transaction Categorization
| Field | Detail |
|-------|--------|
| **Description** | Auto-categorization of transactions based on merchant name keywords. Rule engine: FOOD (swiggy, zomato), TRANSPORT (uber, ola), SHOPPING (amazon, myntra), etc. |
| **Acceptance Criteria** | Known merchants auto-categorized, unknown → OTHER, manual override supported |
| **Dependencies** | T-031 |
| **Priority** | P1 🟠 |
| **Story Points** | 5 |
| **Definition of Done** | Category mapping accuracy > 80% |

### T-042: Backend — Analytics Endpoint
| Field | Detail |
|-------|--------|
| **Description** | GET /analytics?days=30 — total debit/credit, net savings, spending by category (sum + percentage), top merchants, daily trends |
| **Acceptance Criteria** | Returns computed aggregates, date range filter works, no transactions returns zeros (not errors) |
| **Dependencies** | T-041 |
| **Priority** | P0 🔴 |
| **Story Points** | 5 |
| **Definition of Done** | Analytics endpoint verified |

### T-043: Backend — Financial Score Calculation
| Field | Detail |
|-------|--------|
| **Description** | Score (0-100): 40% savings rate, 30% budget adherence, 20% streak days, 10% category diversity. Grade: A(80+), B(60+), C(40+), D(20+), F(<20) |
| **Acceptance Criteria** | Score calculated correctly, grades assigned, factors independently verifiable |
| **Dependencies** | T-042 |
| **Priority** | P1 🟠 |
| **Story Points** | 3 |
| **Definition of Done** | Score formula verified with test data |

### T-044: Frontend — Analytics Page
| Field | Detail |
|-------|--------|
| **Description** | Financial score card, income vs expenses bar chart (Recharts), category pie chart, spending trends, top merchants list |
| **Acceptance Criteria** | Charts render correctly, data from API, loading/empty/error states, responsive |
| **Dependencies** | T-042, T-043 |
| **Priority** | P0 🔴 |
| **Story Points** | 5 |
| **Definition of Done** | Analytics page fully functional |

### T-045: Backend — Rewards Entity & Points
| Field | Detail |
|-------|--------|
| **Description** | RewardPoints entity: id, userId, points (default 0), streakDays (default 0), lastStreakAt. RewardHistory: id, userId, pointsChange, reason |
| **Acceptance Criteria** | Points created on registration, history tracks all changes |
| **Dependencies** | T-002, T-003 |
| **Priority** | P2 🟡 |
| **Story Points** | 3 |
| **Definition of Done** | Rewards entities verified |

### T-046: Backend — Streak & Points Logic
| Field | Detail |
|-------|--------|
| **Description** | Daily login streak: +1 point per day, +5 bonus at 7-day streak, streak resets if missed. Points earned: +1 per ₹100 spent (budgeted), +10 per completed budget |
| **Acceptance Criteria** | Streak increments daily, resets if skipped, bonus applied correctly, history recorded |
| **Dependencies** | T-045 |
| **Priority** | P2 🟡 |
| **Story Points** | 5 |
| **Definition of Done** | Streak/reward logic tested |

### T-047: Backend — Rewards Endpoints
| Field | Detail |
|-------|--------|
| **Description** | GET /rewards (points + streak), GET /rewards/history (paginated), POST /rewards/claim-streak (daily check-in) |
| **Acceptance Criteria** | Points balance returned, history paginated, streak claim works once per day |
| **Dependencies** | T-046 |
| **Priority** | P2 🟡 |
| **Story Points** | 3 |
| **Definition of Done** | Rewards API verified |

### T-048: Frontend — Rewards Page
| Field | Detail |
|-------|--------|
| **Description** | Points balance card, streak tracker with fire emoji, daily claim button, reward history list, progress to next milestone |
| **Acceptance Criteria** | Points display, streak visual, claim button works (daily), history loads, responsive |
| **Dependencies** | T-047 |
| **Priority** | P2 🟡 |
| **Story Points** | 3 |
| **Definition of Done** | Rewards page functional |

### T-049: Backend — AI Coach Chat Endpoint
| Field | Detail |
|-------|--------|
| **Description** | POST /ai-coach/chat — accepts message, calls OpenAI/Gemini API with financial context prompt, stores session in ai_sessions table |
| **Acceptance Criteria** | Message sent to AI provider, response returned, rate limited (20/min), session stored, context includes user's financial data |
| **Dependencies** | T-003, T-042 |
| **Priority** | P1 🟠 |
| **Story Points** | 8 |
| **Definition of Done** | AI chat integration tested |

### T-050: Backend — AI Coach Context Builder
| Field | Detail |
|-------|--------|
| **Description** | Build financial context string for AI prompt: user spending summary, budget vs actual, savings rate, recent transactions, financial score |
| **Acceptance Criteria** | Context includes relevant financial data, formatted for AI prompt, handles empty data gracefully |
| **Dependencies** | T-049 |
| **Priority** | P1 🟠 |
| **Story Points** | 5 |
| **Definition of Done** | Context string verified |

### T-051: Frontend — AI Coach Page
| Field | Detail |
|-------|--------|
| **Description** | Chat interface with welcome message, message bubbles (user right/assistant left), typing indicator, send button (Enter), conversation scroll |
| **Acceptance Criteria** | Messages display correctly, loading state shows typing indicator, error state shows retry message, rate limit info shown (10 free/day) |
| **Dependencies** | T-049 |
| **Priority** | P1 🟠 |
| **Story Points** | 5 |
| **Definition of Done** | AI Coach chat functional |

### T-052: Backend — Analytics Alert Service
| Field | Detail |
|-------|--------|
| **Description** | Check for overspending alerts: category > 120% of budget, daily spend > 2x average, streak at risk. Generate in-app and email alerts |
| **Acceptance Criteria** | Alerts triggered on transaction recording, thresholds configurable, duplicate alerts suppressed within 24h |
| **Dependencies** | T-032 |
| **Priority** | P2 🟡 |
| **Story Points** | 5 |
| **Definition of Done** | Alert scenarios tested |

### T-053: Frontend — Notification Badge
| Field | Detail |
|-------|--------|
| **Description** | Bell icon in Navbar with alert count badge, dropdown list of recent alerts (future), empty state when no alerts |
| **Acceptance Criteria** | Badge shows count, dropdown shows alerts (future), empty state renders |
| **Dependencies** | T-052 |
| **Priority** | P2 🟡 |
| **Story Points** | 3 |
| **Definition of Done** | Notification badge functional |

### T-054: Backend — Monthly Report Generation (Stub)
| Field | Detail |
|-------|--------|
| **Description** | Monthly spending summary PDF generation using iText or JasperReports. Sent via email. Report data: totals, categories, savings, score, streaks |
| **Acceptance Criteria** | PDF generated with correct data, emailed to user, formatted with branding (future: full implementation) |
| **Dependencies** | T-042, T-036 |
| **Priority** | P3 🟢 |
| **Story Points** | 8 |
| **Definition of Done** | PDF stub verified (console log + email placeholder) |

### T-055: Backend — Parental Controls
| Field | Detail |
|-------|--------|
| **Description** | Parent link: PUT /users/me/parental-control. Fields: enabled, maxTxnAmount, restrictedCategories, parentEmail. Parent gets view-only access |
| **Acceptance Criteria** | Parental controls updatable, restrictions enforced on transactions, parent view returns child's data only |
| **Dependencies** | T-021, T-032 |
| **Priority** | P2 🟡 |
| **Story Points** | 5 |
| **Definition of Done** | Parental controls verified |

---

## SPRINT 4 — POLISH + LAUNCH (Days 25-28)

### T-056: Security Audit
| Field | Detail |
|-------|--------|
| **Description** | Full security review: verify no hardcoded secrets, CORS configured, rate limiting active, SQL injection prevention, XSS prevention, auth flows correct |
| **Acceptance Criteria** | OWASP top 10 covered, no secrets in code, all endpoints rate-limited |
| **Dependencies** | T-025 |
| **Priority** | P0 🔴 |
| **Story Points** | 5 |
| **Definition of Done** | Security audit report, all critical issues fixed |

### T-057: Input Validation Pass
| Field | Detail |
|-------|--------|
| **Description** | Comprehensive input validation across all endpoints: @Valid annotations, custom validators (age, money, card limits), frontend validation |
| **Acceptance Criteria** | All user inputs validated, consistent error format, no invalid data reaches DB |
| **Dependencies** | T-025 |
| **Priority** | P0 🔴 |
| **Story Points** | 5 |
| **Definition of Done** | Validation test suite passes |

### T-058: Error Handling Pass
| Field | Detail |
|-------|--------|
| **Description** | Review all catch blocks: no silent errors, user-friendly messages, no sensitive info leaked, logging with context |
| **Acceptance Criteria** | All errors handled, no stack traces to client, no console.log without context |
| **Dependencies** | T-005 |
| **Priority** | P1 🟠 |
| **Story Points** | 3 |
| **Definition of Done** | Error handling review complete |

### T-059: Loading & Empty States Pass
| Field | Detail |
|-------|--------|
| **Description** | Every page/component has loading skeleton, empty state with CTA, error state with retry option |
| **Acceptance Criteria** | No blank screens, skeleton loaders visible during fetch, empty states helpful, errors recoverable |
| **Dependencies** | All feature tickets |
| **Priority** | P1 🟠 |
| **Story Points** | 5 |
| **Definition of Done** | All states verified |

### T-060: Responsive Design Pass
| Field | Detail |
|-------|--------|
| **Description** | Test all pages on mobile (375px), tablet (768px), desktop (1280px+). Fix layout breaks, touch targets, overflow |
| **Acceptance Criteria** | All pages functional on all breakpoints, no overflow, touch targets >= 44px |
| **Dependencies** | All feature tickets |
| **Priority** | P1 🟠 |
| **Story Points** | 5 |
| **Definition of Done** | Responsive test matrix complete |

### T-061: CI/CD Pipeline Setup
| Field | Detail |
|-------|--------|
| **Description** | GitHub Actions: backend build + test (JDK 17, Maven, PostgreSQL service), frontend build + lint (Node 20, npm ci, tsc, vite). Push to Docker Hub |
| **Acceptance Criteria** | Pipeline runs on push, tests pass, builds produce artifacts, secrets configured in GitHub |
| **Dependencies** | T-025 |
| **Priority** | P1 🟠 |
| **Story Points** | 5 |
| **Definition of Done** | CI/CD green on main branch |

### T-062: Docker Production Build
| Field | Detail |
|-------|--------|
| **Description** | Multi-stage Dockerfiles for backend (JAR build + slim runtime) and frontend (build + nginx serve). Docker Compose for prod with health checks |
| **Acceptance Criteria** | Production images < 200MB, nginx serves frontend, backend connected to managed DB/Redis |
| **Dependencies** | T-024, T-061 |
| **Priority** | P1 🟠 |
| **Story Points** | 3 |
| **Definition of Done** | Docker images build and run |

### T-063: Staging Deployment
| Field | Detail |
|-------|--------|
| **Description** | Deploy to Render (backend) + Vercel (frontend) or full Docker deployment. Configure managed PostgreSQL + Redis. DNS, SSL |
| **Acceptance Criteria** | Staging URL accessible, all APIs work, SSL active, CORS configured for staging domain |
| **Dependencies** | T-062 |
| **Priority** | P1 🟠 |
| **Story Points** | 5 |
| **Definition of Done** | Staging environment verified |

### T-064: Monitoring Setup
| Field | Detail |
|-------|--------|
| **Description** | Structured logging (JSON), health endpoint with DB/Redis checks, uptime monitoring (Better Uptime or UptimeRobot), error tracking (Sentry), performance monitoring |
| **Acceptance Criteria** | Logs structured and searchable, health endpoint returns status, alerts configured for downtime, errors tracked |
| **Dependencies** | T-063 |
| **Priority** | P2 🟡 |
| **Story Points** | 5 |
| **Definition of Done** | Monitoring dashboard shows all services healthy |

### T-065: Launch Checklist
| Field | Detail |
|-------|--------|
| **Description** | Final verification: all tests pass, security scan clean, performance baseline established, rollback plan documented, runbook created, stakeholder sign-off |
| **Acceptance Criteria** | All checklist items verified, sign-off obtained, rollback tested |
| **Dependencies** | All tickets |
| **Priority** | P0 🔴 |
| **Story Points** | 3 |
| **Definition of Done** | Production launch greenlit |

---

## ADDITIONAL TICKETS (POST-MVP)

| ID | Feature | Priority | Points |
|----|---------|----------|--------|
| T-066 | Bill splitting between users | P3 🟢 | 8 |
| T-067 | Monthly PDF report generation (full) | P3 🟢 | 8 |
| T-068 | WebSocket push notifications | P3 🟢 | 5 |
| T-069 | Savings goals & tracking | P3 🟢 | 5 |
| T-070 | Investment suggestions (AI) | P3 🟢 | 8 |
| T-071 | UPI payment integration (Razorpay) | P3 🟢 | 8 |
| T-072 | Multi-currency wallet | P3 🟢 | 5 |
| T-073 | Email verification flow | P3 🟢 | 3 |
| T-074 | Referral program | P3 🟢 | 5 |
| T-075 | Budget templates (predefined) | P3 🟢 | 3 |
| T-076 | Spending predictions (ML) | P3 🟢 | 8 |
| T-077 | Merchant loyalty card integration | P3 🟢 | 5 |
| T-078 | iOS/Android app (React Native) | P3 🟢 | 21 |
| T-079 | Gamification (levels, badges) | P3 🟢 | 8 |
| T-080 | Family account (shared wallet) | P3 🟢 | 13 |

---

## SPRINT VELOCITY

| Sprint | Story Points | Working Days | Velocity/Day | Team Size |
|--------|-------------|--------------|--------------|-----------|
| Sprint 0 | 34 | 3 | 11.3 | 4 |
| Sprint 1 | 42 | 7 | 6.0 | 4 |
| Sprint 2 | 38 | 7 | 5.4 | 4 |
| Sprint 3 | 40 | 7 | 5.7 | 4 |
| Sprint 4 | 26 | 4 | 6.5 | 4 |
| **Total** | **180** | **28** | **6.4 avg** | **4** |

**Assumptions:**
- Team: 2 backend, 1 frontend, 1 part-time DevOps/QA
- 1 story point = ~4 hours of engineering time
- Sprint 0 is lighter (scaffolding, configs)
- Sprint 4 is polish + launch (reduced feature work)

---

## RISK ADJUSTMENT

| Risk | Buffer |
|------|--------|
| AI integration complexity | +5 points (T-049, T-050) |
| Payment gateway delays | Post-MVP (T-071) |
| Regulatory blockers | Parallel legal work |
| Unforeseen bugs | +20% buffer (36 points) |

**Total adjusted effort: ~216 story points / 4 devs / 4 weeks**

---

## DEFINITION OF DONE (ALL TICKETS)

- [ ] Code written and reviewed (PR approved)
- [ ] Unit tests passing (>80% coverage for new code)
- [ ] Integration tests passing
- [ ] API contract verified (request/response matches spec)
- [ ] Frontend renders correctly (all states: loading, empty, error, success)
- [ ] Responsive on mobile + tablet + desktop
- [ ] No console errors or TypeScript warnings
- [ ] No security issues (secrets externalized, input validated)
- [ ] Documentation updated if applicable
- [ ] Deployed to staging and smoke-tested
