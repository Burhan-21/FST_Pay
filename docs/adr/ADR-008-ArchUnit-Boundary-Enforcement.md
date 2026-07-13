# ADR-008: Automated Architecture Verification with ArchUnit

## Status
Accepted

## Date
2026-07-13

## Context
As FST Pay grows in size and feature set, maintaining the intended architecture boundaries and layering rules becomes challenging. Without automated checks, developers may accidentally introduce cyclic dependencies, violate layer separation rules (e.g. controllers importing services or services importing controllers), or bypass module boundaries.

## Problem
How do we ensure that the architectural principles of FST Pay (like layer isolation and module separation) are consistently enforced and verified during development and CI?

## Decision
We integrated **ArchUnit** (`com.tngtech.archunit:archunit-junit5`) into the backend Maven test suite. We created `ArchitectureTest.java` to define and run architecture rules as standard unit tests during the Maven test phase.

## Rules Enforced
1. **No cyclic dependencies:** Slices matching `com.fstpay.(*)..` must be free of cycles (excluding known coupled packages like wallet, transaction, common, user, goal, and reward which are documented as technical debt).
2. **Controller Isolation:** Controllers must not be accessed by other layers (like services or repositories).
3. **No Service-to-Controller Dependencies:** Service classes must not import or depend on controller classes.
4. **Decoupled Domain Entities:** Domain entities must not depend on Spring MVC or servlet web packages.
5. **Restricted Cross-Module Repository Access:** Repositories must not be injected directly across feature modules. Allowed accesses are explicitly defined as rules, while others are exempted and cataloged as technical debt.

## Consequences
- Architectural violations fail the local build and CI pipeline immediately.
- Architectural consistency is continually verified without manual code review overhead.
- Developers get early feedback on boundary violations.
- Legacy violations are explicitly defined and cataloged, preventing new violations from slipping through.
