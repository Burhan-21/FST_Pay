# ADR-007: Local Event-Driven Architecture vs. External Message Broker

## Status
Accepted

## Date
2026-07-07

## Context
FST Pay uses an asynchronous domain event model to execute side-effects like audit logging, rewards progression, and notification dispatch. While local Spring events are easy to configure, larger enterprise environments typically use external message brokers (e.g., Apache Kafka, RabbitMQ) to handle events.

## Problem
Why did we choose Spring's local `ApplicationEventPublisher` instead of a dedicated message broker like Kafka or RabbitMQ, and under what conditions should we migrate?

## Decision
We chose Spring's local in-memory **`ApplicationEventPublisher` combined with `@Async`** thread executors:
- Events are distributed inside the JVM memory space.
- There are no external infrastructure requirements (no need to run a broker container or pay for cloud message queues).
- Synchronous and asynchronous listeners are supported out of the box with standard annotations.

## Alternatives Considered
- **Apache Kafka:** Rejected for the MVP due to extreme resource consumption, complicated local setups, and additional cloud hosting costs.
- **RabbitMQ:** Rejected because it introduces unnecessary architectural overhead for a monolithic MVP.

## Consequences
- Zero-cost, zero-infrastructure setup for the MVP.
- Event listening is fast, since it avoids network calls to a broker.
- However, events are not persistent: if the server restarts or crashes while an event is in the memory queue, it is lost forever.

## Trade-offs
- Lack of durability: local events are lost on crash.
- Lack of horizontal scale: memory events cannot cross node boundaries if we scale the monolithic backend to multiple instances.

## Future Considerations (Migration Strategy)
We should migrate to an external message broker (like RabbitMQ or AWS SQS) when:
1. We extract modules (e.g., the Notification module) into independent microservices.
2. We require strict event durability guarantees (events must not be lost on app crashes).
3. We scale the backend horizontally across multiple nodes (events must be distributed cluster-wide).
