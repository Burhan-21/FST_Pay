# FST Pay Container & Deployment Security Specification

This document details the security model, secrets management, non-root user controls, network boundaries, TLS expectations, and image provenance for FST Pay.

---

## 1. Non-Root Container Security

All production container runtimes enforce unprivileged non-root execution:

- **Backend Container (`fstpay-backend`)**:
  - Executed as system user `appuser` (`UID 10001:10001`).
  - Read-only file system permissions with workspace directory ownership restricted to `/app`.
- **Frontend Container (`fstpay-frontend`)**:
  - Executed as unprivileged `nginx` user (`UID 101`).
  - Custom PID location `/var/run/nginx.pid` owned by `nginx` user to avoid privileged `/var/run` writes.

---

## 2. Secrets Management & Environment Isolation

- **Secret Handling Policy**: `.env` files containing actual passwords or API keys MUST NEVER be committed to Git repositories.
- **Environment Ingestion**: Secrets are passed dynamically via environment variables (`JWT_SECRET`, `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `GEMINI_API_KEY`) at container runtime.
- **Startup Validation**: `StartupEnvironmentValidator` verifies that production secrets satisfy length and format requirements and rejects default placeholder values.

---

## 3. Network Boundaries & TLS Expectations

- **Isolated Bridge Network**: All container-to-container communication occurs over `fstpay-network`.
- **TLS Termination**: HTTPS termination occurs at the reverse proxy (Nginx or Cloudflare Tunnel) with modern cipher suites (`TLSv1.2` / `TLSv1.3`).
- **Header Enforcement**: Standard security headers (`HSTS`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) are applied at the Nginx edge layer.

---

## 4. Image Provenance & OCI Labels

All built container images embed standard OCI metadata labels:
- `org.opencontainers.image.title`
- `org.opencontainers.image.description`
- `org.opencontainers.image.version`
- `org.opencontainers.image.vendor`
- `org.opencontainers.image.licenses`
- `org.opencontainers.image.source`
