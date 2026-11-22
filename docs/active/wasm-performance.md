# WASM CPU Performance

## Summary

The WASM 6502 engine is **about 6× faster than the JS engine** in the headless vitest benchmark,
and **about 4× faster than the JS engine as it ships** (bundled). Earlier observations of
"160 IPS" were a **metrics defect**, not an engine problem, compounded by `yarn dev` loading an
unoptimized debug WASM build.

Measured 2026-11-21 after the bus-decode rewrite below, three runs each, on the two benchmark
workloads (cycles/sec, vitest):

| Engine                      | Tight loop | Memory sweep |
| --------------------------- | ---------: | -----------: |
| JS (`CPU6502`)              |      ~87 M |       ~105 M |
| WASM `--release` + wasm-opt |     ~560 M |       ~783 M |
| WASM / JS                   |      ~6.4× |        ~7.5× |

**The vitest benchmark understates the JS engine.** The same JS engine bundled with esbuild and
run in plain Node (the form the browser gets from the production build) does ~150 M cycles/s on
the tight loop and ~178 M on the memory sweep, about 1.7× its vitest figure. Against those the
WASM engine is ~3.7× and ~4.4× faster. The gap is measured; its cause is not confirmed (the
likely one is vitest's module transform, which turns references across modules, such as the
opcode table, into property lookups). WASM runs the same binary either way. Use the vitest
figures to compare a change against its baseline, not as the ratio a user gets.

### Bus-decode rewrite (2026-11-21)

Both engines spent much of each bus access finding out which device an address belongs to.

- **JS `Bus`** looked every address up in a 256-entry `Map` used as an LRU cache and fell back to
  a binary search plus an eviction on a miss. A program touching more than 256 addresses missed
  constantly. It now reads one entry of a 256-entry per-page table; only a page that is partly
  mapped or shared between devices still gets the binary search (none on the Apple 1).
- **WASM `Bus`** went through a 64K region table, an `Option` check on the RAM/ROM component, a
  size comparison and a `Vec` bounds check. It now holds the whole address space in one
  `[u8; 65536]` (RAM, the ROM image at `$FF00`, `0xFF` where nothing answers) with one kind per
  page, so a RAM or ROM access is a table load and an array load with no range check.

| Engine (cycles/sec)   | Workload     | Before | After | Change |
| --------------------- | ------------ | -----: | ----: | -----: |
| JS, vitest            | tight loop   |   68 M |  87 M |   +28% |
| JS, vitest            | memory sweep |   35 M | 105 M |  +200% |
| JS, bundled           | tight loop   |  105 M | 150 M |   +43% |
| JS, bundled           | memory sweep |   38 M | 178 M |  +370% |
| WASM                  | tight loop   |  381 M | 560 M |   +47% |
| WASM                  | memory sweep |  470 M | 783 M |   +67% |

The memory sweep was added to the benchmark for this work: the original tight loop touches ten
addresses, so it never left the JS cache and could not show the cost of a miss. The release
binary grew from 79 KB to 85 KB.

Tried and dropped, because they measured no better or worse: a branchless N/Z flag update and a
direct step call in the WASM run loop (560 M → 509 M on the tight loop), and a JS step loop that
skips the debug-mode checks when none is enabled (+5% bundled, for a second copy of the step
logic).

### History of the headline ratio

