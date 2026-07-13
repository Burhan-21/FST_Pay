# FST Pay — Changelog

All notable changes to this project will be documented in this file.

## [0.6.0] — 2026-07-13

### Added
- Rollup-based route code splitting and chunking configuration in `vite.config.ts` to optimize frontend production build size.
- Dynamic recpatcha script waiting and font-abort route filtering in all E2E spec suites to improve stability.

### Changed
- Configured E2E tests to run sequentially (`workers: 1`) to eliminate database write lock conflicts.
- Elevated Playwright default timeout to 60 seconds to support lengthy multi-step parent supervision flows.
- Excluded the `tests/` E2E suite directory from Vitest's unit test runner.
- Refined parent approvals request locator dynamically using unique descriptors instead of generic first-match selectors, eliminating locator shifting bugs.
- Aligned frontend parent decide-approval request model with Spring Boot controller expectations by transforming keys from `decision`/`parentNote` to `approved`/`note`.
- Changed `TransactionApproval.java` lazy-loading parent and child fields to `FetchType.EAGER` to fix serialization issues outside database transaction boundaries.
- Re-enabled parent-child links that had been previously unlinked by updating parent reactivation and token resetting logic.

## [Unreleased] — v2.0.0

### Phase 1 — Foundation (2026-07-02)

#### Added
- `PARENT` role in authentication system (USER / PARENT / ADMIN)
- Email provider abstraction (`EmailProvider` interface)
- Resend email integration (`ResendEmailProvider`) for production
- SMTP email provider (`SmtpEmailProvider`) for development (Mailtrap)
- Email templates: OTP, verification, password reset, welcome, security alert
- Placeholder emails for: monthly report, parent report, weekly summary, rewards, AI insights, parent invitation
- OpenAPI / Swagger UI at `/swagger-ui.html`
- Enhanced GitHub Actions CI/CD pipeline (compile, test, lint, Docker build, artifact upload)
- Architecture Decision Records (`docs/09-Decisions.md`)
- Brand Guidelines document (`docs/08-Brand-Guidelines.md`)
- Updated `.env.example` with email provider config

#### Changed
- `SecurityConfig` — added Swagger, parental, and teen endpoint authorization rules
- `application.yml` — added email provider config and springdoc config
- `EmailService` — refactored to use `EmailProvider` abstraction
- CI/CD pipeline — enhanced with separate jobs, artifact upload, Docker verification

#### Security
- All secrets externalized via environment variables
- No hardcoded API keys or credentials in codebase

---

## [1.0.0] — MVP Release

### Features
- JWT authentication with access + refresh tokens
- Email OTP verification with Redis
- Google reCAPTCHA v2
- Digital wallet with top-up simulation
- Virtual card generation with 6 designs
- Transaction history with categories
- Spending analytics
- AI Money Coach (Gemini/OpenAI)
- Rewards with points and streaks
- Admin panel with user management
- Light / Dark / AMOLED theme modes
- Rate limiting with Bucket4j
- Account lockout (5 attempts → 15min)
- Security headers (CSP, HSTS, X-Frame-Options)
- 71 passing tests (38 backend + 33 frontend)
