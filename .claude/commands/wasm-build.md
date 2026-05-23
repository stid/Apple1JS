# WASM Build Command

Build the WASM CPU module for Apple1JS dual-engine system.

## Usage

- `/wasm-build` - Release build, the default (`yarn wasm:build:release`, speed-optimized, ~155KB)
- `/wasm-build dev` - Debug build for Rust debugging only (`yarn wasm:build:dev`) — **~10× slower,
  never benchmark or ship it**

> `yarn dev` already builds `--release`; use the dev build only via `yarn dev:debug-wasm`.

## Steps

1. Change to the wasm-cpu directory
2. Run wasm-pack with appropriate flags:
    - **Dev**: `wasm-pack build --dev --target web --out-dir ../src/wasm`
    - **Release**: `wasm-pack build --release --target web --out-dir ../src/wasm`
3. Verify the output files exist in `src/wasm/`:
    - `apple1_cpu_wasm.js`
    - `apple1_cpu_wasm.d.ts`
    - `apple1_cpu_wasm_bg.wasm`
4. Report the WASM binary size
5. For release builds, expect **~155KB** (speed-first `opt-level = 3` + `-O3` wasm-opt). A drop
   toward ~90KB means someone reverted to size-first `opt-level = "z"` — flag it, don't celebrate it.

## Expected Output

Report:

- Build mode (dev/release)
- Binary size in KB
- Build success/failure status
- Any warnings from cargo/wasm-pack
