# ADR-011: POJO-Based Domain Events and Transactional Decoupling

## Status
Accepted

## Date
2026-07-14

## Context
FST Pay incorporates multiple side effects (such as notification dispatch, audit logging, analytics tracking, and rewards calculation) that must occur when key business operations are performed (e.g., wallet top-up, money transfer, goal completion, card creation). Previously, these side effects were either direct synchronous method calls from services or routed via a monolithic event listener referencing JPA entities. This caused tight coupling, transaction safety issues, and performance bottlenecks.

## Problem
1. **Tight Coupling:** Core services (like `WalletGoalService`) directly invoked side-effect services (like `RewardsService` and `MeterRegistry`), creating dependency cycles.
2. **Transaction Integrity:** Side effects could run before the main database transaction committed, causing inconsistencies if the transaction rolled back.
3. **JPA Entity Exposure:** Passing mutable JPA entities (such as `User`) inside events triggered lazy loading exceptions and unintended database mutations outside of transactional contexts.
4. **Synchronous Bottlenecks:** Blocking the main request thread to dispatch emails or update metrics reduced the platform's throughput.

## Decision
We adopted a POJO-based domain events architecture to decouple services from their side effects:
1. **Domain Events Abstraction:** All events are flat, immutable record classes implementing a base `DomainEvent` interface:
   ```java
   public interface DomainEvent {
       EventMetadata metadata();
   }
   ```
2. **JPA Isolation:** Events must never expose mutable JPA entities. Instead, we introduce lightweight immutable snapshots (e.g., `UserSnapshot`) or flat identifiers.
3. **Generic Event Publisher:** A simple `EventPublisher` interface is defined in `com.fstpay.common.event` with a concrete `SpringEventPublisher` implementation wrapping Spring's `ApplicationEventPublisher`.
4. **Asynchronous Transactional Listeners:** Specialized listeners (`NotificationEventListener`, `AuditEventListener`, `AnalyticsEventListener`, `RewardsEventListener`) handle events asynchronously (`@Async`) and only after the database transaction successfully commits using `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)`.
5. **ArchUnit Guardrails:** An ArchUnit rule was added to enforce that fields of classes implementing `DomainEvent` must not be JPA entities (annotated with `@Entity` or residing in `.entity.` packages).

## Alternatives Considered
- **Direct Synchronous Calls:** Retaining direct calls but adding async threading. Rejected because it doesn't break cyclic dependencies or resolve transactional integrity issues.
- **Spring ApplicationEvent Dependency:** Having events extend Spring's `ApplicationEvent`. Rejected to keep domain events clean and free of framework dependencies.
- **Outbox Pattern:** Implementing a database table to store events before publishing. Deferring this for now as it adds unnecessary database overhead at this stage, but the current POJO design makes transitioning to an outbox pattern simple.

## Future Migration Paths
As FST Pay transitions from a modular monolith to a distributed microservices architecture:
- **Kafka / RabbitMQ Integration:** The `EventPublisher` implementation can be swapped to serialize the POJO events to JSON and publish them to an external message broker (like Apache Kafka or RabbitMQ) without modifying the core business services.
- **Outbox Pattern with Debezium:** A transactional outbox table can be added to save events locally, with a CDC tool (like Debezium) streaming them to Kafka to ensure atomic updates and eventual consistency.

## Consequences
- **Loose Coupling & Cycle Resolution:** Package cycles between `goal` and `reward` have been broken. Services now publish events instead of invoking external services.
- **Transactional Safety:** Listeners only trigger after the main business transaction commits, preventing incorrect audits or rewards on rolled-back transactions.
- **Improved Performance:** Asynchronous listener execution unblocks the main thread, resulting in faster response times for users.
- **Future-Proof Structure:** Swapping out local event publishing for a distributed broker is abstract and seamless.
