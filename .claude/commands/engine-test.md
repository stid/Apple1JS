# Engine Test Command

Run dual-engine parity tests to verify JS and WASM CPU implementations behave identically.

## Usage

- `/engine-test` - Run all engine parity tests
- `/engine-test [instruction]` - Test specific instruction (e.g., `/engine-test LDA`)

## Steps

1. Ensure WASM module is built: `yarn wasm:build:release` (run `/wasm-build` if needed)
2. Run the parity suite (vitest filters by test name with `-t`):

    ```bash
    yarn test -t parity
    # dedicated file: src/core/cpu-engines/__tests__/engine-parity.vitest.test.ts
    ```

    Note: the parity suite **skips** when the WASM module can't be fetched under the vitest runner.
    If it skips, it isn't verifying anything — make WASM load (the headless benchmark's `file://`
    fetch shim is the working pattern) before trusting a green result.

3. To test a specific instruction, narrow the name filter (e.g. `yarn test -t "ADC"`).
4. Report any discrepancies between JS and WASM behavior.

## What to Check

- **State consistency**: Both engines should produce identical CPU state after same operations
- **Flag handling**: All status flags (N, Z, C, V, etc.) must match
- **Memory operations**: Read/write behavior through the bus must be identical
- **Cycle counts**: Both engines should report same cycle counts

## Expected Output

- Number of parity tests run (and whether the suite ran or skipped)
- Pass/fail status for each engine
- Any behavioral differences found
- For speed, use `/benchmark` (headless) — in-app IPS is throttle-locked and won't differ
