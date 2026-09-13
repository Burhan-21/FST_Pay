# FST Pay Design Tokens — React & Tailwind Architecture

This document defines the foundational design tokens implemented in `frontend/tailwind.config.js` and `frontend/src/index.css`.

---

## 1. Color Palette & CSS Variables

Tokens are declared as CSS custom properties with dynamic opacity support (`rgb(var(--token) / <alpha-value>)`).

### Primary Palette (Brand Identity)
- **Primary Brand Blue**: `#2070FF` (`--color-primary: 32 112 255`)
- **Primary Hover**: `#1A5ECC` (`--color-primary-hover: 26 94 204`)
- **Secondary Cyan**: `#78D3FF` (`--color-accent: 120 211 255`)

| Token | Hex Equivalent | Usage |
|-------|----------------|-------|
| `primary-50` | `#EEF5FF` | Card active tints, subtle highlights |
| `primary-500` | `#2070FF` | Primary CTA buttons, active tab indicators |
| `primary-700` | `#144FB3` | Pressed states, high-contrast borders |
| `accent-500` | `#78D3FF` | Secondary badges, progress fill highlights |

### Semantic Functional Colors
- **Success / Credit**: `#22C55E` (`rgb(34, 197, 94)`) — Balance increases, successful top-ups, completed goals.
- **Warning / Streaks**: `#F59E0B` (`rgb(245, 158, 11)`) — Allowance threshold alerts, reward streaks.
- **Danger / Debit / Freeze**: `#EF4444` (`rgb(239, 68, 68)`) — Card freezing, balance deductions, destructive modals.
- **AI Accent**: `#7C3AED` (`rgb(124, 58, 237)`) — AI Financial Coach messages, automated smart recommendations.
- **Gamification / XP**: `#FBBF24` (`rgb(251, 191, 36)`) — Reward tiers, level badges, XP counters.

---

## 2. Surfaces & Theme Modes

FST Pay supports three reactive themes toggled via `.dark` and `.amoled` classes on `document.documentElement`:

1. **Light Mode**:
   - Background: `#F7FAFF`
   - Foreground: `#0E1726`
   - Card Background: `#FFFFFF`
   - Border: `#E2E8F0`
2. **Dark Mode (Default Fintech Slate)**:
   - Background: `#0E1726`
   - Foreground: `#F8FAFC`
   - Card Background: `#162238`
   - Border: `#1E293B`
3. **AMOLED Mode (OLED Pure Black)**:
   - Background: `#000000`
   - Foreground: `#FFFFFF`
   - Card Background: `#0A0A0A`
   - Border: `#1F1F1F`

---

## 3. Typography Hierarchy

Tokens mapped via `@layer base` and Google Fonts imports:

- **Headings & Logo**: `Sora`, sans-serif (Weights: 600, 700, 800)
- **Body & Controls**: `Inter`, system-ui, sans-serif (Weights: 400, 500, 600)
- **Monospace / Financial Digits**: `JetBrains Mono`, monospace (Weights: 500, 700) — Used for Card PANs, CVVs, transaction IDs, OTP digits.

---

## 4. Elevation & Glassmorphism Tokens

```css
/* Glass Surface */
.glass-panel {
  background: rgba(22, 34, 56, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* Clay Surface (Soft 3D) */
.clay-card {
  border-radius: 1rem;
  box-shadow: 
    8px 8px 16px rgba(0, 0, 0, 0.25),
    -4px -4px 12px rgba(255, 255, 255, 0.03),
    inset 1px 1px 2px rgba(255, 255, 255, 0.1);
}
```
