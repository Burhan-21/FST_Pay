# Architecture Metrics

This document tracks quantitative metrics evaluating the modular structure, coupling, and architectural integrity of the FST Pay codebase over time.

| Metric | Baseline (v0.7.1-sprint-1) | Sprint 2 (v0.7.1-sprint-2) | Sprint 3 (v0.7.1-sprint-3) | Sprint 4 (v0.7.1-sprint-4) | Sprint 5 (v0.7.1-sprint-5) | Sprint 6 (v0.7.1-sprint-6) | Sprint 7 (v0.7.1-sprint-7) | Target (End of v0.7.x) | Notes / Details |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Modules** | 14 | 14 | 14 | 14 | 14 | 14 | 14 | 14 | Core and business packages under `com.fstpay`. |
| **ArchUnit Rules** | 5 | 7 | 8 | 9 | 9 | 10 | 12 | 12 | Rules checking layers, package cycles, and module access boundaries. |
| **ADRs** | 9 | 10 | 11 | 12 | 13 | 14 | 16 | 16+ | Architecture Decision Records documented in `docs/adr/`. |
| **Cross-Module Repository Injections** | 15 | 15 | 14 | 14 | 14 | 14 | 14 | 0 | Direct injection of one module's repository into another's classes. Removed 1 from goal-reward cycle. |
| **Cyclic Dependencies** | 2 | 2 | 1 | 1 | 1 | 1 | 1 | 0 | Package cycle groups (wallet-transaction remains; goal-reward is resolved via events). |
| **Technical Debt Items** | 10 | 10 | 9 | 9 | 9 | 9 | 9 | < 3 | Unresolved items tracked in `docs/TECHNICAL_DEBT.md`. |
| **Modules Exposing Public APIs** | 0 | 2 | 2 | 2 | 2 | 2 | 2 | 9 | Number of business modules exporting clean, interface-based public APIs. |
| **Modules Compliant with API-Only Access** | 0 | 2 | 2 | 2 | 2 | 2 | 2 | 9 | Number of business modules where ArchUnit strictly enforces API-only access. |

---

## Detailed Metric Breakdown

### Bounded Modules (14)
`admin`, `aicoach`, `analytics`, `audit`, `auth`, `card`, `goal`, `notification`, `parent`, `report`, `reward`, `transaction`, `user`, `wallet`.

### Active ArchUnit Rules (12)
1. `no_cyclic_dependencies` (verifying slices are cycle-free)
2. `controllers_should_not_be_accessed_by_other_layers`
3. `services_should_not_depend_on_controllers` (updated to check `..application..` as well)
4. `domain_entities_must_not_depend_on_web_packages`
5. `repositories_should_not_be_accessed_across_modules`
6. `wallet_application_should_not_be_accessed_by_other_modules`
7. `card_application_should_not_be_accessed_by_other_modules`
8. `domain_events_should_not_expose_jpa_entities` [NEW - Sprint 3]
9. `outbox_repository_should_only_be_accessed_by_outbox_package` [NEW - Sprint 4]
10. `only_infrastructure_packages_should_depend_on_spring_kafka` [NEW - Sprint 6]
11. `only_infrastructure_packages_should_inject_kafka_template` [NEW - Sprint 7]
12. `business_modules_must_never_depend_on_kafka_template` [NEW - Sprint 7]

### Public API Interfaces (3)
1. `com.fstpay.wallet.api.WalletOperations`
2. `com.fstpay.wallet.api.WalletDailySummaryOperations`
3. `com.fstpay.card.api.VirtualCardOperations`

### Cross-Module Repository Injections (14)
- `wallet` module -> `TransactionRepository` (1)
- `transaction` module -> `WalletRepository` (1)
- `parent` module -> `VirtualCardRepository` (1), `NotificationRepository` (1), `WalletGoalRepository` (1)
- `analytics` module -> `UserRepository` (1), `WalletRepository` (1), `TransactionRepository` (1), `VirtualCardRepository` (1), `RewardPointsRepository` (1)
- `aicoach` module -> `WalletGoalRepository` (1), `RewardPointsRepository` (1)
- `admin` module -> `VirtualCardRepository` (1)
- `parent` module (approval processor) -> `VirtualCardRepository` (1)

---

## Outbox Reliability & Observability Metrics (Updated in Sprint 7)

