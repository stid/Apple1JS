---
name: wasm-optimization
description: Auto-activates when discussing WASM performance, binary size, or optimization. Guides through release build optimization and performance analysis.
---

# WASM Optimization Skill

This skill activates when discussing WebAssembly performance optimization for the Apple1JS CPU emulator.

> **Optimization goal: SPEED, not size.** The project deliberately chose `opt-level = 3` + `-O3`
> wasm-opt to reach ~14× JS raw throughput, accepting a larger binary (~155 KB release) in the
> trade. Older docs that say "<100KB" / "90KB" / `opt-level = "z"` describe an **abandoned
> size-first strategy** — do not restore it without explicit user approval (it reverses the perf
> win). See `docs/active/wasm-performance.md`.

## When This Skill Applies

- Analyzing CPU emulation performance and raw throughput
- Comparing JS vs WASM execution speed (see the IPS caveat below)
- Optimizing Rust code for WASM target
- Investigating performance regressions
- Reasoning about binary size **as a secondary trade-off** against speed

## Optimization Checklist

### Release build (speed-first)

1. **Build with release profile** (or just `yarn wasm:build:release`):

    ```bash
    cd wasm-cpu && wasm-pack build --release --target web --out-dir ../src/wasm
    ```

    `yarn dev` already builds `--release`; `yarn dev:debug-wasm` keeps the slow `--dev` build for
    Rust debugging only. Never benchmark a `--dev` build — debug Rust/WASM is ~10× slower.

2. **Current Cargo.toml settings** (`wasm-cpu/Cargo.toml`):

    ```toml
    [profile.release]
    opt-level = 3        # Optimize for SPEED (the emulation hot loop)
    lto = true           # Link-time optimization
    codegen-units = 1    # Better optimization
    strip = true         # Strip symbols

    # wasm-pack runs wasm-opt AFTER wasm-bindgen. The key MUST be profile-scoped or it is
    # silently ignored; bare `-O` fails on this module's bulk-memory / non-trapping ops.
    [package.metadata.wasm-pack.profile.release]
    wasm-opt = ['-O3', '--enable-bulk-memory', '--enable-nontrapping-float-to-int']
    ```

3. **Verify binary size**:

    ```bash
    ls -lh src/wasm/apple1_cpu_wasm_bg.wasm
    ```

    Expected: **~155 KB** release (speed-first). A drop toward ~90 KB likely means someone
    reverted to `opt-level = "z"` and gave back the speed.

### Performance Optimization

1. **Avoid allocations in hot paths**:
    - Use stack allocation where possible
    - Reuse buffers instead of creating new ones
    - Minimize Box/Vec in instruction handlers

2. **Inline critical functions**:

    ```rust
    #[inline(always)]
    fn read_byte(&self, addr: u16) -> u8 { ... }
    ```

3. **Use lookup tables**:
    - Opcode dispatch via match or array indexing
    - Pre-computed flag values where applicable

4. **Minimize JS↔WASM boundary crossings**:
    - Batch memory operations when possible
    - Use memory views instead of individual reads
    - Keep hot data in WASM memory

### Benchmarking

The real speedup is **only** measurable headless (no Clock, no React) — the benchmark is gated
behind `BENCH=1` so it never runs in normal CI:

```bash
yarn wasm:build:release
BENCH=1 npx vitest run src/core/cpu-engines/__tests__/wasm-benchmark.vitest.test.ts
```

> **Do NOT judge speed from in-app IPS.** The `Clock` throttles both engines to ~1MHz, so both
> read ~331K IPS regardless of engine — comparing them shows no difference _by design_. In-app,
> the real signal is **Host CPU** (`hostMillisPerSecond`): host wall-clock ms per emulated second,
> displayed as load% + headroom in the Performance Metrics panel. Lower = better.

Key metrics:

- **Raw cycles/sec & instructions/sec** (headless benchmark): the true throughput; WASM ≈ 14× JS.
- **Host CPU / headroom** (in-app): WASM costs ~3–4× less host CPU at the same throttled IPS.
- **Memory**: WASM heap usage vs JS memory.

### Common Performance Issues

1. **Debug builds are slow**: Always benchmark with `--release` (and `yarn dev` ships release).
2. **Judging speed by in-app IPS**: it's throttle-locked — use the headless benchmark or Host CPU.
3. **wasm-opt silently disabled**: the metadata key must be `[package.metadata.wasm-pack.profile.release]`,
   and must enable `--enable-bulk-memory --enable-nontrapping-float-to-int` or the build fails.
4. **Excessive logging**: Remove or disable in release.
5. **Memory bridge overhead**: Profile JS↔WASM calls (only I/O `$D010–$D013` should cross).
6. **String operations**: Avoid in hot paths.

## Rust/WASM Best Practices

```rust
// GOOD: Direct memory access
let byte = self.memory[addr as usize];

// BAD: Function call overhead in tight loop
let byte = self.read_memory(addr);

// GOOD: Pre-computed lookup
const FLAG_TABLE: [u8; 256] = [...];
self.flags = FLAG_TABLE[result as usize];

// BAD: Runtime computation
self.flags = if result == 0 { Z_FLAG } else { 0 } | if result & 0x80 != 0 { N_FLAG } else { 0 };
```

## Size vs Speed Trade-offs

| Setting             | Size Impact | Speed Impact |
| ------------------- | ----------- | ------------ |
| `opt-level = "z"`   | Smallest    | Slower       |
| `opt-level = "s"`   | Small       | Medium       |
| `opt-level = 3`     | Largest     | Fastest      |
| `lto = true`        | Smaller     | Faster       |
| `codegen-units = 1` | Smaller     | Faster       |

For Apple1JS, prefer `opt-level = 3` + `-O3` wasm-opt. The emulator chases raw throughput (and the
headroom to run faster-than-1MHz "turbo" modes later), so speed wins over the ~65 KB of binary that
`opt-level = "z"` would save. Only revisit size-first if the user explicitly prioritizes download
size over speed.
