# FST Pay — Release Notes v0.6.0

FST Pay release `v0.6.0` focus is on E2E parent-teen supervision integration, API adapter contract alignment, performance optimizations (code-splitting), and test suite stabilization.

## Summary of Changes

### 1. Backend Service Layer
* **Resolved Lazy Loading Exception**: Configured `parent` and `child` associations inside `TransactionApproval.java` as `FetchType.EAGER` to prevent `LazyInitializationException: could not initialize proxy - no Session` during DTO mappings in the controller layer.
* **Parent-Child Link Lifecycle**: Fixed a unique constraint error in `ParentInvitationService.java` that blocked re-linking unlinked users; previous invitations are now reactivated and reset correctly.

### 2. Frontend & API Adapter Layer
* **Contract Adapter Alignment**: Resolved a request schema mismatch in the frontend `endpoints.ts` file. Deciding parent approvals now maps:
  * `decision: 'APPROVED' | 'REJECTED'` ➔ `approved: boolean`
  * `parentNote` ➔ `note`
  This aligns the frontend with the `@RequestBody ApprovalDecisionRequest` payload class in Spring Boot.
* **Code Splitting & Bundle Optimization**: Configured rollup rules in `vite.config.ts` to chunk heavy dependencies (`insights`, `parent`, `finance`, `admin`, `vendor-charts`, and `framer-motion`), reducing entrypoint load time and separating route logic.

### 3. Playwright & Vitest Quality Gates
* **Playwright Stabilizations**:
  * Added unique test descriptions in `supervision.spec.ts` to avoid strict-mode locator shifting bugs when testing with persistent databases.
  * Extracted parent onboarding invitation tokens directly from intercepted API requests instead of relying on DOM-scraping.
  * Increased Playwright test timeout from 30s to 60s to accommodate multi-user/multi-login flows.
  * Configured tests to run sequentially (`workers: 1`) to eliminate database locks.
* **Vitest Configuration**: Excluded the `tests` directory (Playwright spec files) in `vite.config.ts` to prevent Vitest from attempting to execute Playwright test blocks.

## Verification & Build Checklist

All release criteria checks passed successfully:
* **Backend Build & Test**: `mvn test` passed successfully (58/58 unit and integration tests).
* **Frontend Vitest**: `npm run test` passed successfully (33/33 unit tests).
* **Playwright E2E**: `npx playwright test` passed successfully (14/14 tests).
* **Production Compilation**: `npm run build` compiled successfully without TypeScript or rollup errors in 3.31s.
