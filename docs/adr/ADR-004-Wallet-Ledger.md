# ADR-004: Wallet Ledger & Double-Entry Transfers

## Status
Accepted

## Date
2026-07-07

## Context
In parent-teen financial management, pocket money is transferred from a parent to a teenager. In initial designs, money could be simulated by simply adding balance to a child's wallet without subtracting it from anywhere (creating money from "thin air").

## Problem
How do we model money movement in FST Pay to maintain financial auditability, prevent fraud, and build a system that can integrate with real bank ledgers?

## Decision
We implemented a **Double-Entry Ledger Pattern**:
- Every pocket money transfer requires both a parent's wallet and a child's wallet to exist.
- Transfers are executed as an atomic database transaction:
  - Subtract amount from Parent's Wallet (`DEBIT` transaction record).
  - Add amount to Child's Wallet (`CREDIT` transaction record).
  - Generate a shared parent-child reference ID (`TXN-REF-...`) linking both records.
- Wallet entities use JPA `@Version` optimistic locking to prevent race conditions (double-spend exploits) during concurrent transfers or card simulations.

## Alternatives Considered
- **Virtual Credit Increments:** Rejected because it lacks audit trails, allows virtual cash creation, and is unsuitable for a real fintech MVP.

## Consequences
- The system maintains a complete audit trail where every rupee matches a debit and credit action.
- Optimistic locking prevents double-spend issues without the database bottleneck of pessimistic locks.
- Prepares FST Pay for integration with actual UPI, banking APIs, or credit card networks.

## Trade-offs
- Relies on optimistic locking, which throws exceptions on concurrent updates. The application layer must handle these conflicts gracefully by prompting the user or retrying the operation.

## Future Considerations
- Introduce a full ledger journal table to explicitly track multi-ledger accounting entries.
- Add wallet statement PDF generators for parents and teens.
