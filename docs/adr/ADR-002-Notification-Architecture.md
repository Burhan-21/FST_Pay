# ADR-002: Notification Architecture

## Status
Accepted

## Date
2026-07-07

## Context
FST Pay needs to notify users (parents and teenagers) of important events like pocket money transfers, approval requests, goals completed, and security alerts. These notifications must support multiple delivery channels (in-app database feeds, emails, and future push notifications) while honoring user-defined channel preferences.

## Problem
How should the notification system be architected to allow adding new channels and handling user preferences without cluttering business services?

## Decision
We implemented a **Multi-Channel Provider Pattern** for notifications:
- A unified `NotificationService` handles incoming notification payloads.
- An interface `NotificationChannel` defines the contract for sending notifications (e.g., `send(Notification notification)`).
- Multiple bean implementations (e.g., `DatabaseNotificationChannel`, `EmailNotificationChannel`) implement this interface.
- Before delivering a message, `NotificationService` checks user preferences stored in `notification_preferences` to determine which channels are enabled for that specific type.

## Alternatives Considered
- **Direct SMTP/Email in Business Services:** Rejected because it couples business logic with SMTP configuration, does not support multiple channels, and makes it impossible for users to disable email alerts.
- **Third-Party Notification Orchestrators:** Rejected to avoid vendor lock-in, external dependencies, and additional subscription costs.

## Consequences
- Clean separation of concerns between trigger events, preference filtering, and channel delivery.
- Adding a new channel (e.g., Firebase Cloud Messaging for Push Notifications, Twilio for SMS) only requires implementing the `NotificationChannel` interface.
- Core business services are decoupled from notification delivery details.

## Trade-offs
- Added database lookup overhead for user notification preferences on every transaction notification.

## Future Considerations
- Introduce caching for notification preferences in Redis to reduce database read overhead on hot paths.
- Add an asynchronous delivery queue (e.g., Spring `@Async` or an external message broker) so slow SMTP/API calls do not block transaction completion.
