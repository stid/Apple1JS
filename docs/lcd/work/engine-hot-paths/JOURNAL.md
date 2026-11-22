# JOURNAL — engine-hot-paths

> **The resume anchor.** The block between the `lcd-resume:v1` markers below is the _entire_
> cold-start payload. Everything below the `---` is history/detail, NOT read on resume.

<!-- lcd-resume:v1 -->

## NOW

- **Lane:** Standard
- **Goal:** Raise raw throughput of both 6502 engines by removing per-bus-access overhead, with behaviour and JS/WASM parity unchanged.
- **Next action:** done — PR open; merge when reviewed.
- **Branch:** refactor/engine-hot-paths · **Updated:** 2026-11-21 23:10

## STEPS

- [x] S1 — benchmark: memory-sweep workload added (touches 4096 data addresses); baseline recorded
- [x] S2 — JS `Bus`: per-page decode table replaces the Map LRU + binary search; cache stats removed with owner approval
- [x] S3 — WASM `Bus`: one flat 64K array + per-page kind table; `ram.rs` deleted
- [x] S4 — per-instruction overheads: three experiments measured, none kept
- [x] S5 — parity suite against real WASM, WOZ Monitor session on both engines, full gate, perf doc, version 4.54.1

## DECISIONS (this work-item)

- Measure every change with the headless benchmark, alternating runs; drop any change inside the ±3% noise band.

## OPEN QUESTIONS

- none

## EDIT BOUNDARY (paths this work may touch)

- `src/core/Bus.ts`, `src/core/RAM.ts`, `src/core/cpu6502/core.ts`
- `src/core/__tests__/Bus*.vitest.test.ts`
- `src/core/cpu-engines/__tests__/wasm-benchmark.vitest.test.ts`
- `wasm-cpu/src/{bus,ram,rom,cpu,system}.rs`
- `docs/active/wasm-performance.md`, `src/version.ts`

<!-- /lcd-resume -->

---

## LOG (append-only; not read on resume)

- 2026-11-21 23:10 — Baseline on `master` (f7b2f3f), three runs of the existing loop: JS 65.3 / 68.9 / 70.0 M c/s, WASM 378.4 / 383.0 / 381.5 M c/s.
- 2026-11-21 — S1: sweep workload shows JS at 35 M c/s against 68 M on the tight loop; WASM unaffected (470 M).
- 2026-11-21 — S2: JS page table. vitest: tight 68 → 87 M, sweep 35 → 105 M. Owner chose "Remove them" for the Bus cache stats and `clearCache()`.
- 2026-11-21 — S3: WASM flat memory. tight 381 → 560 M, sweep 470 → 783 M. Binary 79 → 85 KB.
- 2026-11-21 — S4: dropped a branchless N/Z update + direct step call in WASM (560 → 509 M) and a JS fast-path step loop (+5% bundled, duplicates the step logic).
- 2026-11-21 — Finding: vitest understates the JS engine. Bundled with esbuild and run in Node, master does 105 M / 38 M and this branch 150 M / 178 M. Cause not confirmed (suspect: vitest's module transform). Recorded in `docs/active/wasm-performance.md`.
- 2026-11-21 — S5: engine-parity (28) and page-activity parity (4) pass against the real WASM build via `yarn dev:vite`. A scratch test ran a WOZ Monitor session (prompt, typed `FF00.FF07`, a RAM write and read-back) on both engines with identical output; the Chrome extension was not connected, so there was no in-browser check. Gate: 795 passed, 35 skipped; cargo test 25 passed; clippy clean.
