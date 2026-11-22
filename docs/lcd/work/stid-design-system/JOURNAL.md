# JOURNAL — stid-design-system

<!-- lcd-resume:v1 -->
## NOW

- **Lane:** Standard
- **Goal:** Restyle the Apple1JS UI onto the stid design system and fix the design-review findings, leaving the CRT content untouched.
- **Next action:** done on the branch; open the PR when the owner says so.
- **Branch:** feat/stid-design-system  ·  **Updated:** 2026-11-21 20:00

## STEPS

- [x] S1 — tokens: stid palette, type scale, radii, shadows; Geist fonts; parity test updated first
- [x] S2 — shell: page background, header, panels, primary tabs, action buttons, execution bar
- [x] S3 — content: Info (no emoji), Inspector, debugger cards and tables (mono only for data)
- [x] S4 — verify in browser, docs (`docs/active/design-system.md`), version bump, gate

## DECISIONS (this work-item)

- Dark only (Catppuccin Mocha). The stid light theme needs CSS-variable tokens; not asked for, left out.
- Token key names stay; only values change, so the Tailwind adapter and component classes keep working.
- Peach is the accent for interaction (active tab, links, focus, ON toggles). Green stays for data values and run state, which also ties the panels to the phosphor CRT.
- Geist + Geist Mono self-hosted through `@fontsource-variable/*` (no third-party font request at runtime).
- CRT files, phosphor tokens and CRT CSS utilities are out of scope.

## OPEN QUESTIONS

- none

## EDIT BOUNDARY (paths this work may touch)

- `src/styles/**`, `src/index.css`, `src/index-web.tsx`, `tailwind.config.ts`, `index.html`
- `src/components/*.tsx` except `CRT*.tsx` / `CharRom*`
- `src/components/__tests__/**` (assertions on classes and copy)
- `docs/active/design-system.md`, `src/version.ts`, `package.json`, `yarn.lock`
<!-- /lcd-resume -->

---

## LOG (append-only; not read on resume)

- 2026-11-21 — Design review done against the running app (Info, Inspector, Debugger overview/memory/disassembly). Findings: pure-black page with slate panels, green used for accent + data + success at once, pill tabs that look like buttons, all-caps anchor "buttons", emoji section markers, panel-in-panel-in-well nesting, 14–18px mono for all UI text.
- 2026-11-21 — S1–S4 done. Shared atoms (`btn`, `card`, `eyebrow`, `well`, `badge`, `field`, `segmented`, `tab`) added to `src/index.css`. Removed the global `h3`/`p` element rules that leaked margins into every card. CRT CSS utilities and keyframes verified byte-identical to master. Verified in Chrome: Info, Inspector, Debugger overview/memory/disassembly.
