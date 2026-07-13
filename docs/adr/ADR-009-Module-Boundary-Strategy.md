# ADR-009: Module Boundary Strategy

## Status
Accepted

## Date
2026-07-13

## Context
In FST Pay, modules represent distinct business domains (e.g. `auth`, `wallet`, `card`, `transaction`, `parent`, `reward`, `goal`, `notification`, `aicoach`). To support independent evolution and future microservice migration, these modules must communicate only through designated public interfaces (Services/Facades) or via asynchronous application events, avoiding direct access to other modules' internal details (like repositories).

## Problem
Currently, several feature modules directly access and query other modules' databases/repositories (e.g., `WalletService` accessing `TransactionRepository`, `ParentDashboardService` accessing `NotificationRepository` and `WalletGoalRepository`, etc.). This tight coupling breaks module encapsulation and prevents independent database scaling or migration.

## Decision
We adopted a structured **Module Boundary Strategy**:
1. **Repository Encapsulation:** Repositories are private to their module. No repository should be injected directly into classes of another module.
2. **Public API (Services/Facades):** Cross-module interaction must go through the module's public service layer or facade.
3. **Asynchronous Events:** Where immediate transactional consistency is not required, modules should communicate by publishing and listening to Spring `ApplicationEvent`s.
4. **Transition Plan:** Existing direct repository cross-module accesses are documented in `docs/TECHNICAL_DEBT.md` and temporarily exempted in ArchUnit tests. In subsequent sprints, these will be systematically refactored to use public services/facades or events.

## Consequences
- Better separation of concerns and looser coupling between domain modules.
- Simpler migration path from modular monolith to distributed microservices.
- Enforced module ownership over their respective database schemas.
- Explicitly documented architectural debt in `docs/TECHNICAL_DEBT.md`.
