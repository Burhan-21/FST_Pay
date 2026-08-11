# ADR-012: Transactional Outbox Pattern for Reliable Event Delivery

## Status
Accepted

## Date
2026-07-14

## Context
Following the adoption of a decoupled POJO domain event model in ADR-011, FST Pay needed a reliable mechanism to publish events without risking inconsistency. Previously, events were published directly within the main business transaction. This posed two key reliability risks:
1. If the database transaction failed and rolled back after the event was dispatched, downstream handlers (like sending a notification or awarding points) would execute on invalid state.
2. If the application crashed or the listener failed during in-memory dispatch, the event would be lost forever.

To achieve robust, at-least-once event delivery and prepare the platform for future integration with message brokers (like Apache Kafka or RabbitMQ), we need to decouple event generation from event delivery.

## Problem
We need an event publishing strategy that satisfies:
- **Transaction Safety:** Events are only published if, and only if, the parent business transaction successfully commits.
- **Delivery Guarantee:** Once committed, events must be delivered at-least-once, even in the event of JVM crashes, network timeouts, or downstream failures.
- **Scalability:** Event publishing must support horizontal scaling with multiple service instances without duplicate execution.
- **Clean Separation:** Business modules must remain completely unaware of the event persistence or transport mechanism.

## Decision
We adopted the **Transactional Outbox Pattern** to handle event propagation:
1. **Outbox Persistence:** When a business service calls `EventPublisher.publish()`, the implementation (`OutboxEventPublisher`) serializes the event payload to JSON and inserts a row into the `outbox_events` table within the same database transaction.
2. **Dynamic Aggregates:** We updated the `DomainEvent` interface to expose `aggregateType()` and `aggregateId()` metadata, allowing the outbox schema to capture aggregate context natively.
3. **Pessimistic Locking & Skip Locked:** A background worker (`OutboxPublisher`) periodically polls for candidate events. For each candidate, it calls a transactional service (`OutboxProcessor`) using `Propagation.REQUIRES_NEW` to query with a pessimistic write lock and the `SKIP LOCKED` hint (`jakarta.persistence.lock.timeout` = `-2`). This ensures that multiple app instances can poll and process events concurrently without locking or picking up the same records.
4. **Rich State Machine:** We introduced a rich state lifecycle model:
   - `PENDING` (Created, waiting to be published)
   - `PROCESSING` (Locked and being dispatched)
   - `SENT` (Successfully dispatched to listeners)
   - `FAILED` (Dispatched but threw an exception; scheduled for retry)
   - `DEAD_LETTER` (Exceeded maximum of 5 retries; isolated for admin review)
5. **Operational Metrics:** Outbox state counts (pending, failed, dead-letter) are tracked as gauges, and transitions (published, failed, dead-letter) are logged using Micrometer counters.
6. **Encapsulation (ArchUnit):** An ArchUnit rule was added to enforce that business packages must never directly inject or depend on `OutboxEventRepository`, keeping persistence concerns strictly isolated to the outbox infrastructure package.

## Alternatives Considered
- **Transactional Event Listeners (AFTER_COMMIT):** We previously used `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)`. While transaction-safe, it provides no retry guarantees or crash resilience if the JVM restarts after commit but before execution.
- **Outbox Polling via CDC (Debezium):** Using Change Data Capture (CDC) to tail the transaction log and stream events. While extremely performant, it introduces additional infrastructure complexity. We chose database polling via JPA as a simple, native starting point, knowing our design is fully prepared to adopt CDC later.

## Consequences
- **At-Least-Once Delivery:** Events are safely persisted in the same transaction as state changes. If a database transaction commits, the event is guaranteed to be processed.
- **Fault Tolerance:** Temporary network issues or listener errors trigger a retry schedule. Persistent failures are safely isolated in a dead-letter state rather than crashing the system.
- **Kafka-Ready Design:** To transition to Apache Kafka or RabbitMQ, only the `OutboxProcessor` dispatch logic needs to be changed (publishing to a message broker instead of Spring's internal event bus). The core business logic and database transaction mappings remain completely untouched.
- **Strict Separation of Concerns:** Business modules depend solely on the `EventPublisher` contract, hiding the database outbox implementation completely.
