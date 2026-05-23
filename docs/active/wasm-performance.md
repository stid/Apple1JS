# WASM CPU Performance

## Summary

The WASM 6502 engine is **~14× faster than the JS engine** on raw throughput. Earlier
observations of "160 IPS" were a **metrics defect**, not an engine problem, compounded by
`yarn dev` loading an unoptimized debug WASM build.

| Build / engine              | cycles/sec | effective MHz |  vs JS |
| --------------------------- | ---------: | ------------: | -----: |
| JS (`CPU6502`)              |      ~50 M |       ~50 MHz |     1× |
| WASM `--dev` (debug)        |      ~67 M |       ~67 MHz | ~1.35× |
| WASM `--release`            |     ~644 M |      ~644 MHz | ~12.9× |
| WASM `--release` + wasm-opt |     ~708 M |      ~708 MHz | ~14.3× |

(Apple M-series, headless benchmark, RAM-only `LDA/STA/LDA/JMP` loop. Absolute numbers vary by
machine; the **ratio** is the durable result.)

In the running app **both engines are throttled by the `Clock` to the Apple-1's ~1 MHz target**, so
both show ~331 K IPS at ~100%. WASM's advantage is **headroom** — lower CPU/battery cost at 1 MHz,
and the ability to run far faster if the clock target is raised. It is not visible as a higher
in-app IPS at native speed.

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

The benchmark is gated behind `BENCH` so it never runs in normal CI. It reports cycles/sec,
instructions/sec, and the WASM/JS ratio for each engine, and prints the requested-vs-actual cycle
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
