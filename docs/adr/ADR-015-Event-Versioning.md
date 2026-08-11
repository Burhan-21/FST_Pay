# ADR-015: Event Versioning and Payload Compatibility Policy

## Status
Accepted

## Date
2026-07-14

## Context
With the introduction of Apache Kafka in ADR-014, domain events are now serialized and streamed externally. As the FST Pay platform evolves, the structure (schema) of these events will inevitably change. If a producer publishes an event with a modified structure, downstream consumers that have not been updated concurrently may fail to parse it, causing message consumption to stall or crash.

## Problem
How do we evolve event schemas over time without requiring synchronized deployments of producers and consumers, and without causing downstream failures?

## Decision
We adopt a strict **Backward Compatibility-First Policy** for all domain events:

1. **Schema Evolution Policy**:
   - By default, all event schema modifications must be backward compatible. Downstream consumers running older versions of the code must be able to read and parse events produced by newer versions of the code without throwing errors.
2. **Design Constraints on Event Payloads**:
   - **Fields Addition:** Newly added fields must be optional or have clear default values. 
   - **Fields Removal:** Required fields must never be removed from an event payload. If a field is no longer needed, it must be marked as `@Deprecated` and remain in the payload (populated with fallback or empty values) for at least one release cycle before removal.
   - **Fields Renaming:** Fields must never be renamed. If a field name must change, the new field must be added as an optional field alongside the old field, and the producer must populate both.
3. **Explicit Version Headers**:
   - Every Kafka message header will carry a `schemaVersion` string (e.g., `1.0.0`) in the `schemaVersion` header metadata. This version follows Semantic Versioning (SemVer) rules.
   - Bumping the major version (e.g., `1.x.x` -> `2.0.0`) represents a breaking change and requires deploying to a new topic (e.g., `fstpay.wallet.events-v2`) to isolate older consumers.
4. **Resilient Deserialization**:
   - Downstream JSON deserializers are configured with `DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES = false`. This ensures that consumers simply ignore newly added properties they do not yet recognize rather than failing.
5. **Version Negotiation & Fallbacks**:
   - When consuming an event, the consumer inspects the `schemaVersion` header.
   - If the event version is older than the consumer's expected version, the consumer uses fallback defaults for missing fields.
   - If the event version has a higher minor/patch version, the consumer parses recognized fields and ignores unknown fields.

## Alternatives Considered
- **Confluent Schema Registry with Avro/Protobuf:** This is the industry-standard mechanism for schema enforcement and validation. While we intend to move to this as the project grows, introducing it now adds significant operational overhead (running and managing a Schema Registry service in dev/test). Adopting a disciplined SemVer header policy and resilient JSON deserialization achieves the same compatibility benefits with zero extra infrastructure.
- **Strict Single-Version Coupling:** Forcing all producers and consumers to deploy simultaneously. This violates modular monolith goals and prevents independent scaling/deployment of services.

## Consequences
- **Independent Deployments:** Producers can release new event fields at any time without coordinating deployment schedules with downstream consumer teams.
- **Zero-Downtime Upgrades:** Services can be upgraded incrementally without stopping the event stream.
- **No Infrastructure Bloat:** Solves versioning using basic Kafka headers and Jackson configuration, postponing the need for a complex Schema Registry until it is operationally necessary.
