# Vercel Deployment Guide — FST Pay Frontend

This guide outlines the production deployment of the **FST Pay** React 19 single-page application (SPA) to **Vercel**.

---

## 1. Architecture Overview

- **Framework**: Vite 8 + React 19 + TypeScript
- **Styling**: Tailwind CSS with custom HSL/RGB design tokens
- **Routing**: React Router v7 with Client-side History API (`vercel.json` rewrite to `/index.html`)
- **API Target**: Render Backend (`https://fstpay-backend.onrender.com/api/v1` or custom domain)
- **CDN / Edge**: Globally distributed static edge caching with immutable asset hashing

---

## 2. Vercel Project Configuration

### Via Vercel Dashboard
1. Go to [vercel.com](https://vercel.com) and click **Add New...** → **Project**.
2. Connect your Git repository (`NexusForge21/FST_Pay`).
3. Set **Root Directory** to `frontend`.
4. Vercel will auto-detect **Vite**:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Required Environment Variables

| Variable | Description | Example / Default |
|----------|-------------|-------------------|
| `VITE_API_URL` | Base URL for the Spring Boot backend API | `https://fstpay-backend.onrender.com/api/v1` |
| `VITE_RECAPTCHA_SITE_KEY` | Google reCAPTCHA v2 / v3 public site key | `6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI` |

> [!NOTE]
> All Vite environment variables MUST start with `VITE_` to be embedded at client build time.

---

## 3. Production Edge Security & Headers

The `vercel.json` configuration automatically applies the following security headers:
- `X-Frame-Options: DENY` — Prevents clickjacking.
- `X-Content-Type-Options: nosniff` — Prevents MIME-sniffing.
- `Referrer-Policy: strict-origin-when-cross-origin` — Protects user privacy during external navigation.
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` — Locks down browser hardware APIs.
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` — Enforces HTTPS.
- `Cache-Control: public, max-age=31536000, immutable` — Applied to `/assets/*` for cache efficiency.

---

## 4. Deploying via Vercel CLI (Optional)

```bash
# Install Vercel CLI
npm install -g vercel

# Link and deploy from frontend directory
cd frontend
vercel --prod
```

---

## 5. Verification & Health Check

1. Access the deployed Vercel URL (e.g. `https://fst-pay.vercel.app`).
2. Verify page transitions, OTP email dispatch triggers, and virtual card animations.
3. Open Browser DevTools Network tab:
   - Confirm API calls go to your Render backend domain.
   - Confirm response headers include all security headers defined in `vercel.json`.
