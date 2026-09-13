# Architecture Decision Records (ADRs) Master Register

> **Status**: Living Register  
> **Standard**: Michael Nygard / MADR 3.0.0 Format  
> **Directory Reference**: Detailed ADR records are archived in `docs/adr/ADR-*.md`  

---

## 1. Governance & Decision Lifecycle

Every non-trivial architectural decision in FST Pay is proposed, evaluated, and documented as an Architecture Decision Record (ADR). 

### Possible States:
- **Proposed**: Under team review and evaluation.
- **Accepted**: Approved and actively enforced in the codebase.
- **Superceded**: Replaced by a subsequent ADR.
- **Deprecated**: No longer applicable.

---

## 2. Master ADR Index

| ADR | Title | Status | Decided Date | Key Consequences |
|-----|-------|--------|--------------|------------------|
| [ADR-001](adr/ADR-001-Modular-Monolith.md) | Modular Monolith Architecture | Accepted | 2026-06-20 | Single deployable artifact; strict domain package boundaries. |
| [ADR-002](adr/ADR-002-Notification-Architecture.md) | Reusable Notification System | Accepted | 2026-06-22 | Decoupled notification generation from delivery channels. |
| [ADR-003](adr/ADR-003-Transaction-Rule-Engine.md) | Extensible Transaction Rule Engine | Accepted | 2026-06-24 | Declarative validation chain for transaction authorizations. |
| [ADR-004](adr/ADR-004-Wallet-Ledger.md) | Wallet Double-Entry Ledger Principles | Accepted | 2026-06-25 | Pessimistic row locking on balance mutations; zero negative balance. |
| [ADR-005](adr/ADR-005-Parent-Teen-Linking.md) | Parent-Teen Invitation Linking Flow | Accepted | 2026-06-27 | Email token verification for mutual account linkage. |
| [ADR-006](adr/ADR-006-Domain-Events.md) | Spring Application Domain Events | Accepted | 2026-06-29 | Decoupled side-effects from primary transactions. |
| [ADR-007](adr/ADR-007-Event-Driven-Architecture.md) | Asynchronous Event-Driven Architecture | Accepted | 2026-07-01 | Foundation for reliable asynchronous domain processing. |
| [ADR-008](adr/ADR-008-ArchUnit-Boundary-Enforcement.md) | Automated Boundary Checks via ArchUnit | Accepted | 2026-07-03 | Architectural rules tested in CI; breaks build on illegal imports. |
| [ADR-009](adr/ADR-009-Module-Boundary-Strategy.md) | Package-Private Internal Visibility | Accepted | 2026-07-04 | Repositories and internal helpers hidden from external packages. |
| [ADR-010](adr/ADR-010-Interface-Based-Module-Contracts.md) | Interface-Based Cross-Module Contracts | Accepted | 2026-07-05 | Public contract interfaces (`*Contract`) decouple module callers. |
| [ADR-011](adr/ADR-011-Domain-Events.md) | Immutable Domain Event Hierarchy | Accepted | 2026-07-06 | Standardized event metadata (eventId, timestamp, aggregateId). |
| [ADR-012](adr/ADR-012-Transactional-Outbox.md) | Transactional Outbox Pattern | Accepted | 2026-07-07 | Guarantees at-least-once event delivery; eliminates dual-writes. |
| [ADR-013](adr/ADR-013-Outbox-Observability.md) | Outbox Metrics & Dead-Letter Handling | Accepted | 2026-07-08 | Automated retry backoff and Prometheus metrics on outbox lag. |
| [ADR-014](adr/ADR-014-Kafka-Event-Streaming.md) | Apache Kafka Event Streaming with KRaft | Accepted | 2026-07-09 | Production event bus; swappable with Spring Events dispatcher. |
| [ADR-015](adr/ADR-015-Event-Versioning.md) | Event Schema Versioning Strategy | Accepted | 2026-07-10 | Backward-compatible JSON schemas for event payloads. |
| [ADR-016](adr/ADR-016-Observability-Strategy.md) | OpenTelemetry & Structured JSON Logging | Accepted | 2026-07-11 | Standardized log format across dev and prod environments. |
| **ADR-017** | Dual-Cloud Topology (Vercel + Render) & OCI Migration | Accepted | 2026-09-13 | Vercel for React edge; Render for Spring Boot/Postgres/Redis; OCI roadmap. |

---

## 3. Executive Summaries of Core Architectural Decisions

### ADR-001: Modular Monolith
- **Context**: Need high velocity and simple deployment without the operational complexity of dozens of microservices.
- **Decision**: Build a modular monolith in Spring Boot with 14 isolated domain packages and compile-time boundary enforcement.
- **Consequence**: Single deployment pipeline, unified database transactions, and clean code boundaries ready for microservice extraction if needed.

### ADR-012: Transactional Outbox Pattern
- **Context**: When a user tops up a wallet or freezes a card, multiple downstream systems (notifications, analytics, audit logs) must be notified without risking data inconsistency.
- **Decision**: Persist events to an `outbox_events` table in the same database transaction as the business entity update. An asynchronous worker polls and dispatches pending events.
- **Consequence**: Eliminates dual-write bugs and prevents lost notifications during external service outages.

### ADR-017: Dual-Cloud Production Strategy & Oracle Cloud Migration Path
- **Context**: Need a cost-effective, high-reliability deployment for MVP production with seamless developer experience and zero maintenance overhead.
- **Decision**: Deploy the React 19 frontend to **Vercel** for edge caching and automatic SSL; deploy Spring Boot and managed Postgres/Redis to **Render** via Infrastructure-as-Code Blueprint (`render.yaml`). Maintain a fully automated migration blueprint (`cloud-init.yml` + Docker Compose) for shifting to **Oracle Cloud Infrastructure (OCI)** Always Free tier as volume grows.
- **Consequence**: Rapid zero-ops startup on Vercel + Render with a zero-cost, high-performance migration path to dedicated OCI cloud infrastructure.
