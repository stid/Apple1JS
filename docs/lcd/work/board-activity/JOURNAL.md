# JOURNAL — board-activity

> **The resume anchor.** The block between the `lcd-resume:v1` markers below is the _entire_
> cold-start payload. Everything below the `---` is history/detail, NOT read on resume.

<!-- lcd-resume:v1 -->

## NOW

- **Lane:** Deep
- **Goal:** Board live activity (issue #247): each bus-addressed part shows its read/write rate
  and lights up with its traces, with identical counts on both CPU engines.
- **Next action:** open the PR (owner go-ahead pending). Everything else is done and pushed.
- **Branch:** feat/board-activity · **Updated:** 2026-11-22 00:15

## STEPS

- [x] S1 — triage, investigation, `spec.md` (approved), `plan.md`, `tasks.md`
- [x] T1–T3 — Rust: native tests, counters, bindings rebuilt
- [x] T4–T7 — JS counters, `getPageActivity` on the engines, parity vs real WASM
- [x] T8–T9 — `activity` on the machine tree
- [x] T10–T13 — Board: rates module, rate line, lit parts and traces
- [x] T14–T17 — version 4.54.0, browser check, benchmark (AC-11), docs
- [x] T-audit (PASS, first run), T-final (green)
- [ ] open the PR ← next

## DECISIONS (this work-item)

- Count per 256-byte page at the CPU's bus-access helper in each engine, not in the bus
  (→ DECISIONS D-016). Debugger paths never go through that helper, so they cannot count.
- Reset clears the counters in both engines (their reset sequences read the vector differently).
- Read-out: `ICPUEngine.getPageActivity(): Float64Array` (512), folded into
  `activity: { instructions, parts }` on the machine tree root by `Apple1.getInspectable()`.
- Counters are 32-bit and wrap on both engines (`Uint32Array` / `[u32; 512]`): a `Float64Array`
  cost the JS engine 6.9% headless, over the AC-11 limit; `Uint32Array` costs 1.7% (WASM 4.7%).
- Tree field is `activity: { sampledAt, accesses, parts }` (worker timestamp; `accesses` replaces
  the planned `instructions`).
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

- 2026-11-22 00:15 — Build done (commits 95f2a16, b0be636, c2819ae, 6bb4f27). Native Rust and
  JS tests assert the same counts; parity vs real WASM passes, including a mixed RMW / indexed /
  indirect / branch program (the plan's divergence risk did not occur). Browser check on both
  engines (headless Chrome): idle prompt lights CPU, PROMs, PIA; typing touches RAM bank 1; BASIC
  lights RAM bank 2; pause darkens everything; reset and engine switch show one "no rate" sample,
  never a negative or a spike; keyboard and display work on WASM. Found on the way: before the
  first Reset the machine sits in a BRK loop, visible as RAM bank 1 at 430k writes/s. Benchmark,
  eight alternating runs vs master: JS −1.7%, WASM −4.7%. One console 404 during the check is the
  browser's `/favicon.ico` request (likely; that URL 404s and is unrelated to this branch).
  audit: PASS (first run).

## DEEP PIPELINE (Deep lane only)

`spec.md ✅  plan.md ✅  tasks.md ✅  tests ✅  red-green ✅  audit.md ✅`
