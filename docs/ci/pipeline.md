# CI/CD Pipeline Architecture & Governance

This document describes the structure, execution logic, and verification rules of the automated continuous integration and delivery (CI/CD) pipelines for the FST Pay platform.

---

## 1. Pipeline Design Goals

The CI/CD system enforces strict quality gates on code merges to ensure that feature work preserves the system's modularity, safety, and correctness:
- **Build Isolation:** Backend and frontend pipelines run independently to ensure rapid developer feedback.
- **Modularity & DRY:** Shared setup steps are extracted into a single **Reusable Workflow**.
- **Immutable Releases:** The release process does not write commits back to the Git history, eliminating version-bumping merge conflicts.
- **Executable Guardrails:** Unit, integration, ArchUnit, Vitest, and Playwright tests execute automatically on pull requests.
- **Resource Conservation:** Duplicate triggers on identical branches cancel older active runs automatically.

---

## 2. Pipeline Layout

```
.github/workflows/
├── reusable-build.yml       # Centralized cached compile, test & package job
├── backend.yml              # Backend PR gate (calls reusable-build)
├── frontend.yml             # Frontend & E2E PR gate (calls reusable-build + runs Playwright)
└── release.yml              # Tag-based release, Docker compile, compose up verification
```

---

## 3. Workflow Specifications

### A. Reusable Build Workflow (`reusable-build.yml`)
Centralizes compilation, dependency resolution, testing, and security analysis.
- **JDK Matrix Testing:** Spans both **Java 17** (primary runtime) and **Java 21** to verify forward environment compatibility.
- **Dependency Caching:**
  - Maven repository cache saved to `~/.m2/repository`.
  - Node modules package cache saved to `~/.npm`.
- **Security Check Stage (Informational):**
  - **Backend:** Executes OWASP Dependency-Check plugin checking for known vulnerabilities.
  - **Frontend:** Executes `npm audit` checking NPM dependency trees.
- **Artifact Archiving:** Packages and uploads compiled JARs, frontend production bundles (`dist/`), JaCoCo XML/HTML coverage directories, and Surefire test reports.

### B. Backend Pipeline (`backend.yml`)
Triggered by changes to the `/backend` folder.
- Configured with `concurrency` set to `cancel-in-progress: true` to prevent resource waste.
- Invokes `reusable-build.yml` with `run-backend: true`.

### C. Frontend & E2E Pipeline (`frontend.yml`)
Triggered by changes to `/frontend` or `/backend`.
- Runs Vitest component tests and bundles production assets.
- Executes **Playwright E2E Tests**:
  1. Spins up isolated runner containers for PostgreSQL (`5434:5432`) and Redis (`6380:6379`).
  2. Downloads the compiled JAR artifact.
  3. Serves the backend application jar in the background under the `test` profile.
  4. Executes a port-listening check (`nc -z localhost 8080`) followed by an Actuator endpoint health check (`curl -s .../actuator/health`).
  5. Starts the Vite dev server (`http://localhost:5173`) in the background.
  6. Installs Playwright system browser runtimes (`chromium`).
  7. Runs the Playwright test suite and records screenshots/traces on failure.

### D. Release Pipeline (`release.yml`)
Triggered when a SemVer tag (e.g. `v1.2.0`) is pushed to the repository.
- **Docker Multi-Image Compilation:** Builds backend (`fstpay-backend:<version>`) and frontend (`fstpay-frontend:<version>`) Docker images.
- **Docker Compose Verification:**
  - Validates `docker compose config`.
  - Spins up the Kafka, Kafka UI, and Jaeger stack (`docker compose up -d`).
  - Stabilizes and asserts that no service container exited in error state.
  - Tears down the stack cleanly (`docker compose down -v`).
- **GitHub Release Creation:** Automatically drafts and publishes a GitHub Release under the pushed tag name, attaching the verified Docker build metadata.

---

## 4. Pull Request Quality Checklist

All pull requests to `main` must fulfill the checks specified in the `pull_request_template.md` checklist:
1. **ArchUnit Compliance:** No package cycles, proper module isolation.
2. **Backward Event Compatibility:** Payload additions must be optional.
3. **Database Migrations:** SQL migrations tested against clean PostgreSQL instances.
4. **MDC Thread Safety:** Diagnostic contexts cleaned up in execution blocks.
