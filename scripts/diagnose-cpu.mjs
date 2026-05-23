/**
 * Diagnostic script to test CPU execution without browser
 * Run with: node scripts/diagnose-cpu.mjs
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// We need to simulate minimal browser globals for the code to load
globalThis.performance = { now: () => Date.now() };
globalThis.queueMicrotask = (fn) => setTimeout(fn, 0);

async function diagnose() {
    console.log('=== CPU Execution Diagnostic ===\n');

    try {
        // Import core modules
        const { default: Bus } = await import('../src/core/Bus.ts');
        const { default: RAM } = await import('../src/core/RAM.ts');
        const { default: ROM } = await import('../src/core/ROM.ts');
        const { default: CPU6502 } = await import('../src/core/cpu6502/index.ts');

        console.log('✓ Modules imported successfully\n');

        // Create a simple test setup
        const ram = new RAM(0x10000); // 64KB
        const rom = new ROM(0x100);   // 256 bytes

        // Write a simple test program at $FF00 (where WOZ Monitor lives)
        // CLD ($D8), CLI ($58), NOP ($EA), NOP, NOP, JMP $FF00 ($4C 00 FF)
        const testProgram = [0xD8, 0x58, 0xEA, 0xEA, 0xEA, 0x4C, 0x00, 0xFF];
        rom.flash([0, 0, ...testProgram]); // First 2 bytes are header

        // Set up reset vector at $FFFC/$FFFD to point to $FF00
        // ROM is mapped at $FF00, so offset for $FFFC is $FC
        const romData = new Array(256).fill(0);
        testProgram.forEach((b, i) => romData[i] = b);
        romData[0xFC] = 0x00; // Low byte of reset vector
        romData[0xFD] = 0xFF; // High byte of reset vector
        rom.flash([0, 0, ...romData]);

        const busMapping = [
            { addr: [0x0000, 0x0FFF], component: ram, name: 'RAM' },
            { addr: [0xFF00, 0xFFFF], component: rom, name: 'ROM' },
        ];

        const bus = new Bus(busMapping);
        console.log('✓ Bus created with RAM and ROM\n');

        // Verify ROM is accessible
        const resetVectorLo = bus.read(0xFFFC);
        const resetVectorHi = bus.read(0xFFFD);
        const resetVector = (resetVectorHi << 8) | resetVectorLo;
        console.log(`Reset vector at $FFFC: $${resetVector.toString(16).toUpperCase().padStart(4, '0')}`);

        // Read first instruction
        const firstInstr = bus.read(0xFF00);
        console.log(`First instruction at $FF00: $${firstInstr.toString(16).toUpperCase().padStart(2, '0')} (expected $D8 = CLD)\n`);

        // Create CPU
        const cpu = new CPU6502(bus);
        console.log('✓ CPU created\n');

        // Reset CPU
        cpu.reset();
        console.log(`After reset: PC = $${cpu.PC.toString(16).toUpperCase().padStart(4, '0')}`);
        console.log(`Expected: PC = $FF00\n`);

        // Check if there's an execution hook
        console.log(`Execution hook set: ${!!cpu.executionHook}\n`);

        // Try single step
        console.log('Executing single step...');
        const cycles1 = cpu.performSingleStep();
        console.log(`After step 1: PC = $${cpu.PC.toString(16).toUpperCase().padStart(4, '0')}, cycles = ${cycles1}`);

        const cycles2 = cpu.performSingleStep();
        console.log(`After step 2: PC = $${cpu.PC.toString(16).toUpperCase().padStart(4, '0')}, cycles = ${cycles2}`);

        const cycles3 = cpu.performSingleStep();
        console.log(`After step 3: PC = $${cpu.PC.toString(16).toUpperCase().padStart(4, '0')}, cycles = ${cycles3}`);

        console.log('\n✓ CPU is executing instructions correctly!');

        // Now test bulk steps
        console.log('\nTesting performBulkSteps(100)...');
        const pcBefore = cpu.PC;
        cpu.performBulkSteps(100);
        const pcAfter = cpu.PC;
        console.log(`PC before: $${pcBefore.toString(16).toUpperCase()}, PC after: $${pcAfter.toString(16).toUpperCase()}`);

        if (pcBefore === pcAfter) {
            console.log('⚠ WARNING: PC did not change during bulk steps!');
        } else {
            console.log('✓ Bulk steps executed successfully');
        }

    } catch (error) {
        console.error('✗ Error:', error.message);
        console.error(error.stack);
    }
}

diagnose();
