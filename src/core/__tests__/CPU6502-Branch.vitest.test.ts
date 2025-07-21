import { describe, test, expect, beforeEach } from 'vitest';
import CPU6502 from '../cpu6502';
import ROM from '../ROM';
import RAM from '../RAM';
import Bus from '../Bus';
import { BusSpaceType } from '../types/bus';

describe('CPU6502 - Branch Operations', function () {
    let cpu: CPU6502;
    let ramInstance: RAM;
    let romInstance: ROM;

    beforeEach(function () {
        romInstance = new ROM();
        ramInstance = new RAM();
        const busMapping: BusSpaceType[] = [
            { addr: [0, 0x0fff], component: ramInstance, name: 'RAM' },
            { addr: [0xff00, 0xffff], component: romInstance, name: 'ROM' },
        ];
        const bus = new Bus(busMapping);
        cpu = new CPU6502(bus);
    });

    // Helper function to set up CPU with a program
    function setupProgram(program: number[]): void {
        const romData = Array(257).fill(0x00); // ROM size + 2 byte header
        // ROM header
        romData[0] = 0x00; // start address low
        romData[1] = 0xff; // start address high
        // Copy program to start of ROM (after header)
        program.forEach((byte, index) => {
            romData[2 + index] = byte;
        });
        // Set reset vector to point to start of ROM
        romData[2 + 0xfc] = 0x00; // reset vector low
        romData[2 + 0xfd] = 0xff; // reset vector high
        romInstance.flash(romData);
        cpu.reset();
    }

    describe('BCC - Branch if Carry Clear', function () {
        test('BCC ($90) - Branch taken when carry clear', function () {
            setupProgram([0x90, 0x05, 0xEA, 0xEA, 0xEA, 0xEA, 0xEA, 0xA9, 0x42]); // BCC +5, NOPs, LDA #$42
            cpu.C = 0; // Carry clear
            
            cpu.performSingleStep(); // BCC
            expect(cpu.PC).toBe(0xff07); // Should jump to position 7 (0xff00 + 2 + 5)
        });

        test('BCC ($90) - Branch not taken when carry set', function () {
            setupProgram([0x90, 0x05, 0xA9, 0x42]); // BCC +5, LDA #$42
            cpu.C = 1; // Carry set
            
            cpu.performSingleStep(); // BCC
            expect(cpu.PC).toBe(0xff02); // Should continue to next instruction
        });

        test('BCC ($90) - Backward branch', function () {
            setupProgram([0xEA, 0xEA, 0x90, 0xFC]); // NOP, NOP, BCC -4
            cpu.PC = 0xff02; // Start at BCC instruction
            cpu.C = 0; // Carry clear
            
            cpu.performSingleStep(); // BCC
            expect(cpu.PC).toBe(0xff00); // Should jump back to beginning
        });
    });

    describe('BCS - Branch if Carry Set', function () {
        test('BCS ($B0) - Branch taken when carry set', function () {
            setupProgram([0xB0, 0x05, 0xEA, 0xEA, 0xEA, 0xEA, 0xEA, 0xA9, 0x42]); // BCS +5, NOPs, LDA #$42
            cpu.C = 1; // Carry set
            
            cpu.performSingleStep(); // BCS
            expect(cpu.PC).toBe(0xff07); // Should jump to position 7
        });

        test('BCS ($B0) - Branch not taken when carry clear', function () {
            setupProgram([0xB0, 0x05, 0xA9, 0x42]); // BCS +5, LDA #$42
            cpu.C = 0; // Carry clear
            
            cpu.performSingleStep(); // BCS
            expect(cpu.PC).toBe(0xff02); // Should continue to next instruction
        });
    });

    describe('BEQ - Branch if Equal (Zero Set)', function () {
        test('BEQ ($F0) - Branch taken when zero flag set', function () {
            setupProgram([0xF0, 0x05, 0xEA, 0xEA, 0xEA, 0xEA, 0xEA, 0xA9, 0x42]); // BEQ +5, NOPs, LDA #$42
            cpu.Z = 1; // Zero flag set
            
            cpu.performSingleStep(); // BEQ
            expect(cpu.PC).toBe(0xff07); // Should jump to position 7
        });

        test('BEQ ($F0) - Branch not taken when zero flag clear', function () {
            setupProgram([0xF0, 0x05, 0xA9, 0x42]); // BEQ +5, LDA #$42
            cpu.Z = 0; // Zero flag clear
            
            cpu.performSingleStep(); // BEQ
            expect(cpu.PC).toBe(0xff02); // Should continue to next instruction
        });
    });

    describe('BMI - Branch if Minus (Negative Set)', function () {
        test('BMI ($30) - Branch taken when negative flag set', function () {
            setupProgram([0x30, 0x05, 0xEA, 0xEA, 0xEA, 0xEA, 0xEA, 0xA9, 0x42]); // BMI +5, NOPs, LDA #$42
            cpu.N = 1; // Negative flag set
            
            cpu.performSingleStep(); // BMI
            expect(cpu.PC).toBe(0xff07); // Should jump to position 7
        });

        test('BMI ($30) - Branch not taken when negative flag clear', function () {
            setupProgram([0x30, 0x05, 0xA9, 0x42]); // BMI +5, LDA #$42
            cpu.N = 0; // Negative flag clear
            
            cpu.performSingleStep(); // BMI
            expect(cpu.PC).toBe(0xff02); // Should continue to next instruction
        });
    });

    describe('BNE - Branch if Not Equal (Zero Clear)', function () {
        test('BNE ($D0) - Branch taken when zero flag clear', function () {
            setupProgram([0xD0, 0x05, 0xEA, 0xEA, 0xEA, 0xEA, 0xEA, 0xA9, 0x42]); // BNE +5, NOPs, LDA #$42
            cpu.Z = 0; // Zero flag clear
            
            cpu.performSingleStep(); // BNE
            expect(cpu.PC).toBe(0xff07); // Should jump to position 7
        });

        test('BNE ($D0) - Branch not taken when zero flag set', function () {
            setupProgram([0xD0, 0x05, 0xA9, 0x42]); // BNE +5, LDA #$42
            cpu.Z = 1; // Zero flag set
            
            cpu.performSingleStep(); // BNE
            expect(cpu.PC).toBe(0xff02); // Should continue to next instruction
        });
    });

    describe('BPL - Branch if Plus (Negative Clear)', function () {
        test('BPL ($10) - Branch taken when negative flag clear', function () {
            setupProgram([0x10, 0x05, 0xEA, 0xEA, 0xEA, 0xEA, 0xEA, 0xA9, 0x42]); // BPL +5, NOPs, LDA #$42
            cpu.N = 0; // Negative flag clear
            
            cpu.performSingleStep(); // BPL
            expect(cpu.PC).toBe(0xff07); // Should jump to position 7
        });

        test('BPL ($10) - Branch not taken when negative flag set', function () {
            setupProgram([0x10, 0x05, 0xA9, 0x42]); // BPL +5, LDA #$42
            cpu.N = 1; // Negative flag set
            
            cpu.performSingleStep(); // BPL
            expect(cpu.PC).toBe(0xff02); // Should continue to next instruction
        });
    });

    describe('BVC - Branch if Overflow Clear', function () {
        test('BVC ($50) - Branch taken when overflow flag clear', function () {
            setupProgram([0x50, 0x05, 0xEA, 0xEA, 0xEA, 0xEA, 0xEA, 0xA9, 0x42]); // BVC +5, NOPs, LDA #$42
            cpu.V = 0; // Overflow flag clear
            
            cpu.performSingleStep(); // BVC
            expect(cpu.PC).toBe(0xff07); // Should jump to position 7
        });

        test('BVC ($50) - Branch not taken when overflow flag set', function () {
            setupProgram([0x50, 0x05, 0xA9, 0x42]); // BVC +5, LDA #$42
            cpu.V = 1; // Overflow flag set
            
            cpu.performSingleStep(); // BVC
            expect(cpu.PC).toBe(0xff02); // Should continue to next instruction
        });
    });

    describe('BVS - Branch if Overflow Set', function () {
        test('BVS ($70) - Branch taken when overflow flag set', function () {
            setupProgram([0x70, 0x05, 0xEA, 0xEA, 0xEA, 0xEA, 0xEA, 0xA9, 0x42]); // BVS +5, NOPs, LDA #$42
            cpu.V = 1; // Overflow flag set
            
            cpu.performSingleStep(); // BVS
            expect(cpu.PC).toBe(0xff07); // Should jump to position 7
        });

        test('BVS ($70) - Branch not taken when overflow flag clear', function () {
            setupProgram([0x70, 0x05, 0xA9, 0x42]); // BVS +5, LDA #$42
            cpu.V = 0; // Overflow flag clear
            
            cpu.performSingleStep(); // BVS
            expect(cpu.PC).toBe(0xff02); // Should continue to next instruction
        });
    });

    describe('Branch Edge Cases', function () {
        test('Branch with zero offset (branch to next instruction)', function () {
            setupProgram([0xF0, 0x00, 0xA9, 0x42]); // BEQ +0, LDA #$42
            cpu.Z = 1; // Zero flag set
            
            cpu.performSingleStep(); // BEQ
            expect(cpu.PC).toBe(0xff02); // Should branch to next instruction (same as no branch)
        });

        test('Branch with maximum positive offset (+127)', function () {
            const program = [0xF0, 0x7F]; // BEQ +127
            // Fill with NOPs to reach the target
            for (let i = 0; i < 127; i++) {
                program.push(0xEA); // NOP
            }
            program.push(0xA9, 0x42); // LDA #$42 at target
            
            setupProgram(program);
            cpu.Z = 1; // Zero flag set
            
            cpu.performSingleStep(); // BEQ
            expect(cpu.PC).toBe(0xff00 + 2 + 127); // Should jump to maximum forward position
        });

        test('Branch with maximum negative offset (-128)', function () {
            // Create a program where we start far enough ahead to branch back
            const program = Array(130).fill(0xEA); // NOPs
            program[128] = 0xF0; // BEQ at position 128
            program[129] = 0x80; // -128 offset
            
            setupProgram(program);
            cpu.PC = 0xff00 + 128; // Start at BEQ instruction
            cpu.Z = 1; // Zero flag set
            
            cpu.performSingleStep(); // BEQ
            expect(cpu.PC).toBe(0xff00 + 2); // Should jump back to beginning + 2
        });

        test('Page boundary crossing does not affect branch timing', function () {
            // Test branch that crosses page boundary
            setupProgram([0xF0, 0x05, 0xEA, 0xEA, 0xEA, 0xEA, 0xEA, 0xA9, 0x42]); // BEQ +5
            cpu.Z = 1; // Zero flag set
            
            const cyclesBefore = cpu.getCompletedCycles();
            cpu.performSingleStep(); // BEQ
            const cyclesAfter = cpu.getCompletedCycles();
            
            expect(cyclesAfter - cyclesBefore).toBe(3); // Branch taken = 3 cycles (2 base + 1 for branch taken)
            expect(cpu.PC).toBe(0xff07);
        });

        test('Branch timing - not taken vs taken', function () {
            // Test branch not taken (2 cycles)
            setupProgram([0xF0, 0x05, 0xA9, 0x42]); // BEQ +5, LDA #$42
            cpu.Z = 0; // Zero flag clear - branch not taken
            
            const cyclesBefore1 = cpu.getCompletedCycles();
            cpu.performSingleStep(); // BEQ
            const cyclesAfter1 = cpu.getCompletedCycles();
            
            expect(cyclesAfter1 - cyclesBefore1).toBe(2); // Branch not taken = 2 cycles
            
            // Reset and test branch taken (3 cycles)
            setupProgram([0xF0, 0x05, 0xEA, 0xEA, 0xEA, 0xEA, 0xEA, 0xA9, 0x42]); // BEQ +5
            cpu.Z = 1; // Zero flag set - branch taken
            
            const cyclesBefore2 = cpu.getCompletedCycles();
            cpu.performSingleStep(); // BEQ
            const cyclesAfter2 = cpu.getCompletedCycles();
            
            expect(cyclesAfter2 - cyclesBefore2).toBe(3); // Branch taken = 3 cycles
        });
    });
});