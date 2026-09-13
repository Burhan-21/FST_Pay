# Engineering & Coding Standards — FST Pay

> **Document Version**: 2.0.0  
> **Status**: Active & Mandatory  
> **Applicability**: All commits, pull requests, and automated agent modifications.  

---

## 1. Core Architectural & Design Philosophy

1. **YAGNI (You Aren't Gonna Need It)**: Do not write code for speculative future requirements. Build the simplest thing that satisfies the current user story.
2. **KISS & Ponytail Principle**: Boring code beats clever code. Standard library and native platform features trump external libraries every time. Shortest working diff wins.
3. **Single Responsibility Principle (SRP)**: Each class, component, and module must have one, and only one, reason to change.
4. **Interface Segregation**: Clients should not be forced to depend on methods they do not use. Cross-module boundaries in the backend must depend on narrow `*Contract` interfaces.

---

## 2. Backend (Java & Spring Boot) Standards

### Language & Framework
- Target: **Java 17+** | **Spring Boot 3.3.6**
- Build: **Maven 3.9+**

### Code Formatting & Idioms
- **Immutability by Default**: Mark fields `private final`. Use constructor injection via Lombok `@RequiredArgsConstructor` or explicit constructors. Never use field injection (`@Autowired` on fields).
- **Package-Private Encapsulation**: Domain repositories, internal helper services, and internal entity mappers should be package-private (no `public` modifier) to prevent external package leakage.
- **DTOs & Contracts**:
  - Request and response DTOs must use Java `record` or Lombok `@Value` / `@Builder`.
  - Use `jakarta.validation.constraints` (`@NotNull`, `@NotBlank`, `@Size`, `@Min`) on all inbound request DTOs.
- **Exceptions & Error Handling**:
  - Throw domain-specific exceptions extending `com.fstpay.common.exception.ApiException`.
  - Never catch `Exception` or `Throwable` and swallow it. Always log with contextual metadata or rethrow.
- **Database & Transactions**:
  - Explicit `@Transactional(readOnly = true)` on query methods.
  - Financial balance mutations MUST specify `@Transactional` with isolation level and pessimistic lock if concurrent updates are possible.

---

## 3. Frontend (React & TypeScript) Standards

### Language & Framework
- Target: **React 19** | **TypeScript 5.8+** | **Vite 8** | **Tailwind CSS 3.4+**

### Code Conventions
- **Strict Typing**: `noImplicitAny` and `strictNullChecks` are strictly enforced. Never use `any`; use `unknown` with type guards or define explicit interfaces.
- **Functional Components**: Use arrow or standard functions. Never use React class components.
- **Custom Hooks**: Encapsulate non-trivial state and side-effects into `use<Feature>` hooks under `frontend/src/hooks/`.
- **Styling**:
  - Use Tailwind utility classes mapped to design tokens defined in `design/tokens.md`.
  - Do not write arbitrary magic hex codes (e.g. avoid `bg-[#123456]`); use theme tokens (e.g. `bg-primary`, `bg-cardBg`).
  - Support light, dark, and AMOLED modes seamlessly.
- **Data Fetching**:
  - Use TanStack Query (`useQuery`, `useMutation`).
  - Never perform raw `fetch` or `axios` calls directly inside UI component bodies without a query hook or service abstraction.

---

## 4. Git & Version Control Conventions

### Conventional Commits
All commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <short description in imperative mood>

[optional body describing rationale]

[optional footer with breaking changes or issue links]
```

#### Allowed Types:
- `feat`: A new user-facing feature.
- `fix`: A bug fix.
- `docs`: Documentation updates only.
- `style`: Formatting changes that do not affect code logic.
- `refactor`: Code restructuring without changing functional behavior.
- `test`: Adding or modifying tests.
- `chore`: Tooling, build scripts, dependency updates.

### Branch Naming Patterns
- Feature branch: `feat/<module>-<description>` (e.g., `feat/wallet-upi-topup`)
- Bugfix branch: `fix/<module>-<description>` (e.g., `fix/auth-otp-timeout`)
- Hotfix branch: `hotfix/<description>`

---

## 5. Pull Request & Code Review Criteria

Before any pull request can be merged:
1. [ ] **Automated Tests**: Backend tests (`mvn test`) and frontend tests (`npm run test`) must pass with 100% success.
2. [ ] **Architecture Checks**: ArchUnit tests must pass with zero illegal module boundary violations.
3. [ ] **Build Verification**: Frontend production build (`npm run build`) must succeed with zero TypeScript errors.
4. [ ] **Security**: No secrets or hardcoded passwords committed.
5. [ ] **Review**: At least one senior peer review or principal sign-off required.
