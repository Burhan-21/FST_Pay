# FST Pay — Frontend Specification v1.0

**Document ID:** FST-FE-2026-Q2
**Version:** 1.0
**Date:** June 17, 2026
**Owner:** Frontend Architect
**Status:** READY FOR ENGINEERING

---

## EXECUTIVE SUMMARY

FST Pay's frontend is a modern React 19 SPA built with TypeScript 6.0, Vite 8, and TailwindCSS 3. It delivers a premium, gaming-inspired fintech experience with dark/light mode, glassmorphism/claymorphism design language, and full responsive support across mobile, tablet, and desktop.

**Stack:**
- React 19.2.6 + TypeScript 6.0
- Vite 8.0
- TailwindCSS 3.4.19
- React Router v7.17
- TanStack React Query 5.101
- Recharts 3.8
- Axios 1.17 + JWT interceptor
- Lucide React icons
- reCAPTCHA v3

---

## DESIGN SYSTEM

### 1. COLOR PALETTE

| Token | Hex (Dark) | Hex (Light) | Usage |
|-------|-----------|-------------|-------|
| `primary-50` | `#eef2ff` | `#eef2ff` | Lightest bg |
| `primary-500` | `#6366f1` | `#6366f1` | Main brand (Indigo) |
| `primary-600` | `#4f46e5` | `#4f46e5` | Buttons, active states |
| `primary-700` | `#4338ca` | `#4338ca` | Hover states |
| `accent-500` | `#10b981` | `#10b981` | Success, positive (Emerald) |
| `accent-600` | `#059669` | `#059669` | Accent hover |
| `surface-50` | — | `#f8fafc` | Light page bg |
| `surface-800` | `#1e293b` | — | Dark card bg |
| `surface-900` | `#0f172a` | — | Dark sidebar bg |
| `surface-950` | `#020617` | — | Dark page bg |
| `danger-500` | `#ef4444` | `#ef4444` | Errors, delete |
| `warning-500` | `#f59e0b` | `#f59e0b` | Alerts, cautions |

### 2. TYPOGRAPHY

| Family | Weight | Usage |
|--------|--------|-------|
| **Inter** | 300-800 | Body text, UI elements |
| **Outfit** | 400-800 | Display, headings, titles |
| **Deltha** | 400 | Brand logotype, uppercase tracking |
| **JetBrains Mono** | 400-500 | Code, monetary values |

**Type Scale:**
```
xs: 0.75rem (12px)  — Badges, metadata
sm: 0.875rem (14px) — Body text, nav
base: 1rem (16px)   — Paragraphs
lg: 1.125rem (18px) — Card titles
xl: 1.25rem (20px)  — Section headings
2xl: 1.5rem (24px)  — Page headings
3xl+: 1.875rem+     — Hero, dashboards
```

### 3. SPACING

4px base unit. TailwindCSS defaults:
- `p-4` = 16px (card padding)
- `p-6` = 24px (section padding)
- `gap-3` = 12px (element gaps)
- `gap-4` = 16px (component gaps)
- `gap-6` = 24px (section gaps)

### 4. BORDER RADIUS

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-xl` | 12px | Buttons, inputs, cards |
| `rounded-2xl` | 16px | Glass cards, modals |
| `rounded-3xl` | 24px | Hero cards, balance cards |

### 5. SHADOWS

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-card` | `0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)` | Default cards |
| `shadow-card-hover` | `0 4px 12px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.06)` | Card hover |
| `shadow-glow` | `0 0 20px rgba(99, 102, 241, 0.15)` | Glowing elements |
| `shadow-glow-lg` | `0 0 40px rgba(99, 102, 241, 0.2)` | Hero sections |

### 6. ANIMATIONS

| Name | Duration | Easing | Usage |
|------|----------|--------|-------|
| `fade-in` | 500ms | ease-out | Page transitions |
| `slide-up` | 500ms | ease-out | Card reveal |
| `slide-in-right` | 300ms | ease-out | Modal/drawer |
| `float` | 6s | ease-in-out | Background blobs |
| `pulse-slow` | 3s | infinite | Skeleton loaders |
| `shimmer` | 2s | linear | Loading skeletons |

---

## COMPONENT ARCHITECTURE

### 1. LAYOUT COMPONENTS

```
AppLayout
├── Sidebar          — Fixed left nav (desktop), overlay (mobile)
├── Navbar           — Sticky top bar with search, theme, notifications
├── CommandPalette   — Cmd+K quick search overlay
└── <Outlet />       — Page content
```

**Sidebar States:**
- **Desktop (lg+)**: Always visible, `w-72`
- **Mobile/Tablet**: Hidden off-screen, triggered by hamburger
- **Overlay**: Backdrop blur when open on mobile

**Navbar:**
- Sticky at top, `h-16`
- Blur backdrop (`backdrop-blur-xl`)
- Contains: menu toggle, page title, search, theme toggle, notifications, avatar

### 2. PAGE COMPONENTS

