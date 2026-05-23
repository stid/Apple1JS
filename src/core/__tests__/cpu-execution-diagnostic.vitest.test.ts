/**
 * CPU Execution Diagnostic Test
 *
 * This test verifies that the CPU can actually execute instructions
 * when used through the DualEngine.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Bus from '../Bus';
import RAM from '../RAM';
import ROM from '../ROM';
import CPU6502 from '../cpu6502';
import { JSEngine } from '../cpu-engines/JSEngine';
import { DualEngine } from '../cpu-engines/DualEngine';

describe('CPU Execution Diagnostic', () => {
    let bus: Bus;
    let ram: RAM;
    let rom: ROM;

    beforeEach(() => {
        // Create memory components
        ram = new RAM(0x10000); // 64KB RAM
        rom = new ROM(0x100);   // 256 bytes ROM

        // Create a simple test program at ROM start
        // CLD ($D8), CLI ($58), LDA #$42, NOP, JMP $FF00
        const romData = new Array(256).fill(0xEA); // Fill with NOPs
        romData[0x00] = 0xD8; // CLD
        romData[0x01] = 0x58; // CLI
        romData[0x02] = 0xA9; // LDA #
        romData[0x03] = 0x42; // $42
        romData[0x04] = 0xEA; // NOP
        romData[0x05] = 0x4C; // JMP
        romData[0x06] = 0x00; // $FF00 low
        romData[0x07] = 0xFF; // $FF00 high

        // Set reset vector to $FF00
        romData[0xFC] = 0x00; // Low byte
        romData[0xFD] = 0xFF; // High byte

        rom.flash([0, 0, ...romData]);

        // Create bus with proper memory mapping
        bus = new Bus([
            { addr: [0x0000, 0x0FFF], component: ram, name: 'RAM' },
            { addr: [0xFF00, 0xFFFF], component: rom, name: 'ROM' },
        ]);
    });

    it('should verify bus can read ROM', () => {
        const resetLo = bus.read(0xFFFC);
        const resetHi = bus.read(0xFFFD);
        expect(resetLo).toBe(0x00);
        expect(resetHi).toBe(0xFF);

        const firstInstr = bus.read(0xFF00);
        expect(firstInstr).toBe(0xD8); // CLD
    });

    it('should execute instructions with raw CPU6502', () => {
        const cpu = new CPU6502(bus);
        cpu.reset();

        console.log(`[Test] After reset: PC = $${cpu.PC.toString(16)}`);
        expect(cpu.PC).toBe(0xFF00);

        // Execute first instruction (CLD)
        const cycles1 = cpu.performSingleStep();
        console.log(`[Test] After CLD: PC = $${cpu.PC.toString(16)}, cycles = ${cycles1}`);
        expect(cpu.PC).toBe(0xFF01);
        expect(cycles1).toBeGreaterThan(0);

        // Execute second instruction (CLI)
        const cycles2 = cpu.performSingleStep();
        console.log(`[Test] After CLI: PC = $${cpu.PC.toString(16)}, cycles = ${cycles2}`);
        expect(cpu.PC).toBe(0xFF02);

        // Execute third instruction (LDA #$42)
        const cycles3 = cpu.performSingleStep();
        console.log(`[Test] After LDA: PC = $${cpu.PC.toString(16)}, A = $${cpu.A.toString(16)}, cycles = ${cycles3}`);
        expect(cpu.PC).toBe(0xFF04);
        expect(cpu.A).toBe(0x42);
    });

    it('should execute bulk steps with raw CPU6502', () => {
        const cpu = new CPU6502(bus);
        cpu.reset();

        const pcBefore = cpu.PC;
        cpu.performBulkSteps(100);
        const pcAfter = cpu.PC;

        console.log(`[Test] Bulk steps: PC before = $${pcBefore.toString(16)}, after = $${pcAfter.toString(16)}`);

        // PC should have advanced (it will loop due to JMP $FF00)
        // A should be $42 after LDA #$42
        expect(cpu.A).toBe(0x42);
    });

    it('should execute with JSEngine', () => {
        const engine = new JSEngine(bus);
        engine.reset();

        const regs = engine.getRegisters();
        console.log(`[Test] JSEngine after reset: PC = $${regs.PC.toString(16)}`);
        expect(regs.PC).toBe(0xFF00);

        // Execute single step
        const cycles = engine.performSingleStep();
        const regsAfter = engine.getRegisters();
        console.log(`[Test] JSEngine after step: PC = $${regsAfter.PC.toString(16)}, cycles = ${cycles}`);
        expect(regsAfter.PC).toBe(0xFF01);
    });

    it('should execute with DualEngine (JS mode)', async () => {
        const dualEngine = new DualEngine(bus, 'JS');
        await dualEngine.initialize();

        dualEngine.reset();

        const regs = dualEngine.getRegisters();
        console.log(`[Test] DualEngine after reset: PC = $${regs.PC.toString(16)}, engine = ${dualEngine.engineType}`);
        expect(regs.PC).toBe(0xFF00);
        expect(dualEngine.engineType).toBe('JS');

        // Execute single step
        const cycles = dualEngine.performSingleStep();
        const regsAfter = dualEngine.getRegisters();
        console.log(`[Test] DualEngine after step: PC = $${regsAfter.PC.toString(16)}, cycles = ${cycles}`);
        expect(regsAfter.PC).toBe(0xFF01);
        expect(cycles).toBeGreaterThan(0);
    });

    it('should execute bulk steps with DualEngine', async () => {
        const dualEngine = new DualEngine(bus, 'JS');
        await dualEngine.initialize();

        dualEngine.reset();

        const pcBefore = dualEngine.getRegisters().PC;
        dualEngine.performBulkSteps(100);
        const pcAfter = dualEngine.getRegisters().PC;
        const A = dualEngine.getRegisters().A;

        console.log(`[Test] DualEngine bulk: PC before = $${pcBefore.toString(16)}, after = $${pcAfter.toString(16)}, A = $${A.toString(16)}`);

        // A should be $42 after executing LDA #$42
        expect(A).toBe(0x42);
    });

    it('should work with execution hook that returns true', async () => {
        const dualEngine = new DualEngine(bus, 'JS');
        await dualEngine.initialize();

        // Get internal CPU and set an execution hook that always returns true
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const internalCPU = (dualEngine as any).getInternalCPU();
        let hookCallCount = 0;
        internalCPU.setExecutionHook(() => {
            hookCallCount++;
            return true; // Continue execution
        });

        dualEngine.reset();
        dualEngine.performBulkSteps(100);

        console.log(`[Test] Hook called ${hookCallCount} times`);
        expect(hookCallCount).toBeGreaterThan(0);
        expect(dualEngine.getRegisters().A).toBe(0x42);
    });

    it('should stop with execution hook that returns false', async () => {
        const dualEngine = new DualEngine(bus, 'JS');
        await dualEngine.initialize();

        // Get internal CPU and set an execution hook that always returns false
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const internalCPU = (dualEngine as any).getInternalCPU();
        internalCPU.setExecutionHook((pc: number) => {
            console.log(`[Test] Hook called at PC=$${pc.toString(16).toUpperCase()}, returning false`);
            return false; // Stop execution
        });

        dualEngine.reset();
        const pcBefore = dualEngine.getRegisters().PC;
        dualEngine.performBulkSteps(100);
        const pcAfter = dualEngine.getRegisters().PC;

        console.log(`[Test] With false hook: PC before = $${pcBefore.toString(16)}, after = $${pcAfter.toString(16)}`);

        // PC should NOT have advanced because hook returns false
        expect(pcAfter).toBe(pcBefore);
    });
});
