# FST Pay Design System & UI/UX Standards

---

## 1. Principles & Human Interface Guidelines

1. **Clarity & Trust First**: Financial interfaces must communicate balances, fees, and security states with zero ambiguity. Mask sensitive numbers by default (e.g., `•••• •••• •••• 4242`).
2. **Instant Feedback**: Every button interaction must provide immediate tactile or visual state feedback (active scale, loading spinner, or toast notification) within 50ms.
3. **Teen-Friendly Engagement without Clutter**: Modern gamification (XP, streaks, level-ups) should inspire financial literacy while maintaining a clean, professional banking aesthetic.

---

## 2. Accessibility Standards (WCAG 2.1 AA)

- **Contrast Ratios**:
  - Normal text: Minimum 4.5:1 against background.
  - Large text (≥18pt or 14pt bold): Minimum 3:1.
  - Interactive components & graphical borders: Minimum 3:1.
- **Keyboard Navigation**:
  - All interactive elements must support `Tab`, `Shift+Tab`, `Enter`, and `Space`.
  - Visual focus ring: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`.
- **Screen Reader Support**:
  - Every icon-only button must include `aria-label` (e.g., `<button aria-label="Toggle card CVV visibility">`).
  - Toast alerts use `role="status"` and `aria-live="polite"`.

---

## 3. Responsive Breakpoints

Following standard Tailwind CSS screen tiers:
- **Mobile** (`< 640px`): Single column layout, persistent bottom navigation bar (`BottomNav`), full-screen modals.
- **Tablet** (`640px - 1024px`): Collapsible sidebar navigation, 2-column card grid.
- **Desktop** (`> 1024px`): Persistent left sidebar navigation, 3-column analytics dashboard, floating notifications panel.

---

## 4. Theme Engine Specification

Theme switching is managed by `ThemeContext` and persisted in `localStorage('fstpay_theme')`:
```typescript
type Theme = 'light' | 'dark' | 'amoled';
```
When switched:
1. Removes previous theme classes from `<html>`.
2. Applies `.dark` or `.amoled` class to `<html>`.
3. Dispatches a custom event to notify canvas-based charts (Recharts) to recalculate grid and tooltip color themes.
