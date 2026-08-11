# ADR-013: Outbox Observability & Operational Readiness

## Status
Accepted

## Date
2026-07-14

## Context
Following the adoption of the Transactional Outbox Pattern in ADR-012, FST Pay required additional operational capabilities to ensure the outbox is ready for production deployment. The system needed proper observability, serialization extensibility, tracing correlation across asynchronous boundaries, and maintenance tools to control database size.

## Problem
To make the outbox production-grade, we needed to address:
- **Serialization Coupling:** The outbox was coupled directly to Jackson (`ObjectMapper`), making it difficult to transition to schema-based protocols (like Avro or Protobuf) when moving to Kafka.
- **Traceability:** Asynchronous events published in the background had no correlation back to the original user HTTP requests, complicating logging and debugging.
- **Administration & Maintenance:** There was no interface for operations teams to inspect backlogs, manually retry failed dead-letters, or purge processed events.
- **Observability:** We lacked detailed metrics (latencies, retries, backlog ages) and health diagnostics to alert on stalled dispatchers.

## Decision
We implemented a comprehensive observability and operational package for the transactional outbox:
1. **Event Serializer Abstraction:** Introduced the `EventSerializer` interface and a default `JacksonEventSerializer` implementation. All serialization and deserialization in `OutboxEventPublisher` and `OutboxProcessor` now use this contract, completely decoupling the outbox logic from Jackson.
2. **Correlation ID Filter:** Added `CorrelationIdFilter` to capture the HTTP header `X-Correlation-ID` (or generate a UUID if missing), set it in SLF4J MDC, inject it into the HTTP response header, and cleanly purge it after request completion.
3. **Context Propagation:** Updated `EventMetadata` to load the current correlation ID from MDC if present. When events are generated inside a web request, they automatically inherit that correlation ID. We also added a factory overload accepting a `causationId` to enable parent-child event chaining.
4. **Actuator Health & Stall Detection:** Created `OutboxHealthIndicator` reporting status `UP` along with details (`pending`, `failed`, `deadLetter`, `oldestPendingAgeSeconds`). To prevent false positives, we avoid reporting `DOWN` for a temporary backlog. Instead, the status changes to `DOWN` only if the oldest pending/failed event exceeds the configurable stall threshold (`app.outbox.health.stall-threshold-seconds`, default 300).
5. **Micrometer Observability:** Added detailed metrics:
   - `fstpay.outbox.events.retry.total` (counter of event dispatch retry attempts)
   - `fstpay.outbox.events.oldest_pending_age` (gauge tracking oldest event age in seconds)
   - `fstpay.outbox.processing.duration` (timer tracking internal dispatch latency)
6. **Outbox Administration Endpoints:** Created `OutboxAdminService` and `OutboxAdminController` under `/api/admin/outbox/**` for operations teams, restricted to the `ADMIN` role:
   - `GET /statistics` (real-time queue sizes, oldest age, average processing latency, and retry rates)
   - `GET /dead-letter` (retrieval of all dead-lettered events)
   - `POST /{id}/retry` (retry a specific dead-letter/failed event by resetting status to `PENDING`)
   - `POST /retry-all` (bulk retry all dead-lettered events)
   - `POST /cleanup` (manually prune processed events)
7. **Scheduled Retention Cleanup:** Added `OutboxCleanupScheduler` to run periodic background cleanups of `SENT` events older than `app.outbox.retention-days` (default 7) in configurable batch sizes (`app.outbox.cleanup-batch-size`, default 100) to prevent database bloat.
8. **Optimistic Locking via @Version:** Added a `@Version` field to `OutboxEvent` to provide optimistic locking protection. This prevents concurrent update collisions in multi-threaded or multi-instance deployments.
9. **Centralized Configuration Properties:** Created a typed `OutboxProperties` configuration class under `app.outbox` to centralize all operational constants (delay times, retention, batch sizes, stall thresholds, max retries) instead of using scattered `@Value` annotations.
10. **Idempotency Strategy via Stable eventId:** Decoupled business and downstream event listeners by using a stable `eventId` embedded in `EventMetadata`. In Sprint 6 and beyond, downstream consumers will de-duplicate processing using this persistent identifier to ensure idempotent handling even with at-least-once brokers.

## Alternatives Considered
- **Spring Cloud Sleuth / OpenTelemetry:** Excellent for tracing but introduces significant library dependencies. We chose a lightweight custom filter utilizing Logback MDC to establish the trace IDs, which is fully compatible with OpenTelemetry if adopted later.
- **Physical Outbox Event Partitioning:** Moving processed events to a history table instead of deleting them. While useful for auditing, it adds complexity. We chose simple database pruning combined with structured JSON file logs for historical auditing.

## Consequences
- **Traceability:** Logs across controllers, services, and asynchronous event listeners are fully linked via the correlation ID header in the MDC context.
- **Production Readiness:** Outbox growth is automatically managed via daily cleanup cron cycles, and operations teams can recover stalled events in real time.
- **Kafka-Ready Serialization & Downstream Idempotency:** Swapping JSON serialization for Avro or Protobuf requires only implementing the `EventSerializer` interface. Downstream consumer systems can safely de-duplicate incoming messages using the stable `eventId`.
- **Concurrency Protection:** The combination of pessimistic write locking with database `SKIP LOCKED` query hints and JPA optimistic `@Version` checks provides a bulletproof concurrent polling model.
