# Architecture Metrics

This document tracks quantitative metrics evaluating the modular structure, coupling, and architectural integrity of the FST Pay codebase over time.

| Metric | Baseline (v0.7.1-sprint-1) | Sprint 2 (v0.7.1-sprint-2) | Target (End of v0.7.x) | Notes / Details |
| :--- | :---: | :---: | :---: | :--- |
| **Modules** | 14 | 14 | 14 | Core and business packages under `com.fstpay`. |
| **ArchUnit Rules** | 5 | 7 | 10 | Rules checking layers, package cycles, and module access boundaries. |
| **ADRs** | 9 | 10 | 15+ | Architecture Decision Records documented in `docs/adr/`. |
| **Cross-Module Repository Injections** | 15 | 15 | 0 | Direct injection of one module's repository into another's classes. |
| **Cyclic Dependencies** | 2 | 2 | 0 | Package cycle groups (wallet-transaction, goal-reward). |
| **Technical Debt Items** | 10 | 10 | < 3 | Unresolved items tracked in `docs/TECHNICAL_DEBT.md`. |
| **Modules Exposing Public APIs** | 0 | 2 | 9 | Number of business modules exporting clean, interface-based public APIs. |
| **Modules Compliant with API-Only Access** | 0 | 2 | 9 | Number of business modules where ArchUnit strictly enforces API-only access. |

---

## Detailed Metric Breakdown

### Bounded Modules (14)
`admin`, `aicoach`, `analytics`, `audit`, `auth`, `card`, `goal`, `notification`, `parent`, `report`, `reward`, `transaction`, `user`, `wallet`.

### Active ArchUnit Rules (7)
1. `no_cyclic_dependencies` (verifying slices are cycle-free)
2. `controllers_should_not_be_accessed_by_other_layers`
3. `services_should_not_depend_on_controllers` (updated to check `..application..` as well)
4. `domain_entities_must_not_depend_on_web_packages`
5. `repositories_should_not_be_accessed_across_modules`
6. `wallet_application_should_not_be_accessed_by_other_modules` [NEW]
7. `card_application_should_not_be_accessed_by_other_modules` [NEW]

### Public API Interfaces (3)
1. `com.fstpay.wallet.api.WalletOperations`
2. `com.fstpay.wallet.api.WalletDailySummaryOperations`
3. `com.fstpay.card.api.VirtualCardOperations`

### Cross-Module Repository Injections (15)
- `wallet` module -> `TransactionRepository` (1)
- `transaction` module -> `WalletRepository` (1)
- `parent` module -> `VirtualCardRepository` (1), `NotificationRepository` (1), `WalletGoalRepository` (1)
- `analytics` module -> `UserRepository` (1), `WalletRepository` (1), `TransactionRepository` (1), `VirtualCardRepository` (1), `RewardPointsRepository` (1)
- `aicoach` module -> `WalletGoalRepository` (1), `RewardPointsRepository` (1)
- `reward` module -> `WalletGoalRepository` (1)
- `admin` module -> `VirtualCardRepository` (1)
- `parent` module (approval processor) -> `VirtualCardRepository` (1)
