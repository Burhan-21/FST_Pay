# ADR-016: Observability, Telemetry & Distributed Tracing Strategy

## Status
Accepted

## Date
2026-07-14

## Context
With the introduction of the Transactional Outbox (ADR-012) and external event streaming via Apache Kafka (ADR-014), the execution path of business transactions has transitioned from synchronous method calls to asynchronous, multi-threaded pipelines. Transactions flow from HTTP requests, to database transactions, to asynchronous outbox polling, to Kafka message brokers, and finally to decoupled listener threads. 

Without a robust telemetry and observability strategy, tracking the path of a single business request across these boundaries becomes extremely difficult, impeding troubleshooting, bottleneck identification, and operational monitoring.

## Problem
How do we propagate distributed tracing contexts across thread, database, and network boundaries, and expose system health metrics without polluting the core business domain logic with operational telemetry concerns?

## Decision
We adopt a unified **Observability, Telemetry, and Distributed Tracing Strategy** based on OpenTelemetry, Prometheus Micrometer metrics, and structured JSON logging:

1. **OpenTelemetry Tracing Framework**:
   - We integrate the industry-standard **OpenTelemetry (OTel) API and SDK** into the application core.
   - Traces are exported using the OTLP gRPC standard to a local Jaeger all-in-one instance running on port `4317` (gRPC collector) and `/16686` (UI).
   - Telemetry exporting is disabled during tests (`activeProfiles.contains("test")`) to prevent warning logs and test suite lag.

2. **Cross-Thread & Messaging Propagation**:
   - **Outbox Persistence:** Wrap outbox event storage in an `"Outbox Persistence"` span carrying metadata attributes (`event.id`, `event.type`, `aggregate.id`, `aggregate.type`).
   - **Outbox Processing:** Wrap background processor execution in an `"Outbox Poll"` span with `dispatcher.type` and `retry.count` attributes.
   - **Kafka Dispatch:** Wrap Kafka sending in a `"Kafka Send"` span, and inject the current OTel span context into the outbound Kafka headers using the W3C trace context propagator (`traceparent` header).
   - **Consumer Interception:** Use the `IdempotentConsumerAspect` to extract the incoming trace context from Kafka headers, initiating a `"Consumer Execute"` parent span and a `"Listener Execute"` business execution span.

3. **Structured JSON Logging & MDC Integration**:
   - Production logs are structured as Logstash JSON packets containing context variables.
   - Active trace/span metadata (`traceId`, `spanId`), event metadata (`eventId`, `correlationId`, `aggregateId`), and transport metrics (`topic`, `partition`, `offset`) are automatically bound to the SLF4J MDC map.
   - MDC variables are cleared inside `finally` blocks to prevent thread-local leakage.

4. **Micrometer Prometheus Metrics**:
   - Expose the `/actuator/prometheus` endpoint.
   - Register dynamic gauges tracking database queue sizes (`fstpay.outbox.pending.total`, `fstpay.outbox.failed.total`, `fstpay.outbox.dead_letter.total`).
   - Track dispatch and consumption latencies using timers (`fstpay.outbox.processing.duration`, `fstpay.dispatcher.publish.duration`).
   - Monitor de-duplication efficiency and failures (`fstpay.consumer.processed.total`, `fstpay.consumer.failed.total`, `fstpay.consumer.duplicate.total`).

## Alternatives Considered
- **Spring Cloud Sleuth / Micrometer Tracing**: Micrometer Tracing is the default in Spring Boot 3. However, using the direct OpenTelemetry SDK gives us the most flexibility to integrate with any OTLP-compliant collector (like OTel Collector) and provides direct integration with Jaeger without extra wrapping libraries.
- **Manual Logging Correlation**: Using log filters to pass correlation IDs manually. While simpler, this does not construct visual trace graphs and fails to capture execution durations or database polling latency.

## Consequences
- **End-to-End Tracing:** Developers and operators can inspect distributed traces visually in Jaeger, showing the exact latency and execution details from the HTTP request to database outbox save, Kafka dispatch, and consumer de-duplication.
- **Strict Decoupling:** Business domain services remain completely unaware of OpenTelemetry, which is entirely encapsulated inside infrastructure layers (aspects, filters, and dispatchers).
- **Production Readiness:** Outbox queue sizes and processing bottlenecks are exposed to Prometheus scraper targets, facilitating alerts on stalled message queues.
