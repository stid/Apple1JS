# ADR-008: Design System Implementation

**Status**: Implemented (consolidated 2026-05)

**Date**: 2024-12 (updated 2026-05)

## Context

UI had inconsistent styling with mixed font sizes, colors, and spacing.

A later review (2026-05) found the design system had fragmented into two parallel
idioms — Tailwind classes (most components) versus a token-function API
(`color()`, `styles`, `buttonVariants` in `src/styles/utils.ts`) — and that
`tailwind.config.js` hand-duplicated `tokens.ts`, allowing the two to drift.

## Decision

Implement design tokens system with:

- Consistent typography scale
- Semantic color palette
- Standardized spacing system
- Component-based architecture

### Canonical idiom (2026-05 consolidation)

- **`src/styles/tokens.ts` is the single source of truth.**
- **Tailwind is derived from tokens** via `src/styles/tailwind-tokens.ts`
  (the adapter), consumed by `tailwind.config.ts`. No hand-duplicated palette.
- **Components use Tailwind classes** (`bg-surface-primary`, `text-data-address`,
  etc.). The token-function API (`utils.ts`) was removed.
- A token↔Tailwind **parity test** (`src/styles/__tests__/token-tailwind-parity.vitest.test.ts`)
  plus an **ESLint raw-hex ban** prevent regression.
- **CRT display files keep raw hex** by design (see `CLAUDE.md`); they are
  allowlisted in the lint rule.

See `docs/active/design-system.md` for the full guide.

## Consequences

### Positive

- Consistent UI
- Easier maintenance
- Better user experience

### Negative

- Initial refactoring effort
- Ongoing token maintenance

## Implementation

- `src/styles/tokens.ts` — design token definitions (single source of truth)
- `src/styles/tailwind-tokens.ts` — token → Tailwind theme adapter
- `tailwind.config.ts` — derives its theme from the adapter
- `src/styles/__tests__/token-tailwind-parity.vitest.test.ts` — drift guard
- `docs/active/design-system.md` — usage guide and token→class mapping
