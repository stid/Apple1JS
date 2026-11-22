# Tasks: Board live activity

> **Deep lane · Phase 3 of 6 (Tasks).** A flat, dependency-ordered checklist. Each task names
> the file it touches. Tests come before the code they test (TDD). The granular STEPS in the
> work-item `JOURNAL.md` mirror this list as the resume view; keep them in sync.

**Slug:** `board-activity`
**Spec:** [`spec.md`](./spec.md) • **Plan:** [`plan.md`](./plan.md) • **Journal:** [`JOURNAL.md`](./JOURNAL.md)
**Created:** 2026-11-21
**Status:** completed

---

## Conventions

- `[P]` suffix = parallelizable with the previous task (different file, no shared state).
- Tests precede implementation tasks they cover.
- Test names carry the literal `AC-N (SURFACE)` token; `none` ACs use `AC-N (none)`.

## Tasks

Engine counters (Rust)

- [x] **T1**: Failing native tests in `wasm-cpu/src/system.rs`: `AC-1 (none)` counts for a known
      program touching both RAM banks, the PROMs and the PIA; reset clears; `AC-3 (none)`
      `read_memory`/`write_memory` leave the counts unchanged.
- [x] **T2**: `wasm-cpu/src/cpu.rs` — counter array, increments in the two bus helpers, clear on
      reset; `wasm-cpu/src/system.rs` — `get_page_activity`. Passes T1 (`yarn wasm:test`).
- [x] **T3**: Rebuild the bindings (`yarn wasm:build:release` → `src/wasm/**`).

Engine counters (JS) and read-out

- [x] **T4**: Failing tests in
      `src/core/cpu-engines/__tests__/page-activity-board-activity.vitest.test.ts`: `AC-1 (none)`
      the same program and the same expected numbers as T1 on the JS engine; reset clears;
      `AC-3 (none)` `read`, `write`, `readRange`, `writeRange`, `loadProgram` do not count.
- [x] **T5**: `src/core/cpu-interface/ICPUEngine.ts` — `getPageActivity`;
      `src/core/cpu6502/core.ts` — counters; `src/core/cpu-engines/JSEngine.ts`, `WasmEngine.ts`,
      `DualEngine.ts` — implement; `src/test-support/mocks/**` — mocks. Passes T4.
- [x] **T6**: Parity tests in
      `src/core/cpu-engines/__tests__/page-activity-parity-board-activity.vitest.test.ts`:
      `AC-2 (none)` identical arrays on both engines; `AC-4 (none)` a PIA read and a PIA write
      complete under real WASM with counting on. Run with `yarn dev:vite` serving. Fix any
      divergence in the engine at fault (failing test first).
- [x] **T7**: `src/core/cpu-engines/wasm-memory-bridge.ts` — correct the stale header comment. [P]

Machine tree

- [x] **T8**: Failing tests in `src/apple1/__tests__/Apple1-board-activity.vitest.test.ts`:
      `AC-1 (none)` the tree carries `activity` with per-part totals; `AC-3 (none)` a tree fetch
      and a debugger memory read leave it unchanged; the idle monitor and BASIC samples behind
      AC-7 (PROMs and PIA counted, `$E000` bank zero; `$E000` bank counted under BASIC).
- [x] **T9**: `src/apple1/types/worker-messages.ts` — `BoardActivitySample`; `src/apple1/index.ts`
      — fold pages into parts. Passes T8.

Board

- [x] **T10**: Failing tests in
      `src/components/board/__tests__/boardActivity-board-activity.vitest.test.ts`: rates from two
      samples, zero when paused, "no rate" when a counter goes backwards, rate formatting.
- [x] **T11**: `src/components/board/boardActivity.ts`. Passes T10.
- [x] **T12**: Failing tests in
      `src/components/__tests__/BoardView-board-activity.vitest.test.tsx`: `AC-5 (RENDER)` rate
      text per part; `AC-6 (RENDER)` lit parts, stubs, CPU, decoder and trunks; `AC-7 (RENDER)`
      idle and BASIC samples; `AC-8 (RENDER)` paused and selection; `AC-9 (RENDER)` no rate after
      a backwards counter; `AC-10 (RENDER)` rate text always present, no animation under reduced
      motion.
- [x] **T13**: `src/components/board/boardModel.ts` — `part` on traces;
      `src/components/BoardView.tsx` — rate line, lit style, legend entry
      (`src/components/AppContent.tsx`, `src/index.css` only if needed). Passes T12.

Closeout

- [x] **T14**: `src/version.ts` → `4.54.0`.
- [x] **T15**: Browser check on both engines: idle prompt, typing, BASIC, pause, reset, engine
      switch (AC-5 to AC-10 live; AC-4 display and keyboard alive on WASM).
- [x] **T16**: `AC-11 (none)` headless benchmark before and after on both engines; record in
      `docs/active/wasm-performance.md`. Over 5% on either → stop and ask the owner.
- [x] **T17**: `docs/active/architecture.md` — the activity path. [P]
- [x] **T-audit**: Run `/lcd:audit board-activity`; zero MISSING/BLOCKED rows.
- [x] **T-final**: `yarn test:ci` (lint + type-check + vitest, with `yarn dev:vite` serving so the
      parity suites run), `yarn wasm:test`, `yarn build`; all green.

## Checkpoint validation

After every block the suite must stay green. A red parity test in T6 stops the work until the
diverging engine is fixed or the owner has been asked.

## Linkbacks

- `AC-1` → T1, T2, T4, T5, T8, T9
- `AC-2` → T6
- `AC-3` → T1, T4, T8
- `AC-4` → T6, T15
- `AC-5 (RENDER)` → T12, T13
- `AC-6 (RENDER)` → T12, T13
- `AC-7 (RENDER)` → T8, T12, T13, T15
- `AC-8 (RENDER)` → T10, T12, T13
- `AC-9 (RENDER)` → T10, T12, T13
- `AC-10 (RENDER)` → T12, T13
- `AC-11` → T16
