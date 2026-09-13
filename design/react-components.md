# React Component Architecture & Hierarchy — FST Pay

This document details the React 19 component structure, atomic design hierarchy, and hook conventions used across the frontend.

---

## 1. Atomic Component Structure

The frontend is organized following Atomic Design principles under `frontend/src/`:

```
frontend/src/
├── components/           # Reusable UI building blocks (Atoms & Molecules)
│   ├── ui/               # Base controls (Button, Input, Badge, Modal, Spinner)
│   ├── layout/           # AppShell, Navbar, Sidebar, BottomNav, PageContainer
│   ├── card/             # VirtualCard3D, CardFlipAnimation, CardControls
│   └── feedback/         # ToastNotification, ErrorBoundary, SkeletonLoader
├── features/             # Domain modules (Organisms & Feature Pages)
│   ├── auth/             # Login, Register, OtpVerification, PasswordReset
│   ├── wallet/           # WalletOverview, BalanceDisplay, TopUpModal
│   ├── cards/            # CardList, CardDetails, SpendingLimitForm
│   ├── transactions/     # TransactionHistory, TransactionItem, ReceiptModal
│   ├── aicoach/          # AICoachChat, FinancialTips, BudgetAdvice
│   ├── parent/           # TeenManagement, AllowanceSchedule, RuleEditor
│   ├── rewards/          # PointsBanner, StreakTracker, RewardCatalog
│   └── admin/            # AdminDashboard, UserTable, AuditLogView
├── context/              # React Context providers (AuthContext, ThemeContext)
├── hooks/                # Custom React hooks (useAuth, useWallet, useDebounce)
└── api/                  # Axios clients and TanStack Query query/mutation factories
```

---

## 2. Core React 19 Design Patterns

### Composition over Inheritance
- UI elements leverage polymorphic `as` props and `children` projection.
- Modals and Drawers use React Portals rendered into `#modal-root`.

### Async Server State via TanStack Query
- Server data fetching, caching, deduplication, and optimistic updates are managed via `@tanstack/react-query`:
  ```tsx
  // Example: Query hook for virtual cards
  export function useCards() {
    return useQuery({
      queryKey: ['cards'],
      queryFn: cardsApi.getCards,
      staleTime: 1000 * 60 * 2, // 2 minutes
    });
  }
  ```

### Form Handling & Sanitization
- Controlled inputs with Zod/Yup client-side validation schema.
- Password fields enforce minimum 8 characters, digit, and special character requirements.
- Masked inputs for Card Numbers (`#### #### #### ####`) and OTP inputs (auto-focusing 6-character digit fields).

### Motion & Micro-interactions
- Built using `framer-motion` (v12).
- Virtual Card Flip: 3D perspective transforms (`rotateY: 180deg`) with spring physics.
- Page Transitions: Staggered fade-ins with exit animations.