We track outbox publishing reliability, system performance, and event stream latency using the following Micrometer and Actuator metrics:
- **Pending Outbox Count (`fstpay.outbox.pending.total`)**: Gauge counting the number of events waiting to be dispatched in `PENDING` status.
- **Failed Outbox Count (`fstpay.outbox.failed.total`)**: Gauge counting the number of events currently in `FAILED` state (scheduled for retries).
- **Dead-Letter Outbox Count (`fstpay.outbox.dead_letter.total`)**: Gauge counting the number of permanently failed events in `DEAD_LETTER` state.
- **Oldest Pending Event Age (`fstpay.outbox.events.oldest_pending_age`)**: Gauge tracking the age of the oldest pending or failed event in seconds.
- **Total Published Counter (`fstpay.outbox.events.published.total`)**: Counter incremented each time an event transitions to `SENT`.
- **Total Failed Counter (`fstpay.outbox.events.failed.total`)**: Counter incremented each time a dispatch attempt fails.
- **Total Dead-Letter Counter (`fstpay.outbox.events.dead_letter.total`)**: Counter incremented when an event exhausts all retries and transitions to `DEAD_LETTER`.
- **Total Retry Attempts Counter (`fstpay.outbox.events.retry.total`)**: Counter incremented on every retry attempt of failed events.
- **Internal Processing Duration (`fstpay.outbox.processing.duration`)**: Timer tracking event deserialization, locking, and dispatch latency.
- **Dispatcher Publish Duration (`fstpay.dispatcher.publish.duration`)**: Timer tracking dispatch call duration to the specific routing backend [NEW - Sprint 7].
- **Idempotent Consumer Metrics**:
  - `fstpay.consumer.processed.total`: Counter for successful consumer executions [NEW - Sprint 7].
  - `fstpay.consumer.failed.total`: Counter for failed consumer executions [NEW - Sprint 7].
  - `fstpay.consumer.duplicate.total`: Counter for skipped/de-duplicated executions [NEW - Sprint 7].
- **Event Replay Metrics**:
  - `fstpay.replay.events.total`: Counter tracking the number of replayed outbox events [NEW - Sprint 7].

---

## OpenTelemetry Distributed Tracing Spans (Sprint 7)

We instrument key transition boundaries using OpenTelemetry tracing, enabling end-to-end tracing across HTTP boundaries, Outbox databases, and Kafka message brokers:
- **`Outbox Persistence`**: Wraps the initial persistence of the domain event into the outbox database table. Captures metadata like `event.id`, `event.type`, `aggregate.id`, and `aggregate.type`.
- **`Outbox Poll`**: Wraps background processor database polling and routing. Captures `retry.count` and `dispatcher.type`.
- **`Kafka Send`**: Wraps the Kafka record dispatch. Injects tracing headers (`traceparent`) into Kafka transport headers.
- **`Consumer Execute`**: Wraps idempotent listener interception aspect. Extracts incoming trace context from Kafka headers.
- **`Listener Execute`**: Wraps the execution of the concrete domain listener business logic.

---

## Operational Architecture Summary

| Metric | Current Value (Sprint 7) | Target | Notes |
| :--- | :---: | :---: | :--- |
| **Public Module APIs** | 2 | 9 | Modules with interface-based public boundaries. |
| **ArchUnit Rules** | 12 | 12 | Architectural boundary enforcement rules. |
| **Domain Events** | 10 | 15+ | Decoupled POJO/Record-based domain events. |
| **Outbox Delivery** | Dynamic Routing | Kafka | Routing dispatcher supporting Spring Events or Kafka streaming. |
| **Correlation Tracing** | OpenTelemetry SDK | OpenTelemetry | Tracing ID propagation via HTTP headers & Kafka headers. |
| **Health Indicators** | 2 | 2+ | Actuator outbox queue and stall age indicators. |
| **Admin Operations** | 6 | 6 | Operational endpoints under `/api/admin/outbox/**` (added `/replay`). |
| **Serializer Implementations** | 1 | 2 | Swappable serializer (`EventSerializer`) decoupled from Jackson. |
| **Idempotent Consumers** | Traced Aspect | Enabled | Aspect-based de-duplication targeting stable event IDs. |

---

## Sprint 7 Operational Indicators

| Metric | Current Value | Details / Source |
| :--- | :---: | :--- |
| **Modules exposing public APIs** | 2 | `wallet`, `card` |
| **ArchUnit rules** | 12 | Enforced via `ArchitectureTest.java` |
| **Domain event types** | 10 | Decoupled domain event payloads |
| **Kafka topics** | 8 | 8 main domain topics (`fstpay.<module>.events`) + DLT topics |
| **DLT-enabled consumers** | 1 | Configured via `kafkaListenerContainerFactory` |
| **Outbox processing latency** | < 50ms | Tracked by `fstpay.outbox.processing.duration` timer |
| **Average retries/event** | 0 (Normal case) | Tracked by `fstpay.outbox.events.retry.total` counter |
| **Processed event retention** | 7 days | Configured via `app.kafka.retention-days` (cleaned by scheduler) |
