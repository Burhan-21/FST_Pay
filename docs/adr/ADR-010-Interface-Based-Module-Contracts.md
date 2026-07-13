# ADR-010: Interface-Based Module Contracts

## Status
Accepted

## Date
2026-07-13

## Context
In ADR-009, we defined a Module Boundary Strategy restricting direct access to other modules' repositories and promoting public services/facades. However, even when calling services, client modules remained coupled to concrete implementation classes (e.g., `WalletService`, `VirtualCardService`). This direct coupling makes it hard to swap implementations (e.g., mock implementations in tests or proxy implementations calling microservices over HTTP/gRPC).

## Problem
Allowing other modules to directly depend on concrete service classes exposes internal implementation details (e.g., private utility methods, transactional behaviors) and prevents complete encapsulation. We need a way to define explicit, stable, interface-based public contracts for each module.

## Decision
We adopted **Interface-Based Module Contracts** across FST Pay modules:
1. **Public API Package (`.api`):** Every module exposes its public operations through interfaces in a `.api` package (e.g., `com.fstpay.wallet.api.WalletOperations`, `com.fstpay.card.api.VirtualCardOperations`).
2. **Encapsulated Application Package (`.application`):** Concrete services are moved to a `.application` package (e.g., `com.fstpay.wallet.application.WalletService`) and implement the corresponding `.api` interface.
3. **Dependency Inversion:** Consumer modules must inject the `.api.*Operations` interfaces instead of the concrete `.application.*` service classes.
4. **Automated Enforcement (ArchUnit):** We configured ArchUnit rules to ensure that classes outside a module must only reference types in `com.fstpay.<module>.api..` (or DTOs/entities), and never directly import or depend on classes in `com.fstpay.<module>.application..`.

## Consequences
- **Loose Coupling:** Modules depend only on abstract interface-based contracts, hiding the implementation details.
- **Microservices Ready:** Concrete implementations can be replaced with remote client stubs (e.g., WebClient or Feign Client) without modifying consumer code.
- **Enhanced Testability:** It is easier to write mock implementations or stubs for external module dependencies.
- **Enforced Encapsulation:** Violation of public contracts is caught automatically at build time by ArchUnit.
