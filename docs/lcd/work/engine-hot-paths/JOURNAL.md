# JOURNAL — engine-hot-paths

> **The resume anchor.** The block between the `lcd-resume:v1` markers below is the _entire_
> cold-start payload. Everything below the `---` is history/detail, NOT read on resume.

<!-- lcd-resume:v1 -->

## NOW

- **Lane:** Standard
- **Goal:** Raise raw throughput of both 6502 engines by removing per-bus-access overhead, with behaviour and JS/WASM parity unchanged.
- **Next action:** S1 — add the memory-sweep workload to the headless benchmark and record the baseline.
- **Branch:** refactor/engine-hot-paths · **Updated:** 2026-11-21 23:10

## STEPS

- [ ] S1 — benchmark: add a second workload that touches >256 distinct addresses (the current loop touches 10, so it never leaves the JS Bus cache); record baseline for both ← next
- [ ] S2 — JS `Bus`: per-page decode table instead of the Map LRU + binary search (tests first: decode results identical for whole-page, partial-page, mirrored and unmapped addresses)
- [ ] S3 — WASM `Bus`: one flat 64K array + per-page kind table instead of region table + `Option<RAM>`/`Option<ROM>` + size checks (Rust tests first)
- [ ] S4 — per-instruction overheads in both step loops, only where the benchmark shows a gain
- [ ] S5 — parity suite against real WASM (`yarn dev:vite`), full gate, perf doc, version bump, PR

## DECISIONS (this work-item)

- Measure every change with the headless benchmark, alternating runs; drop any change inside the ±3% noise band.

## OPEN QUESTIONS

- The Bus inspectable/toDebug expose cache stats (`cacheHitRate`, `cacheHits`, `cacheAccesses`, `cacheSize`, `CACHE`, `HIT_RATE`, `ACCESSES`). A page table has no cache; removing them needs the owner's approval (no-downgrade rule).

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
