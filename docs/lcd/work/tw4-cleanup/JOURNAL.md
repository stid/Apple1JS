# JOURNAL — tw4-cleanup

> **The resume anchor.** The block between the `lcd-resume:v1` markers below is the _entire_
> cold-start payload. `/stid-lcd:resume` reads MAP.md + this block + DECISIONS headers and nothing
> else. Keep NOW and STEPS current as you work. Everything below the `---` is history/detail.

<!-- lcd-resume:v1 -->

## NOW

- **Lane:** Standard
- **Goal:** Tailwind v4 follow-ups — drop redundant cssnano + tokenize hardcoded panel/disabled colors and repair the dead `surface.hover`/`text.disabled` tokens.
- **Next action:** Drop cssnano (postcss.config.js + package.json), `yarn install`, verify `yarn build` CSS still minified.
- **Branch:** chore/tw4-cleanup · **Updated:** 2026-05-30 12:44

## STEPS

- [x] S1 — Branch `chore/tw4-cleanup` + bump version 4.51.1 → 4.51.2
- [ ] S2 — Drop cssnano (postcss.config.js, package.json, yarn.lock); verify build minified ← next
- [ ] S3 — TDD: add parity assertions (red) → add `surface.hover/sunken` + `text.disabled` to tokens.ts + adapter (green)
- [ ] S4 — Swap `bg-black/{40,20}` → `bg-surface-sunken/{40,20}` + `text-gray-500!` → `text-text-tertiary!`
- [ ] S5 — Gate (`yarn lint && type-check && test:ci`) + browser verify (hover/disabled/panels)
- [ ] S6 — Update JOURNAL/DECISIONS/roadmap; push; open PR

## DECISIONS (this work-item)

- Repair dead tokens by _adding_ `surface.hover`/`text.disabled` (not rewriting ~15 refs to existing tokens) — preserves authors' semantic intent, fewer edits.
- One `surface.sunken: #000000` + Tailwind v4 opacity modifiers reproduce `bg-black/40` and `/20` at identical CSS.
- Scope B: error reds, `text-black`, `index.css` base defaults deferred; CRT exempt.

## OPEN QUESTIONS

- none

## EDIT BOUNDARY (paths this work may touch)

- `postcss.config.js`, `package.json`, `yarn.lock`, `src/version.ts`
- `src/styles/tokens.ts`, `src/styles/tailwind-tokens.ts`, `src/styles/__tests__/token-tailwind-parity.vitest.test.ts`
- `src/components/{Info,PaginatedTableView,StackViewer,MemoryViewerPaginated}.tsx`
- `docs/lcd/DECISIONS.md`, `docs/active/consolidated_roadmap.md`
  <!-- /lcd-resume -->

---

## Acceptance criteria

Internal CSS/build cleanup with a RENDER surface verified by browser, not formal ACs. The token
parity test is the regression guard; the grep guards + visual checks are the surface verification.

## LOG (append-only; not read on resume)

- 2026-05-30 12:44 — Triage → Standard. Audit found documented items (translucent blacks, gray-500) + a latent bug: `bg-surface-hover` (7×) and `text-text-disabled` (11×) reference tokens absent from tokens.ts/adapter → emit no CSS. User approved scope B (docs + broken-token repair; error reds deferred). S1 done (branch + version 4.51.2).