| Route | Component | Data Source |
|-------|-----------|-------------|
| `/login` | `Login.tsx` | authApi.login |
| `/register` | `Register.tsx` | authApi.register |
| `/dashboard` | `Dashboard.tsx` | walletApi, txnApi, rewardsApi, analyticsApi |
| `/wallet` | `WalletPage.tsx` | walletApi, transactionApi |
| `/cards` | `CardsPage.tsx` | cardApi |
| `/transactions` | `TransactionsPage.tsx` | transactionApi |
| `/analytics` | `AnalyticsPage.tsx` | analyticsApi |
| `/ai-coach` | `AiCoachPage.tsx` | aiApi.chat |
| `/rewards` | `RewardsPage.tsx` | rewardsApi |
| `/settings` | `SettingsPage.tsx` | userApi |
| `/admin` | `AdminPage.tsx` | authApi.getStats |

### 3. COMMON PATTERNS

**Loading State:**
- Full-page: Centered `Loader2` spinner with text
- Section: Skeleton shimmer cards matching content shape
- Button: Spinner replaces icon, button disabled

**Empty State:**
- Icon + message + optional CTA button
- Example: "No cards yet. Create your first virtual card."

**Error State:**
- Toast notification for API errors
- Inline error text for form validation
- Fallback UI for failed data loads (show cached/default data)

**Form Validation:**
- Real-time validation on blur
- Debounced input parsing for monetary values
- Visual feedback: red border + error text
- Disabled submit until valid

---

## DATA FLOW

### 1. STATE MANAGEMENT

**Auth State** — React Context (`AuthContext.tsx`)
- `user`, `isAuthenticated`, `isLoading`
- Methods: `login()`, `register()`, `verifyOtp()`, `logout()`, `refreshProfile()`
- JWT stored in `localStorage` (`fst_access_token`, `fst_refresh_token`)

**Theme State** — React Context (`ThemeContext.tsx`)
- `theme` (light/dark), `toggleTheme()`
- Persisted to `localStorage`
- Applied via Tailwind `dark` class on `<html>`

**Server State** — Direct API calls in useEffect (MVP pattern)
- Future: Migrate to TanStack React Query for caching, refetch, pagination

### 2. API LAYER

```
axios.ts (Axios Instance)
├── baseURL: VITE_API_URL || http://localhost:8080/api/v1
├── Request Interceptor → Attach Bearer JWT token
└── Response Interceptor → Handle 401 → Refresh token → Retry queue
```

**JWT Refresh Flow:**
1. Request returns 401
2. If not already refreshing: set `isRefreshing=true`, POST `/auth/refresh`
3. If already refreshing: queue request in `failedQueue[]`
4. On refresh success: update tokens, `processQueue()`, retry original request
5. On refresh failure: clear tokens, redirect to `/login`

### 3. TYPE SYSTEM

All API contracts typed in `types/index.ts`:

| Interface | Fields |
|-----------|--------|
| `User` | id, email, fullName, phone, dob, role, parental fields |
| `Wallet` | id, balance, currency, isActive |
| `VirtualCard` | id, cardNumber (masked), status, limits, design |
| `Transaction` | id, type, category, amount, merchant, status |
| `Analytics` | totals, spendingByCategory, topMerchants |
| `RewardPoints` | points, streakDays |
| `AiSession` | prompt, response |
| `ApiResponse<T>` | success, message, data, timestamp |
| `PagedResponse<T>` | content, page, size, totalElements, totalPages |

---

## RESPONSIVE BREAKPOINTS

| Breakpoint | Width | Layout |
|------------|-------|--------|
| **Mobile** | < 640px | Single column, bottom nav (future), hamburger menu |
| **Tablet** | 640-1023px | 2-column grids, sidebar hidden by default |
| **Desktop** | 1024px+ | 3+ column grids, sidebar always visible |
| **Wide** | 1280px+ | Max-width 1280px content, full sidebar |

**Responsive Patterns:**
- Dashboard stat cards: 1 col (mobile) → 2 col (tablet) → 4 col (desktop)
- Analytics charts: 1 col (mobile/tablet) → 2 col (desktop)
- Transaction table: Card list (mobile) → Full table (desktop)
- Form dialogs: Full screen (mobile) → Modal/Sheet (desktop)

---

## ACCESSIBILITY (WCAG 2.1 AA)

### Standards
- All interactive elements keyboard-accessible
- Focus indicators visible (`focus:ring-2`)
- ARIA labels on icon-only buttons
- Color contrast ratio ≥ 4.5:1 for text
- Semantic HTML order maintained
- `prefers-reduced-motion` respected (future)

### Current Implementation
- `aria-label` on theme toggle, menu buttons
- `role="alert"` on error messages
- Skip-to-content link (future)
- Tab order follows visual order

---

## PERFORMANCE BUDGETS

| Metric | Target |
|--------|--------|
| First Contentful Paint (FCP) | < 1.5s |
| Largest Contentful Paint (LCP) | < 2.5s |
| Time to Interactive (TTI) | < 3.0s |
| Bundle Size (initial) | < 200KB JS |
| Lighthouse Score | > 90 |
| API Response Time | < 500ms p95 |

