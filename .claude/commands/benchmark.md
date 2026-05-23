# Benchmark Command

Track and record JS vs WASM performance metrics over time to monitor optimization progress.

> **Measure raw throughput headless, not in-app IPS.** The `Clock` throttles both engines to
> ~1MHz, so in-app IPS is identical (~331K) by design. The real ~14× gain only shows in the gated
> headless benchmark, after `yarn wasm:build:release`:
> `BENCH=1 npx vitest run src/core/cpu-engines/__tests__/wasm-benchmark.vitest.test.ts`. In-app,
> compare **Host CPU / headroom** instead. See `docs/active/wasm-performance.md`.

## Usage

- `/benchmark` - Run benchmark and display current metrics
- `/benchmark save` - Run benchmark and save results for historical tracking
- `/benchmark history` - Show performance trends over recent benchmarks

## Benchmark Suite

### 1. Instruction Throughput

- NOP loop (1M iterations)
- ADC/SBC arithmetic loop
- Memory copy routine (256 bytes)

### 2. Real-World Scenarios

- Apple 1 BASIC initialization
- Woz Monitor command processing
- Typical program execution patterns

### 3. Engine Operations

- Cold start initialization time
- Engine switch latency
- State serialization/deserialization

## Metrics Tracked

- **Raw throughput** (headless): cycles/sec & instructions/sec — the true speed signal (WASM ≈ 14× JS)
- **Host CPU / headroom** (in-app): host ms per emulated second; the real difference at throttled IPS
- **Cycle Accuracy**: Verify cycle counts match reference
- **Memory Efficiency**: Heap usage during execution
- **Binary Size**: WASM module size (~155KB release, speed-first — see note below)

## Output Format

```text
=== Apple1JS Performance Benchmark ===
Date: YYYY-MM-DD HH:MM
WASM Binary: XXX KB

Engine     | Raw IPS    | Host CPU   | Memory  | Init
-----------|------------|------------|---------|-------
JS         | X.XX M/s   | X.X% / Nx  | XX MB   | XX ms
WASM       | X.XX M/s   | X.X% / Nx  | XX MB   | XX ms
Speedup    | X.Xx       | -XX%       | -XX%    | -XX%

Target Status: [MET/NOT MET]
- Raw WASM IPS clearly > JS (headless): [status]
- Memory < 50% of JS: [status]
(Binary size is ~155KB, speed-first; not a "<100KB" target anymore.)
```

## Historical Tracking

When using `save`, append results to performance log for trend analysis.
