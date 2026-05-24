# Design System Guide

> **One rule:** `src/styles/tokens.ts` is the single source of truth. Tailwind is
> _derived_ from it; components use Tailwind classes. No hardcoded hex (except CRT).

## The canonical idiom

Style components with **Tailwind utility classes** that are backed by design tokens:

```tsx
// ✅ Do this
<div className="bg-surface-primary border border-border-primary text-data-address" />

// ❌ Not this (banned by ESLint)
<div style={{ backgroundColor: '#1E293B', color: '#34D399' }} />
```

There is no token-function API (`color()`, `styles`, `buttonVariants`) — it was
removed during the 2026-05 consolidation. If you need a value Tailwind can't express
as a class (rare), reference the token object directly, e.g.
`style={{ boxShadow: designTokens.boxShadow.md }}` — never a raw hex literal.

## How it fits together

```text
src/styles/tokens.ts           # source of truth (hex, spacing, type scales)
        │  imported by
        ▼
src/styles/tailwind-tokens.ts  # adapter: tokens → Tailwind's flat theme shape
        │  imported by
        ▼
tailwind.config.ts             # theme.extend = adapter output (+ non-token extras)
        │  resolved by
        ▼
Tailwind classes in components # bg-surface-primary, text-data-address, ...
```

A parity test (`src/styles/__tests__/token-tailwind-parity.vitest.test.ts`) asserts the
resolved Tailwind theme equals the adapter output, so the config can never drift from
the tokens. An ESLint rule (`no-restricted-syntax` in `eslint.config.js`) bans raw hex
in `src/**` so colors can't sneak back in outside the token file.

## Token → Tailwind class mapping

| Token (in `tokens.ts`)                                         | Tailwind class prefix examples                                   |
| -------------------------------------------------------------- | ---------------------------------------------------------------- |
| `colors.address` / `value` / `flag` / `status`                 | `text-data-address`, `bg-data-value`, `text-data-flag`           |
| `colors.dataHover.address` / `value`                           | `text-data-address-hover`, `bg-data-value-hover`                 |
| `colors.success` / `warning` / `error` / `info`                | `text-success`, `bg-warning`, `border-error` (also `semantic-*`) |
| `colors.phosphor.*`                                            | `text-phosphor-primary`, `bg-phosphor-glow`                      |
| `colors.surface.{primary…quaternary,overlay}`                  | `bg-surface-primary`, `bg-surface-overlay`                       |
| `colors.border.{primary,secondary,accent,subtle}`              | `border-border-primary`, `border-border-accent`                  |
| `colors.text.{primary,secondary,tertiary,accent,muted}`        | `text-text-primary`, `text-text-muted`                           |
| `colors.componentColors.{RAM,ROM,Bus,CPU,…}`                   | `text-component-ram`, `text-component-cpu`, … (see below)        |
| `spacing.{xs…xxxl}`                                            | `p-md`, `gap-sm`, `mb-lg`                                        |
| `typography.fontSize.{xs…xl}`                                  | `text-xs`, `text-base`                                           |
| `typography.fontWeight.*` / `lineHeight.*` / `letterSpacing.*` | `font-medium`, `leading-tight`, `tracking-wide`                  |
| `typography.fontFamily.mono`                                   | `font-mono` (token-backed app-wide)                              |

### Naming notes (deliberate, not drift)

- **`background` vs `surface`:** tokens keep a `background` group _and_ a `surface`
  group. Tailwind derives from `surface` (`surface.primary == background.surface == #1E293B`).
  `background.*` exists only as reference; prefer `surface-*` classes.
- **componentColors are PascalCase → lowercase:** token keys are component type names
  (`RAM`, `ROM`, `Bus`, `CPU`, `CPU6502`, `PIA6820`, `IoComponent`, `Clock`); the adapter
  maps them to `component-{ram,rom,bus,cpu,pia,io,clock}`. `CPU` and `CPU6502` share one
  value and both collapse to `component-cpu`. `InspectorView.getComponentColor` mirrors
  this map for runtime `node.type` → class lookups.

## The CRT exception

CRT display files render an authentic phosphor look with hand-tuned raw colors and CSS
effects. They are **intentionally exempt** from the token system and the hex ban
(see `CLAUDE.md`). Allowlisted in `eslint.config.js`:

- `CRT*.{ts,tsx}` (e.g. `CRT.tsx`, `CRTRowCharRom.tsx`, `CRTConstants.ts`)
- `CharRom*.{ts,tsx}`

Do not "fix" colors in these files to tokens — the look is deliberate.

## Non-token-derived extras

A few presentation effects live literally in `tailwind.config.ts` (not in tokens):
`boxShadow.glow-green` / `glow-subtle`, the `fade-in` / `pulse-slow` animations, and
their keyframes. These are effects, not palette values; leave them as-is.

## How to add or change a token

1. Edit `src/styles/tokens.ts` (the only place a hex value belongs).
2. If it should be a Tailwind class, add it to the adapter `src/styles/tailwind-tokens.ts`
   so a class name is generated.
3. Run `yarn vitest run src/styles` — the parity test confirms tokens ↔ Tailwind agree.
4. Use the new class in components. Run `yarn lint` (the hex ban) and `yarn type-check`.

## Future: Claude Design handoff (optional)

[Claude Design](https://support.claude.com/en/articles/14604416) is a hosted visual
design tool. It does not refactor code or sync with the repo, but it can ingest this
repo for context and "hand off to Claude Code." If a future visual exploration produces
a new palette/scale, apply it by **editing `tokens.ts`** (and the adapter for any new
keys) — every component and the Tailwind theme update from that one place. Keep the CRT
files out of scope; their aesthetic is intentional.