### Optimizations (MVP)
- Lazy route loading via React.lazy (future)
- Asset optimization via Vite (built-in)
- Image lazy loading (`loading="lazy"`)
- Debounced search inputs
- Memoized component rendering where needed

---

## ERROR HANDLING

### API Errors
```typescript
// Standardized error response shape
{
  success: false,
  message: "Human-readable error",
  data: null,
  timestamp: "2026-06-17T..."
}
```

### UI Error States
1. **Network error**: "Unable to connect. Check your internet connection."
2. **Auth error**: Redirect to login, show toast
3. **Validation error**: Inline below field
4. **Server error**: "Something went wrong. Please try again."
5. **Rate limit error**: "Too many requests. Please wait."

### Logging
- `console.error` for all caught errors (dev)
- Structured error context: `console.error('Operation failed:', { feature, action, error })`
- No sensitive data in logs (passwords, tokens, PII)

---

## SECURITY

### Implemented
- JWT stored in localStorage (access + refresh)
- HTTP-only cookies for refresh (future enhancement)
- reCAPTCHA v3 on login/register
- Input sanitization on all form fields
- XSS prevention via React's built-in escaping

### Header Recommendations (Backend)
```
Content-Security-Policy: default-src 'self'; script-src 'self' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com https://db.onlinewebfonts.com; img-src 'self' data:; connect-src 'self' http://localhost:8080
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
```

---

## ENVIRONMENT CONFIGURATION

```env
# .env (frontend)
VITE_API_URL=http://localhost:8080/api/v1
VITE_RECAPTCHA_SITE_KEY=your_site_key
VITE_APP_NAME=FST Pay
VITE_APP_VERSION=1.0.0
```

---

## ROUTING

```typescript
<Routes>
  /login              → Login (public)
  /register           → Register (public)
  /dashboard          → Dashboard (auth)
  /wallet             → WalletPage (auth)
  /cards              → CardsPage (auth)
  /transactions       → TransactionsPage (auth)
  /analytics          → AnalyticsPage (auth)
  /ai-coach           → AiCoachPage (auth)
  /rewards            → RewardsPage (auth)
  /settings           → SettingsPage (auth)
  /admin              → AdminPage (auth + ADMIN role)
  /                   → Redirect to /dashboard
  *                   → Redirect to /dashboard
</Routes>
```

Protected via `ProtectedRoute` wrapper:
- Checks `isAuthenticated` from AuthContext
- Loading screen while auth state resolves
- Redirect to `/login` if unauthenticated
- Role check for `/admin` (requires ADMIN role)

---

## FOLDER STRUCTURE

```
src/
├── api/
│   ├── axios.ts              # Axios instance + interceptors
│   └── endpoints.ts          # All API endpoint functions
├── assets/                   # Static assets (images, icons)
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx     # Main layout wrapper
│   │   ├── Sidebar.tsx       # Navigation sidebar
│   │   ├── Navbar.tsx        # Top navigation bar
│   │   ├── ProtectedRoute.tsx # Auth guard wrapper
│   │   └── CommandPalette.tsx # Quick command search
│   └── ReCaptcha.tsx         # reCAPTCHA component
├── context/
│   ├── AuthContext.tsx        # Auth state management
│   └── ThemeContext.tsx       # Dark/light theme
├── features/
│   ├── admin/AdminPage.tsx
│   ├── ai-coach/AiCoachPage.tsx
│   ├── analytics/AnalyticsPage.tsx
│   ├── auth/Login.tsx, Register.tsx
│   ├── cards/CardsPage.tsx
│   ├── dashboard/Dashboard.tsx
│   ├── rewards/RewardsPage.tsx
│   ├── settings/SettingsPage.tsx
│   ├── transactions/TransactionsPage.tsx
│   └── wallet/WalletPage.tsx
├── types/
│   └── index.ts              # All TypeScript interfaces
├── utils/
│   └── helpers.ts            # Utility functions
├── App.tsx                   # Root component + routing
├── main.tsx                  # Entry point
└── index.css                 # Global styles + Tailwind
```

---

## INTEGRATION POINTS

### Backend API (api/v1)
- Auth: register, login, verify-otp, refresh, logout
- Users: getProfile, updateProfile, changePassword
- Wallet: getWallet, topUp, getHistory
- Cards: generate, list, freeze, unfreeze, setLimits, updateDesign
- Transactions: list, getById, simulateSpend
- Analytics: getAnalytics
- AI Coach: chat
- Rewards: getPoints, getHistory, claimStreak

### Third-Party
- **Google reCAPTCHA v3**: Login/Register pages
- **OpenAI/Gemini API**: AI Coach (via backend proxy)

---

## FUTURE ENHANCEMENTS (Post-MVP)

- Lazy loading page components via `React.lazy() + Suspense`
- TanStack React Query for all server state
- Virtual scrolling for large transaction lists
- Push notifications via WebSocket
- PWA support (service worker + offline mode)
- i18n for multi-language support (Hindi + English)
- E2E tests with Playwright
- Storybook component library
- Design token export for design tools
