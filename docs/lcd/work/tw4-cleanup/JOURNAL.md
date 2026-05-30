# JOURNAL — tw4-cleanup

> **The resume anchor.** The block between the `lcd-resume:v1` markers below is the _entire_
> cold-start payload. `/stid-lcd:resume` reads MAP.md + this block + DECISIONS headers and nothing
> else. Keep NOW and STEPS current as you work. Everything below the `---` is history/detail.

<!-- lcd-resume:v1 -->

## NOW

- **Lane:** Standard
- **Goal:** Tailwind v4 follow-ups — drop redundant cssnano + tokenize hardcoded panel/disabled colors and repair the dead `surface.hover`/`text.disabled` tokens.
- **Next action:** Commit docs; push branch; open PR. (All code + verification done.)
- **Branch:** chore/tw4-cleanup · **Updated:** 2026-05-30 12:50

## STEPS

- [x] S1 — Branch `chore/tw4-cleanup` + bump version 4.51.1 → 4.51.2
- [x] S2 — Drop cssnano (postcss.config.js, package.json, yarn.lock); build CSS confirmed minified (commit 69a2ad2)
- [x] S3 — TDD: parity assertions red → added `surface.hover/sunken` + `text.disabled` to tokens.ts + adapter, green (commit 858e877)
- [x] S4 — Swapped `bg-black/{40,20}` → `bg-surface-sunken/{40,20}` (×10) + `text-gray-500!` → `text-text-tertiary!` (commit 654ad40)
- [x] S5 — Gate green (759 passed/20 skipped); verified via dist-CSS grep (dead utilities now emit correct values)
- [ ] S6 — Commit docs (DECISIONS D-007 + roadmap); push; open PR ← next

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

Internal CSS/build cleanup with a RENDER surface. The token parity test is the regression guard;
the grep guards + dist-CSS inspection are the surface verification (see LOG for why dist-CSS grep
is the stronger check than a screenshot here).

## LOG (append-only; not read on resume)

- 2026-05-30 12:44 — Triage → Standard. Audit found documented items (translucent blacks, gray-500) + a latent bug: `bg-surface-hover` (7×) and `text-text-disabled` (11×) reference tokens absent from tokens.ts/adapter → emit no CSS. User approved scope B (docs + broken-token repair; error reds deferred). S1 done (branch + version 4.51.2).
- 2026-05-30 12:50 — S2–S5 done. cssnano dropped (dist CSS confirmed minified without it). Tokens added TDD (red→green). 10 `bg-black/*` + 1 `text-gray-500!` swapped. Gate green (759/20). Verified via `dist` CSS grep: `bg-surface-hover{background-color:#334155}` and `text-text-disabled{color:#6b7280}` now EMIT (were absent — the build artifact was the bug report); `bg-surface-sunken/{40,20}` → `oklab(0% none none/.{4,2})` == old `bg-black/*`. Chose dist-CSS proof over a live browser session (deterministic + avoids the documented never-idle-emulator browser-verify hazards). Mirrored durable choices to DECISIONS D-007 + roadmap.
