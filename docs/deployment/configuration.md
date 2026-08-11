# FST Pay Configuration Reference

This guide details all environment configuration keys, validation rules, default values, and profile behaviors.

---

## 1. Master Configuration Parameter Table

| Property Name | Required | Min Length / Format | Default Value | Description |
| :--- | :--- | :--- | :--- | :--- |
| `SPRING_PROFILES_ACTIVE` | Yes | `dev` / `prod` / `test` | `prod` | Active Spring profile |
| `POSTGRES_PASSWORD` | Yes | Non-blank | - | Database master password |
| `SPRING_DATASOURCE_URL` | Yes | `jdbc:postgresql://...` | - | Database connection URL |
| `JWT_SECRET` | Yes | ≥ 32 chars, no placeholders | - | Secret key used for signing JWT tokens |
| `CORS_ALLOWED_ORIGINS` | Yes | No `*` in prod | `http://localhost:5173` | Allowed CORS origins (comma-separated) |
| `SPRING_REDIS_HOST` | Yes | Non-blank | `fstpay-redis` | Redis server hostname |
| `KAFKA_BOOTSTRAP_SERVERS` | No | Host:Port | `fstpay-kafka:9092` | Kafka broker endpoints |
| `AI_PROVIDER` | No | `gemini` / `openai` | `gemini` | Financial AI Coach provider |
| `GEMINI_API_KEY` | No | API key format | - | Google Gemini AI API key |

---

## 2. Startup Fail-Fast Validation Rules

The `StartupEnvironmentValidator` executes automatically when the application starts under non-test profiles (`prod` / `dev`).

Validation Failures Trigger:
1. `JWT_SECRET` missing, length < 32 characters, or matching placeholder string (`changeme`, `placeholder`, `your_secret_here`, `Admin@Secure123`).
2. `SPRING_DATASOURCE_URL` missing or not starting with `jdbc:postgresql://` or `jdbc:h2:`.
3. `CORS_ALLOWED_ORIGINS` containing `*` wildcard when running in `prod` profile.
4. `SPRING_REDIS_HOST` missing or blank.

When a violation occurs, the application logs a structured error block and terminates with `IllegalStateException`.
