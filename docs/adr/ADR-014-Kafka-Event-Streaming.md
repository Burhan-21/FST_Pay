# ADR-014: External Event Streaming with Apache Kafka

## Status
Accepted

## Date
2026-07-14

## Context
Following the adoption of the Transactional Outbox Pattern in ADR-012 and the observability additions in ADR-013, FST Pay needed to extend its event distribution model from simple, in-memory Spring ApplicationEvents to external event streaming. This allows independent downstream services to consume domain events reliably.

## Problem
Moving to an external broker like Apache Kafka introduces the following challenges:
- **Broker Coupling:** Direct dependency on a messaging library inside the business domain violates Clean Architecture.
- **Outbox Integration:** The Transactional Outbox must feed the message broker reliably without duplicate publishing loops or message loss.
- **Message Ordering:** To maintain domain consistency, events belonging to the same aggregate (e.g., transfers for a specific wallet) must be processed sequentially.
- **Consumer Idempotency:** Network glitches or broker restarts can cause duplicates (at-least-once delivery). Downstream consumers must be protected against duplicate processing.
- **Observability & Error Handling:** Tracing context (correlation IDs) must propagate over the wire, and failing consumer executions must be isolated to a Dead Letter Topic (DLT) instead of blocking the main queue.

## Decision
We implemented a production-grade external event streaming engine using Apache Kafka:

1. **EventDispatcher Abstraction:** Introduced the `EventDispatcher` interface. `OutboxProcessor` now dispatches events via this abstraction instead of direct Spring event publication. Two implementations are provided, selectable via `app.outbox.dispatcher-type`:
   - `SpringEventDispatcher`: Resolves events internally for local, synchronous, or simple setups.
   - `KafkaEventDispatcher`: Streams events directly to Kafka topics.
2. **Module-Level Topic Resolution:** Created `TopicResolver` mapping events to coarse-grained topics (`fstpay.<module>.events`) based on Java package conventions (e.g., `com.fstpay.wallet.*` -> `fstpay.wallet.events`).
3. **Partitioning by Aggregate ID:** Ensured sequential ordering by using `aggregateId` as the Kafka message key. Kafka routes messages with the same key to the same partition, guaranteeing in-order execution.
4. **Context Propagation Headers:** Propagated `eventId`, `correlationId`, and `causationId` through Kafka headers using `KafkaHeadersConstants`. This allows end-to-end tracing across distributed service boundaries.
5. **Idempotent Consumer Aspect:** Created `@IdempotentConsumer` annotation and `IdempotentConsumerAspect`. It intercepts consumer invocations, checks if the event ID is already recorded in the `ProcessedEvent` table, and skips execution on duplicate arrivals. It runs in a transaction to commit the processed event ID atomically with the business logic.
6. **DLT and Retries:** Configured a default `DefaultErrorHandler` with 3 retries (1-second backoff). Exhausted failures are forwarded to a Dead Letter Topic (appended with `.DLT`) using `DeadLetterPublishingRecoverer` to isolate failing partitions.
7. **Pruning Processed Events:** Added a daily scheduler `ProcessedEventCleanupScheduler` to purge processed event logs older than a configurable retention period (default 7 days).
8. **Dev Environment with KRaft Kafka:** Defined a single-node Bitnami Kafka container in KRaft mode and Provectus Kafka UI in `docker-compose.yml`, avoiding ZooKeeper overhead.
9. **ArchUnit Boundary Rule:** Enforced a structural rule: `only_infrastructure_packages_should_depend_on_spring_kafka`. Only `com.fstpay.common.config` or `.outbox` packages can import `org.springframework.kafka.*`, keeping core modules Kafka-blind.
10. **Embedded Verification:** Used `@EmbeddedKafka` to run high-fidelity integration tests within the JVM without depending on an external Docker daemon.

## Alternatives Considered
- **Direct Kafka Pub/Sub in Services:** Publishing directly to Kafka within business services would violate database-transaction boundaries (Dual Write Problem) and leak broker details into core layers. Retained Transactional Outbox as the single source of truth.
- **Kafka Connect / Debezium:** Excellent for database change data capture (CDC) but couples database schema changes directly to downstream topics. The outbox-based dispatcher gives the application full control over event payload structure and serialization versions.

## Consequences
- **Loose Coupling:** Core business domains remain completely unaware of Apache Kafka or messaging infrastructure.
- **Reliability:** The outbox guarantees at-least-once external publishing, and the aspect-based idempotency guarantees idempotent processing semantics on the consumer side under at-least-once delivery.
- **Traceability:** Distributed trace IDs span from incoming HTTP requests to Kafka messages, consumers, and resulting side effects.
- **Testability:** High-fidelity in-memory tests are fully validated during Maven runs without external dependencies.
- **Stalled Partition Avoidance:** Faulty messages are cleanly routed to `.DLT` partitions, preserving continuous streaming on the main topic.
