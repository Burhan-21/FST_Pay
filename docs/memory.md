# Project Memory & Engineering State — FST Pay

> **Document Type**: Living Architecture Memory & Continuity Log  
> **Audience**: AI Coding Agents & Principal Engineers  
> **Last Updated**: 2026-09-13  

---

## 1. Architectural Context & Evolution

FST Pay started as a monolithic MVP and has evolved into an enterprise-grade **Modular Monolith** with strict domain boundary enforcement:

1. **Modular Monolith Design**:
   - 14 bounded contexts in `com.fstpay.*`: `auth`, `user`, `wallet`, `card`, `transaction`, `parent`, `goal`, `reward`, `aicoach`, `analytics`, `report`, `notification`, `audit`, `common`.
   - Domain modules communicate exclusively through **Interface Contracts** (e.g., `WalletContract`, `CardContract`) or asynchronously via **Spring Domain Events** and **Transactional Outbox**.
   - Direct cross-module entity queries or repository injections are prohibited and automatically enforced by **ArchUnit** tests in `com.fstpay.architecture.ArchitectureTest`.

2. **Reliable Asynchronous Messaging**:
   - Implemented the **Transactional Outbox Pattern** (`outbox_events` table).
   - Domain events are atomically committed with database transactions, eliminating dual-write vulnerabilities.
   - Dispatcher abstracts event publishing to local Spring application events or distributed **Apache Kafka** topics (`OUTBOX_DISPATCHER_TYPE=spring` or `kafka`).

3. **Runtime Hardening Milestones**:
   - Strict environment validation at startup (`StartupEnvironmentValidator` fails fast in production if placeholder secrets or wildcard CORS origins are detected).
   - Correlation ID propagation across HTTP headers (`X-Correlation-Id`), MDC logger context, and Kafka message headers.
   - Structured JSON logging via `net.logstash.logback.encoder.LoggingEventCompositeJsonEncoder` in production profiles.

---

## 2. Engineering Milestones Timeline

| Milestone | Date | Key Deliverables |
|-----------|------|------------------|
| **v0.1.0** | 2026-06-15 | Project foundation, Flyway migrations (V1–V3), Spring Security JWT base. |
| **v0.3.0** | 2026-06-28 | Virtual card issuance, 3D card flip animation, OTP verification flow. |
| **v0.5.0** | 2026-07-04 | AI Financial Coach integration (Gemini/OpenAI), rewards & gamification engine. |
| **v0.6.0** | 2026-07-06 | Parent-teen linking protocol, allowance scheduling, bundle optimization. |
| **v0.7.0** | 2026-07-08 | ArchUnit architectural testing, interface contracts, ADR catalog established. |
| **v0.8.0** | 2026-07-10 | Transactional Outbox pattern, Kafka event streaming, OpenTelemetry tracing. |
| **v1.0.0** | 2026-09-13 | Production transformation: Vercel frontend edge, Render backend PaaS, OCI roadmap. |

---

## 3. Core System Invariants & Guardrails

When extending the codebase, the following invariants MUST NEVER be violated:

1. **Financial Non-Negativity**: A wallet balance can NEVER be decremented below zero. All balance mutations must use pessimistic database row locking (`SELECT FOR UPDATE`) within an isolated transaction.
2. **PAN & CVV Protection**: Full 16-digit card numbers and CVVs must NEVER be logged or returned in plain text across list or overview endpoints.
3. **Module Boundary Decoupling**: Controllers in module `X` must never call services or repositories in module `Y`. Cross-module communication must use published domain events or the module's public contract interface.
4. **Audit Immutability**: The `audit_logs` and `transaction_history` records are append-only. No `UPDATE` or `DELETE` operations are permitted on these tables.
5. **Fail-Fast Configuration**: In `prod` profile, default passwords, weak JWT keys, or wildcard CORS are fatal startup exceptions.

---

## 4. Active Technical Debt Register

| ID | Module | Issue Description | Severity | Planned Mitigation |
|----|--------|-------------------|----------|--------------------|
| **DEBT-01** | `auth` | Refresh tokens stored in Redis rely on key expiration without persistent audit trail. | Medium | Add persistent `refresh_token_audit` table with device fingerprinting. |
| **DEBT-02** | `outbox` | Current outbox poller runs on fixed delay; high throughput could benefit from CDC. | Low | Evaluate Debezium CDC connector when shifting to OCI Kafka cluster. |
| **DEBT-03** | `frontend` | Some dashboard components re-render when global theme toggles. | Low | Optimize React Context memoization with `useMemo` and selectors. |
| **DEBT-04** | `aicoach` | In-memory rate limiting for AI requests. | Medium | Migrate Bucket4j AI rate limiter to Redis-backed distributed bucket. |
