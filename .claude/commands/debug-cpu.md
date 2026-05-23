# Debug CPU Command

Launch an interactive CPU debugging session with state inspection capabilities.

## Usage

- `/debug-cpu` - Start debugging session with current state
- `/debug-cpu [address]` - Set breakpoint and run to address
- `/debug-cpu trace [count]` - Execute N instructions with full trace

> **Debug data comes from the ACTIVE engine.** State (`WorkerAPI.getDebugInfo`) routes to the
> active engine's `toDebug()`, and memory (`readMemoryRange`) routes to its `readRange()`. Under
> WASM these read live WASM state/RAM — not the dormant JS `CPU6502`/`Bus`. If a panel freezes
> after switching to WASM, the cause is a read path still hardwired to `apple1.cpu`/`apple1.bus`
> instead of the active engine. (`src/core/cpu-interface/ICPUEngine.ts` defines the contract.)

## Debugging Capabilities

### State Inspection

- View all CPU registers (A, X, Y, SP, PC, P)
- Decode status flags (N, V, -, B, D, I, Z, C)
- Examine memory at any address
- View stack contents

### Execution Control

- Step single instruction
- Run to breakpoint
- Trace execution with state dumps
- Compare JS vs WASM state at each step

### Memory Analysis

- Hexdump memory regions
- Watch for memory changes
- Track I/O port access (KBD $D010, DSP $D012)

## Debug Output Format

```text
PC:$XXXX  A:$XX X:$XX Y:$XX SP:$XX  NV-BDIZC
$XXXX: XX XX XX  INSTRUCTION operand  ; disassembly

Stack: $XX $XX $XX ...
Cycles: NNNN
```

## Engine Comparison Mode

When debugging parity issues:

1. Execute instruction on both engines
2. Compare all state (registers, flags, memory writes)
3. Highlight any differences
4. Report first divergence point

## Common Debug Scenarios

- **Instruction bug**: Trace specific opcode execution
- **Memory corruption**: Watch address range for unexpected writes
- **Stack issues**: Monitor SP and stack contents
- **Timing problems**: Track cycle counts per instruction
