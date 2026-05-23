# Performance Compare Command

Compare performance between JS and WASM CPU engine implementations.

## Usage

- `/perf-compare` - Run standard performance comparison
- `/perf-compare [iterations]` - Specify number of iterations (default: 1000000)

> **In-app IPS won't show a difference** — the `Clock` throttles both engines to ~1MHz, so both
> read ~331K IPS by design. Compare **raw throughput** (headless benchmark) and **Host CPU /
> headroom** (in-app) instead. See `docs/active/wasm-performance.md`.

## Steps

1. Ensure both engines are available:
    - JS engine (always available)
    - WASM engine: `yarn wasm:build:release` (never benchmark a `--dev` build)

2. Run the headless benchmark (the source of truth for raw speed):

    ```bash
    BENCH=1 npx vitest run src/core/cpu-engines/__tests__/wasm-benchmark.vitest.test.ts
    ```

    It executes identical workloads through `CPU6502.performBulkSteps` and `wasmSystem.run_cycles`,
    reports real cycles/sec & instructions/sec, and the requested-vs-actual cycle count.

3. Test scenarios:
    - Simple instructions (NOP loop)
    - Arithmetic operations
    - Memory-intensive operations
    - Branch-heavy code

## Metrics to Report

| Metric              | JS Engine | WASM Engine | Ratio |
| ------------------- | --------- | ----------- | ----- |
| Raw IPS (headless)  | X         | Y           | Y/X   |
| Host CPU % (in-app) | X         | Y           | -     |
| Headroom × (in-app) | X         | Y           | -     |
| Memory (MB)         | X         | Y           | -     |

## Expected Results

- WASM raw throughput ≈ 14× JS (headless; the ratio is durable, absolute numbers vary by machine)
- WASM costs ~3–4× less Host CPU at the same throttled in-app IPS
- WASM should use ~50% less memory
- Engine switch time should be <10ms

## Output

Provide formatted comparison table and recommendation on which engine to use for different scenarios.
