# DECISIONS — Apple1JS

> **Append-only decision log.** Broader than an ADR: any decision worth not re-litigating —
> architectural, tooling, naming, process, content-organization — gets a block here. Newest at
> top. **Never rewrite history**: to change a past decision, add a new block and mark the old
> one `superseded by D-NNN`. Work-item-local decisions live in that item's `JOURNAL.md`; mirror
> here only the ones that outlive the work item.

<!-- Next id: D-006 -->

---

## D-005 · 2026-05-28 · Worker-hosted architecture with typed comlink messaging
- **Context:** The emulator must run the CPU loop without blocking the UI thread.
- **Decision:** Run the system in a Web Worker; communicate via `comlink` and type-safe
  `sendWorkerMessage(...)` with messages defined in `src/apple1/types/worker-messages.ts`.
- **Alternatives rejected:** main-thread loop (janks UI); raw `postMessage` (untyped, error-prone).
- **Scope:** project-wide
- **Status:** active   <!-- detected at onboarding — confirm/edit -->

## D-004 · 2026-05-28 · WASM build is speed-first
- **Context:** Two viable WASM optimization strategies — size-first vs speed-first.
- **Decision:** Build the WASM CPU speed-first (`opt-level = 3` + `-O3` wasm-opt, ~155 KB release);
  this is what `yarn dev` ships. The old "<100 KB / 90 KB" size-first target is abandoned.
- **Alternatives rejected:** size-first (<100 KB) — slower; not restored without approval.
- **Scope:** project-wide
- **Status:** active   <!-- detected at onboarding — confirm/edit -->

## D-003 · 2026-05-28 · Dual-engine 6502 (TypeScript + Rust/WASM)
- **Context:** Wanted both an approachable reference implementation and high throughput.
- **Decision:** Maintain two 6502 engines — a TypeScript reference and a Rust→WASM engine
  (`wasm-cpu/` → `src/wasm/`) — switchable at runtime, with the JS engine as the always-available
  fallback and parity oracle. Test both engines for every engine change.
- **Alternatives rejected:** WASM-only (loses the readable reference + fallback); JS-only (~14× slower).
- **Scope:** project-wide
- **Status:** active   <!-- detected at onboarding — confirm/edit -->

## D-002 · 2026-05-28 · Vitest as the test framework
- **Context:** Needed a fast test runner aligned with the Vite toolchain.
- **Decision:** Use Vitest (`jsdom`/`happy-dom` env, `globals: true`), discovery glob
  `src/**/*.vitest.{test,spec}.{js,jsx,ts,tsx}`, tests co-located under `__tests__/`.
- **Alternatives rejected:** Jest (slower with Vite; extra config).
- **Scope:** project-wide
- **Status:** active   <!-- detected at onboarding — confirm/edit -->

## D-001 · 2026-05-28 · Yarn (classic) as the package manager
- **Context:** A single lockfile/PM is needed for reproducible installs.
- **Decision:** Use Yarn (`yarn.lock`) for dependency management and script running.
- **Alternatives rejected:** npm / pnpm — no migration reason.
- **Scope:** project-wide
- **Status:** active   <!-- detected at onboarding — confirm/edit -->

---

<!-- Template for a new entry — copy above the previous newest, bump "Next id":

## D-NNN · YYYY-MM-DD · <short title>
- **Context:** <what prompted this — the situation/constraint/fork>
- **Decision:** <what we chose, stated plainly>
- **Alternatives rejected:** <one line each, with the why>
- **Scope:** <work-item slug | project-wide>
- **Status:** active   <!-- active | superseded by D-NNN -->

-->
