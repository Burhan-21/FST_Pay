# Render Deployment Guide — FST Pay Backend & Infrastructure

This guide details deploying the **FST Pay** backend services, PostgreSQL database, and Redis cache on **Render** using Blueprint Infrastructure as Code.

---

## 1. Blueprint Architecture

The repository contains `render.yaml` which automatically provisions:
1. **Managed PostgreSQL Database** (`fstpay-postgres`): Dedicated relational storage for user accounts, wallets, virtual cards, transactions, and the transactional outbox table.
2. **Managed Redis Cache** (`fstpay-redis`): Dedicated in-memory cache for fast OTP validation, rate-limiting counters, and session states.
3. **Web Service** (`fstpay-backend`): Multi-stage Docker container (`backend/Dockerfile`) running Spring Boot 3.3.6 on JDK 17.

---

## 2. Setting Up on Render

### Step 1: Connect Git Repository
1. Go to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → **Blueprint**.
3. Select your repository `NexusForge21/FST_Pay`.
4. Render will scan the repository and detect `render.yaml`.

### Step 2: Configure Secrets
Render will automatically generate:
- `JWT_SECRET`
- `ADMIN_PASSWORD`
- `SPRING_DATASOURCE_URL` (linked from the provisioned database)
- `SPRING_REDIS_HOST` & `SPRING_REDIS_PORT` (linked from the provisioned Redis)

Prompted secrets to supply in the Render dashboard:
- `MAIL_USERNAME`: Your transactional SMTP username (e.g. Gmail or SendGrid).
- `MAIL_PASSWORD`: Application password for SMTP.
- `RECAPTCHA_SECRET_KEY`: Google reCAPTCHA v2 secret key.
- `GEMINI_API_KEY`: Google Gemini API key for the AI Financial Coach.

### Step 3: Apply Blueprint
Click **Apply**. Render will:
1. Provision the database and wait for readiness.
2. Provision Redis.
3. Build the backend Docker image using multi-stage Spring Boot layertools.
4. Launch the web service and start health checks against `/actuator/health`.

---

## 3. Connecting Frontend on Vercel to Render

1. Note your Render backend URL: `https://fstpay-backend.onrender.com`.
2. In your **Vercel Dashboard** under your frontend project settings:
   - Set `VITE_API_URL` to `https://fstpay-backend.onrender.com/api/v1`.
3. In `render.yaml` or Render dashboard environment settings:
   - Ensure `CORS_ALLOWED_ORIGINS` includes your Vercel URL (e.g., `https://fst-pay.vercel.app`).
4. Trigger a frontend deployment on Vercel.

---

## 4. Operational Monitoring & Health Checks

- **Health Probe**: `https://fstpay-backend.onrender.com/actuator/health`
- **Swagger Documentation**: `https://fstpay-backend.onrender.com/swagger-ui.html`
- **Liveness Probe**: Render checks `/actuator/health` every 10 seconds.
- **Log Streaming**: View live logs directly in the Render dashboard or pipe to Datadog/Logstash via the structured JSON output format.
