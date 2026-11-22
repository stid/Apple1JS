# JOURNAL — board-activity

> **The resume anchor.** The block between the `lcd-resume:v1` markers below is the _entire_
> cold-start payload. Everything below the `---` is history/detail, NOT read on resume.

<!-- lcd-resume:v1 -->

## NOW

- **Lane:** Deep
- **Goal:** Board live activity (issue #247): each bus-addressed part shows its read/write rate
  and lights up with its traces, with identical counts on both CPU engines.
- **Next action:** run `/lcd:tasks board-activity`.
- **Branch:** feat/board-activity · **Updated:** 2026-11-21 23:40

## STEPS

- [x] S1 — triage, branch, investigation (where the WASM engine keeps memory)
- [x] S2 — `spec.md` (approved by the owner 2026-11-21)
- [x] S3 — `plan.md`
- [ ] S4 — `tasks.md` ← next
- [ ] S5 — failing tests, red-green, browser check, benchmark, audit

## DECISIONS (this work-item)

- Count per 256-byte page at the CPU's bus-access helper in each engine, not in the bus
  (→ DECISIONS D-016). Debugger paths never go through that helper, so they cannot count.
- Reset clears the counters in both engines (their reset sequences read the vector differently).
- Read-out: `ICPUEngine.getPageActivity(): Float64Array` (512), folded into
  `activity: { instructions, parts }` on the machine tree root by `Apple1.getInspectable()`.
- Spec AC-1 amended: "bus accesses the engine performs", not "bus cycles" (no dummy cycles in
  either engine).

## OPEN QUESTIONS

- none

## EDIT BOUNDARY (paths this work may touch)

- `wasm-cpu/src/cpu.rs`, `wasm-cpu/src/system.rs`, `src/wasm/**` (regenerated)
- `src/core/cpu6502/core.ts`, `src/core/cpu-interface/ICPUEngine.ts`
- `src/core/cpu-engines/JSEngine.ts`, `WasmEngine.ts`, `DualEngine.ts`, `wasm-memory-bridge.ts`
- `src/core/cpu-engines/__tests__/page-activity*-board-activity.vitest.test.ts`
- `src/apple1/index.ts`, `src/apple1/types/worker-messages.ts`,
  `src/apple1/__tests__/Apple1-board-activity.vitest.test.ts`
- `src/test-support/mocks/**`
- `src/components/board/**`, `src/components/BoardView.tsx`, `src/components/AppContent.tsx`,
  `src/components/__tests__/BoardView-board-activity.vitest.test.tsx`, `src/index.css`
- `src/version.ts`, `docs/active/wasm-performance.md`, `docs/active/architecture.md`
- `docs/lcd/DECISIONS.md`, `docs/lcd/work/board-activity/**`

<!-- /lcd-resume -->

---

## LOG (append-only; not read on resume)

- 2026-11-21 23:00 — Triage → Deep (5 signals, hard trigger: both engines). Investigation:
  `wasm-cpu/src/bus.rs` owns RAM (`$0000–$0FFF`, `$E000–$EFFF`) and ROM (`$FF00–$FFFF`); only the
  I/O block calls `wasmMemoryBridge`. The bridge's header comment ("every memory access") is
  stale. The memory viewer reads WASM memory per byte through `read_memory` → `Bus::read`, the
  CPU's own path. Spec written.
- 2026-11-21 23:40 — Spec approved ("go"). Plan written. Design moved the counters from the bus
  to the CPU's access helper (D-016). Context7: wasm-bindgen returns `Box<[f64]>` as a
  `Float64Array`. AC-1 amended (accesses, not cycles).

## DEEP PIPELINE (Deep lane only)

`spec.md ✅  plan.md ✅  tasks.md ⬜  tests ⬜  red-green ⬜  audit.md ⬜`
