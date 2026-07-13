# ADR-006: Domain Events for Cross-Module side effects

## Status
Accepted

## Date
2026-07-07

## Context
When core business operations happen (e.g., pocket money transfer, invitation accepted, or transaction approval requested), multiple secondary side-effects must occur: writing audit logs, sending email/push notifications, updating daily aggregate analytics, or awarding gamified XP. Writing all this logic inside the primary service classes creates high coupling and makes testing difficult.

## Problem
How do we decouple main business operations (like transfers and approvals) from secondary side-effects (like notifications, audit trails, and rewards)?

## Decision
We implemented a **Domain Event-Driven Architecture** utilizing Spring's internal Application Events:
- Core services publish immutable event classes (e.g., `PocketMoneyTransferredEvent`, `ApprovalRequestedEvent`) using Spring's `ApplicationEventPublisher`.
- A dedicated `DomainEventListener` class listens to these events using `@EventListener`.
- Listener methods are annotated with `@Async` to execute tasks in a background thread pool, preventing slow email delivery or audit writes from blocking the main user request thread.

## Alternatives Considered
- **Direct service injection:** Rejected because injecting `AuditService`, `NotificationService`, and `RewardsService` into every transaction service makes code rigid, hard to read, and prone to circular dependency errors.

## Consequences
- Single Responsibility Principle (SRP) is maintained: `WalletService` only does wallet operations, and does not need to know about XP rewards or emails.
- Improved API response times because side-effects are executed asynchronously.
- Clean testing: we can test services independently of their side-effects by checking published events.

## Trade-offs
- Debugging can be more challenging because execution shifts to separate threads.
- Transactions are completed before side-effects finish (eventual consistency), meaning email dispatch might fail after the wallet transfer succeeded.

## Future Considerations
- Introduce transactional event listeners (`@TransactionalEventListener`) to ensure events are only published after the database transaction commits successfully.
