# FST Pay Design Principles

These design principles guide the development of the FST Pay user experience. They serve as the visual equivalent of our Architecture Decision Records (ADRs).

---

## 1. Simplicity Over Decoration
* Visual clarity is our top priority. Avoid unnecessary visual noise, excessive backgrounds, or nested card borders.
* Layouts should use whitespace effectively to let elements breathe and reduce cognitive load.

## 2. Financial Information as the Primary Focus
* Account balances, ledger statements, transactional amounts, and savings rates must be highly legible and clearly demarcated.
* Currency notations and decimal alignments should follow standard, readable formats.

## 3. Interaction-Reinforcing Motion
* Animations (using Framer Motion) must serve to clarify actions, guide user flow, or celebrate key milestones (like goal completions).
* Motion should remain snappy and low-latency (Timings: Hover: 150–200 ms, Page: 250–300 ms, Modals: 200 ms). Never slow down the user's workflow with long transitions.

## 4. Single Unified Design Language
* Color palettes, spacing values, radius curves, and typography scales are defined globally as Design Tokens.
* Scattered hardcoded hex values or utility spacing overrides are prohibited.

## 5. Reusable Component Composition
* Always reuse existing Level 1 (Foundation) and Level 2 (Layout) components before drafting custom layout modifications.
* Ensure feature-level components build atop the core Design System.

## 6. Mandatory Skeletons, Empty, and Error States
* No data-driven panel may render blank or show generic loaders. Page-specific animated skeletons are required.
* Empty collections must render descriptive, actionable empty states with contextual next steps.
* Network failures must use the standardized `ApiError` component with clean retry actions.

## 7. Accessibility as a Quality Gate
* Semantic landmark structures (`header`, `main`, `nav`, `footer`) must wrap all views.
* Key elements must support keyboard navigation focus rings, modal loops, escape close commands, and ARIA labels.

## 8. Performance is a Feature
* Keep client bundle sizes optimal through route-based code splitting.
* Memoize charts, charts data, and tables to eliminate unnecessary DOM re-renders.