Before the rewrite the vitest benchmark gave ~67 M JS / ~366 M WASM = ~5.5× (2026-11-21, three
runs: 5.39×, 5.48×, 5.61×; rustc 1.100.0, wasm-pack 0.15.1, wasm-opt 133). The measurement before
that (2026-09, before the #238 toolchain refresh) was ~56 M JS / ~443 M WASM = 7.8×: over the
refresh JS became about 20% faster and WASM about 17% slower, and the release binary shrank from
~155 KB to ~127 KB. `-O3` was still applied (the shipped binary was byte-identical in size to a
manual `wasm-opt -O3` of the unoptimized build), so the configuration was intact; the likely cause
is code generation in the newer rustc/wasm-opt, which has not been confirmed.

After the 2026-11 dead-code removal (only `WasmSystem` is exported to JS now) the release binary
was ~75 KB with throughput unchanged to slightly better: ~374 M cycles/s, 5.6× JS.

### Cost of the bus-activity counters (2026-11-21, #247)

Both engines count the CPU's bus accesses per 256-byte page for the Board's live activity (one
array increment per access; `docs/lcd/DECISIONS.md` D-016). Measured against `master` with the
headless benchmark, eight runs each, alternating the two checkouts so drift affects both alike:

| Engine | Before (mean) | After (mean) | Change |
| ------ | ------------: | -----------: | -----: |
| JS     |    68.2 M c/s |   67.0 M c/s |  −1.7% |
| WASM   |   381.0 M c/s |  363.0 M c/s |  −4.7% |

Run-to-run spread is about ±3% on JS and ±2% on WASM, so the JS figure is within noise and the
WASM figure is a real but small cost. The benchmark loop is close to the worst case: ten bus
accesses in eleven cycles. The release binary grew from 75.0 KB to 79.1 KB.

A first version used a `Float64Array` on the JS engine and cost it 6.9%. A `Uint32Array` brought
that down to the figure above, which is why the counters are 32-bit and wrap on both engines.

(Apple M-series, headless benchmark. The tight loop is a RAM-only `LDA #/STA zp/LDA zp/JMP` =
11 cycles per 4 instructions; the memory sweep is a `(zp),Y` block copy over eight pages of each
RAM bank. Absolute numbers vary by machine; the **ratio** is the durable result.)

The "~14×" figure this doc used to quote was measured while the WASM engine **over-reported
cycles** (issue #215: bus helpers and opcode arms both counted, ~1.8× on this loop). The
instruction rate, which the defect never touched, gives the same answer: ~161 M vs ~18.8 M
instr/s ≈ 8.5×. The debug (`--dev`) and no-wasm-opt rows were dropped rather than re-measured;
their old values (~67 M / ~644 M) carry the same inflation.

In the running app **both engines are throttled by the `Clock` to the Apple-1's ~1 MHz target**, so
both show ~331 K IPS at ~100%. WASM's advantage is **headroom** — lower CPU/battery cost at 1 MHz,
and the ability to run far faster if the clock target is raised. It is not visible as a higher
in-app IPS at native speed.

### Making the headroom visible: the Host CPU metric

Because throttled IPS is identical, the debugger's Performance Metrics panel also reports a
**Host CPU** figure: the host wall-clock milliseconds each engine spends executing per emulated
second, shown as a load percentage and an "Nx headroom" multiplier (how much faster than 1 MHz the
engine could run unthrottled). Each engine accumulates `performance.now()` time around its
`performBulkSteps` call and divides by emulated seconds (`totalCycles / 1e6`) in `getMetrics()`
(`hostMillisPerSecond`). On an Apple M-series machine a typical idle WozMon loop reads roughly:

| Engine | Host CPU | Headroom |
| ------ | -------: | -------: |
| JS     |   ~1.2 % |    ~85 × |
| WASM   |  ~0.33 % |   ~300 × |

Same IPS, but WASM costs ~3–4 × less host CPU — the real, always-on signal of the gain.

### Debugger parity under WASM

The debugger's CPU State, Execution, Stack, Memory and Disassembly panels source from the _active_
engine. `WorkerAPI.getDebugInfo()` calls the active engine's `toDebug()` (added to `ICPUEngine`,
implemented by `JSEngine`, `WasmEngine`, and delegated by `DualEngine`) and `readMemoryRange()`
reads through the active engine's `readRange()`. Previously these were hardwired to the JS
`CPU6502`/`Bus`, which is dormant while WASM runs, so the panels froze on switch to WASM.

## Root causes that were fixed

1. **Metric undercount (the "160 IPS").** `WasmEngine.performBulkSteps` called `updateMetrics`,
   which increments the instruction counter by **one per bulk call** — so the displayed IPS was the
   Clock's tick rate (~160/s), not instructions/sec. Now it accounts for the whole batch the same
   way `JSEngine` does. Also removed the `averageIPS` override that used the Rust
   `(instructions/cycles)·1e6` figure (an idealized instructions-per-1 MHz number, not wall-clock
   IPS); `updateIPSMetrics` now computes a real wall-clock rate for both engines.

2. **`yarn dev` shipped a debug WASM build** (`wasm:build:dev`, `--dev`). Debug Rust/WASM is ~10×
   slower. `dev` now builds `--release`; `dev:debug-wasm` keeps the debug path for Rust debugging.
   (Production `build` already used `--release`.)

3. **`wasm-opt` was silently disabled and the release build failed when it ran.** The old
   `[package.metadata.wasm-pack]` key was the wrong shape (ignored). It is now
   `[package.metadata.wasm-pack.profile.release]` with
   `wasm-opt = ['-O3', '--enable-bulk-memory', '--enable-nontrapping-float-to-int']` — the feature
   flags the module actually uses (the `nontrapping-float-to-int` op was the real failure, not bulk
   memory). Release builds now complete and produce a ~155 KB binary.

Not a cause: **`run_cycles` does not early-break** — the benchmark confirmed it executes 100% of
requested cycles. No missing opcodes in the bus-aware dispatch.

## Benchmarking

Raw, headless throughput (no Clock, no React, no worker):

```bash
# Build the optimized WASM first (use the rustup toolchain, see Build note below)
yarn wasm:build:release
BENCH=1 npx vitest run src/core/cpu-engines/__tests__/wasm-benchmark.vitest.test.ts
```

The benchmark is gated behind `BENCH` so it never runs in normal CI. It runs two workloads (a
tight loop and a memory sweep) and reports cycles/sec, instructions/sec, and the WASM/JS ratio for
each engine, and prints the requested-vs-actual cycle
count (so an early-break regression would be obvious).

## Build note (toolchain)

`wasm-pack` needs the `wasm32-unknown-unknown` target. Homebrew's `rustc` (`/opt/homebrew/bin`)
lacks it and is not a rustup install. Build with the rustup toolchain on PATH:

```bash
export PATH="$HOME/.rustup/toolchains/stable-aarch64-apple-darwin/bin:$HOME/.cargo/bin:$PATH"
```

## Possible future work

- Raise (or make configurable) the `Clock` target speed to expose the WASM headroom for users who
  want a faster-than-1 MHz machine.
- Make the parity suite (`engine-parity.vitest.test.ts`) load WASM reliably under the full vitest
  run (it currently skips when Vite's asset serving doesn't provide the `.wasm`) so JS/WASM numeric
  parity is enforced in CI — the benchmark's `file://` fetch shim is a working pattern to reuse.
