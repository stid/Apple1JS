# JOURNAL — board-activity

> **The resume anchor.** The block between the `lcd-resume:v1` markers below is the _entire_
> cold-start payload. Everything below the `---` is history/detail, NOT read on resume.

<!-- lcd-resume:v1 -->

## NOW

- **Lane:** Deep
- **Goal:** Board live activity (issue #247): each bus-addressed part shows its read/write rate
  and lights up with its traces, with identical counts on both CPU engines.
- **Next action:** owner approves `spec.md`, then run `/lcd:plan board-activity`.
- **Branch:** feat/board-activity · **Updated:** 2026-11-21 23:00

## STEPS

- [x] S1 — triage, branch, investigation (where the WASM engine keeps memory)
- [x] S2 — `spec.md`
- [ ] S3 — owner approval of the spec ← next
- [ ] S4 — `plan.md`, `tasks.md`, failing tests, red-green, browser check, audit

## DECISIONS (this work-item)

- Counters live in each engine's own bus, not in one shared place: the WASM engine resolves RAM
  and ROM inside Rust and only `$D000–$DFFF` reaches the JS `Bus`.
- Only CPU-originated accesses count. `WasmSystem.read_memory`/`write_memory` share
  `Bus::read`/`write` with the CPU today, so the Rust bus needs a non-counting path for them (the
  JS side already has `peek`).

## OPEN QUESTIONS

- Spec defaults awaiting approval: CPU lit but no rate; unmapped accesses not counted; rate in
  accesses per second; 5% throughput tripwire.

## EDIT BOUNDARY (paths this work may touch)

- `docs/lcd/work/board-activity/**` (until the plan sets the code boundary)

<!-- /lcd-resume -->

---

## LOG (append-only; not read on resume)

- 2026-11-21 23:00 — Triage → Deep (5 signals, hard trigger: both engines). Investigation:
  `wasm-cpu/src/bus.rs` owns RAM (`$0000–$0FFF`, `$E000–$EFFF`) and ROM (`$FF00–$FFFF`); only the
  I/O block calls `wasmMemoryBridge`. The bridge's header comment ("every memory access") is
  stale. The memory viewer reads WASM memory per byte through `read_memory` → `Bus::read`, the
  CPU's own path. Spec written.

## DEEP PIPELINE (Deep lane only)

`spec.md ✅  plan.md ⬜  tasks.md ⬜  tests ⬜  red-green ⬜  audit.md ⬜`
