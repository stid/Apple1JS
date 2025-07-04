---

## 🧪 6502 CPU Test Guidelines

When implementing CPU6502 tests, follow these patterns to avoid common mistakes:

### 🏗️ Test File Structure
- **File naming**: `CPU6502-[Category].test.ts` (e.g., `CPU6502-Stack.test.ts`)
- **One test file per logical opcode group** (Arithmetic, Stack, Branch, etc.)
- **Follow existing test file patterns** from `CPU6502-Arithmetic.test.ts`

### 🔧 Test Setup Patterns
```typescript
// ALWAYS use this exact setupProgram pattern:
function setupProgram(program: number[]): void {
    const romData = Array(257).fill(0x00); // ROM size + 2 byte header
    romData[0] = 0x00; // start address low
    romData[1] = 0xff; // start address high
    program.forEach((byte, index) => {
        romData[2 + index] = byte;
    });
    // CRITICAL: Reset vector MUST point to 0xff00
    romData[2 + 0xfc] = 0x00; // reset vector low
    romData[2 + 0xfd] = 0xff; // reset vector high
    romInstance.flash(romData);
    cpu.reset();
}
```

### 🎯 CPU Property Names (Common Mistakes)
- **Stack Pointer**: Use `cpu.S` (NOT `cpu.SP`)
- **Program Counter**: Use `cpu.PC`
- **Accumulator**: Use `cpu.A`
- **Index Registers**: Use `cpu.X`, `cpu.Y`
- **Status Flags**: Use `cpu.N`, `cpu.V`, `cpu.D`, `cpu.I`, `cpu.Z`, `cpu.C`
- **NO B Flag Property**: The B flag doesn't exist as a CPU property - it's handled internally by PHP/PLP

### 🏗️ Stack Operations Specifics
- **Stack Base**: Stack is at `0x0100 + cpu.S`
- **Push Operations**: Decrement `cpu.S` after write
- **Pull Operations**: Increment `cpu.S` before read
- **Stack Wraparound**: Stack pointer wraps at 0x00/0xFF boundary

### 🚩 Status Flag Behavior
- **After Reset**: `cpu.I = 1`, `cpu.Z = 1`, others typically 0
- **PHP Instruction**: Always sets bits 4&5 (0x30) in pushed value
- **PLP Instruction**: Ignores bits 4&5 from pulled value
- **Flag Calculations**: 
  - `Z = 1` when result is 0x00
  - `N = 1` when bit 7 is set
  - Status byte format: `NV11DIZC` (bits 4&5 always 1 in PHP)

### 📝 Test Coverage Patterns
For each opcode group, include tests for:
1. **Basic functionality** with typical values
2. **Edge cases**: zero values, negative values, overflow
3. **Flag behavior**: proper setting/clearing of status flags
4. **Address modes**: all supported addressing modes for the opcode
5. **Memory boundaries**: wraparound, different memory locations
6. **Integration**: multiple operations in sequence

### 🔍 Common Test Debugging
- **Check reset vector**: Ensure points to 0xff00
- **Verify setup**: Run setup before each test
- **Flag state**: Remember reset sets I=1, Z=1
- **Expected values**: Calculate manually, don't guess
- **Memory addresses**: Stack is 0x0100-0x01FF range

### 📋 Test Naming Convention
```typescript
test('OPCODE ($HEX) - Description', function () {
    // e.g., test('PHA ($48) - Push accumulator to stack'
});
```

### ⚠️ Critical Checks Before Committing
1. All tests pass: `yarn test [testfile]`
2. No TypeScript errors: Property names are correct
3. Expected values are calculated correctly (especially for status flags)
4. Reset vector points to correct address (0xff00)
5. setupProgram is called in each test

---
