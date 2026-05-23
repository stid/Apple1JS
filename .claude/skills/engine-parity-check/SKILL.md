---
name: engine-parity-check
description: Auto-activates when modifying CPU instructions or engine code. Ensures JS and WASM engines produce identical behavior.
---

# Engine Parity Check Skill

This skill activates when working on CPU instruction implementations to ensure both JS and WASM engines behave identically.

## When This Skill Applies

- Adding new 6502 instructions
- Modifying instruction behavior
- Fixing CPU emulation bugs
- Working on addressing modes
- Changing flag calculations

## Parity Requirements

Both engines MUST produce identical:

1. **Register values** (A, X, Y, SP, PC)
2. **Status flags** (N, V, B, D, I, Z, C)
3. **Memory writes** (same address, same value)
4. **Cycle counts** (for timing accuracy)

## Verification Process

### Step 1: Identify Affected Instructions

When modifying code, list all affected opcodes:

```text
Instruction: ADC (Add with Carry)
Opcodes: $69 (imm), $65 (zp), $75 (zpx), $6D (abs), $7D (abx), $79 (aby), $61 (izx), $71 (izy)
```

### Step 2: Check Both Implementations

**JavaScript** (`src/core/cpu6502/instructions.ts`):

```typescript
private ADC(value: number): void {
    // Check implementation
}
```

**Rust** (`wasm-cpu/src/instructions_bus_impl.rs` — the bus-aware path that runs in-app;
`instructions.rs` is the non-bus reference):

```rust
fn adc(&mut self, value: u8) {
    // Check implementation
}
```

### Step 3: Create Test Cases

For each instruction, test:

```typescript
describe('ADC instruction parity', () => {
    it('should match JS and WASM for immediate mode', async () => {
        // Setup identical state
        jsEngine.setRegister('A', 0x50);
        wasmEngine.setRegister('A', 0x50);

        // Execute same instruction
        jsEngine.execute(0x69, 0x50); // ADC #$50
        wasmEngine.execute(0x69, 0x50);

        // Compare all state
        expect(jsEngine.getState()).toEqual(wasmEngine.getState());
    });
});
```

### Step 4: Edge Cases to Test

Always verify these scenarios:

| Test Case       | Description                       |
| --------------- | --------------------------------- |
| Zero result     | Result is exactly 0x00            |
| Negative result | Result has bit 7 set              |
| Carry out       | Result > 0xFF                     |
| Overflow        | Signed overflow occurred          |
| Page crossing   | Address crosses page boundary     |
| Wrap-around     | Address wraps from $FFFF to $0000 |

## Common Parity Issues

### 1. Flag Calculation Differences

```rust
// WRONG: Different evaluation order
let n_flag = (result & 0x80) != 0;
let z_flag = result == 0;

// RIGHT: Match JS exactly
let z_flag = (result & 0xFF) == 0;
let n_flag = (result & 0x80) != 0;
```

### 2. Cycle Count Mismatches

```rust
// JS counts page boundary crossing
cycles += if page_crossed { 1 } else { 0 };

// WASM must match
self.cycles += if self.page_crossed() { 1 } else { 0 };
```

### 3. Memory Access Order

```rust
// Write order matters for memory-mapped I/O
// Both engines must write in same order
self.write(addr, low_byte);
self.write(addr + 1, high_byte);
```

## Quick Parity Test

Run this to verify parity for common operations (vitest uses `-t` to filter by test name):

```bash
yarn test -t parity
```

The dedicated suite is `src/core/cpu-engines/__tests__/engine-parity.vitest.test.ts`. Note it
**skips** when the WASM module can't be fetched under the vitest runner; the headless benchmark's
`file://` fetch shim is the working pattern to make it load. Or use the `/engine-test` command.

## Debugging Parity Failures

1. **Enable tracing** in both engines
2. **Step through** instruction by instruction
3. **Compare state** after each step
4. **Find first divergence** point
5. **Fix root cause** in the divergent engine

## File References

| Component    | JS Location                                   | Rust Location (in-app = bus-aware)                                               |
| ------------ | --------------------------------------------- | -------------------------------------------------------------------------------- |
| CPU Core     | `src/core/cpu6502/core.ts`                    | `wasm-cpu/src/cpu.rs`, `system.rs`                                               |
| Instructions | `src/core/cpu6502/instructions.ts`            | `instructions_with_bus.rs` + `instructions_bus_impl.rs` (ref: `instructions.rs`) |
| Opcodes      | `src/core/cpu6502/opcodes.ts`                 | `opcodes_with_bus.rs` (ref: `opcodes.rs`)                                        |
| Tests        | `src/core/__tests__/CPU6502-*.vitest.test.ts` | `wasm-cpu/tests/`                                                                |
