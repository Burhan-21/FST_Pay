## Description
Please describe the changes proposed in this Pull Request, including the problem addressed and the solution implemented.

Linked Issue: Fixes #

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Code refactoring / Architectural cleanup (non-breaking)
- [ ] CI/CD or build environment updates

## PR Quality Checklist
Before submitting this PR, please confirm the following:

### Architectural Discipline
- [ ] No cyclic dependencies introduced (verified via local ArchUnit execution).
- [ ] Module boundaries respected (residing inside bounded context scope, direct cross-repository calls avoided).
- [ ] Bounded context public interface contract utilized for external communication.
- [ ] Architectural Decision Records (ADRs) updated or created if high-level changes were introduced.

### Database & Event Evolution
- [ ] Database migrations (Flyway) included and syntax verified for PostgreSQL.
- [ ] Event schemas evolved in a backward-compatible manner (no required field deletions, only optional additions).
- [ ] Event schema version identifier bumped correctly if payload modified.

### Verification & Logging
- [ ] All unit, integration, and ArchUnit tests pass successfully locally (`mvn test`).
- [ ] Playwright E2E verification test suite executes and passes.
- [ ] Coverage requirements met (JaCoCo/Vitest metrics).
- [ ] Logging utilizes structured MDC variables and guarantees cleanup in `finally` blocks (no thread-local leaks).
- [ ] OpenTelemetry spans instrumented for critical boundary crossing.

## Screenshots / Trace Visualizations (If applicable)
*Attach Jaeger trace graphs or UI previews verifying execution.*
