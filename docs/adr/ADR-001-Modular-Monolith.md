# ADR-001: Modular Monolith Architecture

## Status
Accepted

## Date
2026-07-07

## Context
FST Pay is designed as a startup MVP and a final year college project. It needs to be feature-rich (incorporating wallet transactions, virtual prepaid cards, an AI financial coach, parental controls, and a rewards system) while remaining simple to deploy, maintain, and refactor by a small development team.

## Problem
Should the architecture of FST Pay be structured as a set of Microservices or as a Modular Monolith?

## Decision
We chose a **Modular Monolith** architecture for FST Pay. All business logic is encapsulated in clear, isolated Java packages (e.g., `com.fstpay.wallet`, `com.fstpay.card`, `com.fstpay.notification`) within a single deployable Spring Boot application. High cohesion is maintained inside each module, and cross-module interaction is done via public interfaces or asynchronously using Spring Application Events.

## Alternatives Considered
- **Microservices:** Rejected due to operational complexity, overhead of running multiple databases, service mesh requirements, network latency, distributed transaction complexity, and the cost of deploying multiple hosting instances on Render/Vercel.

## Consequences
- Single database schema simplifies transactional integrity (ACID) and joins.
- Single deployable unit fits within free or low-cost hosting plans.
- Developers can refactor boundaries easily without breaking network APIs.
- Code can still be split into microservices in the future if a specific module requires independent scaling.

## Trade-offs
- Scaling is all-or-nothing (whole application is scaled together).
- Shared memory space means a memory leak or crash in one module can potentially take down the entire application.

## Future Considerations
If a specific module (such as the AI Coach or Card Transaction simulator) experiences heavy load or requires specific technology stacks, we can extract it into an independent microservice by moving its package and database tables into a separate service, communicating via REST or a message broker.
