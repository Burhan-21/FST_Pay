# ADR-003: Pluggable Transaction Rule Engine

## Status
Accepted

## Date
2026-07-07

## Context
When a teenager or student simulates a card transaction or transfer, multiple validation checks must run (e.g., sufficient wallet balance, active card status, daily/weekly/monthly limits, parent-restricted category controls, and parent approvals). Adding more conditions over time could result in massive, hard-to-maintain nested `if-else` blocks in `TransactionService`.

## Problem
How can we orchestrate financial validations cleanly and dynamically, allowing rules to be added, removed, or ordered without modifying the core transaction processing code?

## Decision
We implemented a **Pluggable Rule Engine Pattern**:
- Created a `TransactionRule` interface with `RuleEvaluationResult evaluate(User user, Wallet wallet, SimulateSpendRequest request)`.
- Implemented concrete rule classes (e.g., `BalanceRule`, `CardStatusRule`, `SpendingLimitRule`, `CategoryRestrictionRule`, `ApprovalRule`) as Spring Beans.
- Designed a `TransactionRuleEngine` that automatically injects all beans implementing `TransactionRule` (Spring's list injection) and iterates over them sequentially.
- If a parent pre-approved transaction exists (checked in `ApprovalRule`), it sets a bypass flag to skip subsequent spending limits and category restriction checks.

## Alternatives Considered
- **Procedural code in `TransactionService`:** Rejected due to poor maintainability, lack of testability of individual constraints, and risk of introducing side-effects during refactoring.

## Consequences
- Adding or removing validation rules requires writing/deleting a single class implementing `TransactionRule` with no changes to `TransactionService`.
- Individual rules can be unit-tested in isolation, simplifying quality assurance.
- The execution order of rules can be controlled via Spring `@Order` annotations if needed.

## Trade-offs
- Execution overhead is slightly increased due to multiple class method dispatches, but this is negligible in JVM (~microsecond range).
- Rule dependencies are resolved dynamically, which requires developers to be mindful of how rules interact (e.g., `ApprovalRule` bypassing limit rules).

## Future Considerations
- Allow dynamic rule loading or runtime database configuration of rule activation states.
