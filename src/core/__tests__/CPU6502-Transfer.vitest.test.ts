import { describe, test, expect, beforeEach } from 'vitest';
import CPU6502 from '../cpu6502';
import ROM from '../ROM';
import RAM from '../RAM';
import Bus from '../Bus';
import { BusSpaceType } from '../types/bus';

describe('CPU6502 - Transfer Operations', function () {
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

    describe('TAX - Transfer Accumulator to X', function () {
        test('TAX ($AA) - Basic transfer', function () {
            setupProgram([0xAA]); // TAX
            cpu.A = 0x42;
            cpu.X = 0x00;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x42); // Accumulator unchanged
            expect(cpu.X).toBe(0x42); // X now equals A
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.N).toBe(0); // Not negative
        });

        test('TAX - Zero transfer', function () {
            setupProgram([0xAA]); // TAX
            cpu.A = 0x00;
            cpu.X = 0xFF;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x00); // Accumulator unchanged
            expect(cpu.X).toBe(0x00); // X now equals A
            expect(cpu.Z).toBe(1); // Zero flag set
            expect(cpu.N).toBe(0); // Not negative
        });

        test('TAX - Negative transfer', function () {
            setupProgram([0xAA]); // TAX
            cpu.A = 0x80;
            cpu.X = 0x00;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x80); // Accumulator unchanged
            expect(cpu.X).toBe(0x80); // X now equals A
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.N).toBe(1); // Negative flag set
        });
    });

    describe('TAY - Transfer Accumulator to Y', function () {
        test('TAY ($A8) - Basic transfer', function () {
            setupProgram([0xA8]); // TAY
            cpu.A = 0x42;
            cpu.Y = 0x00;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x42); // Accumulator unchanged
            expect(cpu.Y).toBe(0x42); // Y now equals A
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.N).toBe(0); // Not negative
        });

        test('TAY - Zero transfer', function () {
            setupProgram([0xA8]); // TAY
            cpu.A = 0x00;
            cpu.Y = 0xFF;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x00); // Accumulator unchanged
            expect(cpu.Y).toBe(0x00); // Y now equals A
            expect(cpu.Z).toBe(1); // Zero flag set
            expect(cpu.N).toBe(0); // Not negative
        });

        test('TAY - Negative transfer', function () {
            setupProgram([0xA8]); // TAY
            cpu.A = 0x80;
            cpu.Y = 0x00;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x80); // Accumulator unchanged
            expect(cpu.Y).toBe(0x80); // Y now equals A
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.N).toBe(1); // Negative flag set
        });
    });

    describe('TXA - Transfer X to Accumulator', function () {
        test('TXA ($8A) - Basic transfer', function () {
            setupProgram([0x8A]); // TXA
            cpu.X = 0x42;
            cpu.A = 0x00;
            
            cpu.performSingleStep();
            expect(cpu.X).toBe(0x42); // X unchanged
            expect(cpu.A).toBe(0x42); // A now equals X
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.N).toBe(0); // Not negative
        });

        test('TXA - Zero transfer', function () {
            setupProgram([0x8A]); // TXA
            cpu.X = 0x00;
            cpu.A = 0xFF;
            
            cpu.performSingleStep();
            expect(cpu.X).toBe(0x00); // X unchanged
            expect(cpu.A).toBe(0x00); // A now equals X
            expect(cpu.Z).toBe(1); // Zero flag set
            expect(cpu.N).toBe(0); // Not negative
        });

        test('TXA - Negative transfer', function () {
            setupProgram([0x8A]); // TXA
            cpu.X = 0x80;
            cpu.A = 0x00;
            
            cpu.performSingleStep();
            expect(cpu.X).toBe(0x80); // X unchanged
            expect(cpu.A).toBe(0x80); // A now equals X
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.N).toBe(1); // Negative flag set
        });
    });

    describe('TYA - Transfer Y to Accumulator', function () {
        test('TYA ($98) - Basic transfer', function () {
            setupProgram([0x98]); // TYA
            cpu.Y = 0x42;
            cpu.A = 0x00;
            
            cpu.performSingleStep();
            expect(cpu.Y).toBe(0x42); // Y unchanged
            expect(cpu.A).toBe(0x42); // A now equals Y
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.N).toBe(0); // Not negative
        });

        test('TYA - Zero transfer', function () {
            setupProgram([0x98]); // TYA
            cpu.Y = 0x00;
            cpu.A = 0xFF;
            
            cpu.performSingleStep();
            expect(cpu.Y).toBe(0x00); // Y unchanged
            expect(cpu.A).toBe(0x00); // A now equals Y
            expect(cpu.Z).toBe(1); // Zero flag set
            expect(cpu.N).toBe(0); // Not negative
        });

        test('TYA - Negative transfer', function () {
            setupProgram([0x98]); // TYA
            cpu.Y = 0x80;
            cpu.A = 0x00;
            
            cpu.performSingleStep();
            expect(cpu.Y).toBe(0x80); // Y unchanged
            expect(cpu.A).toBe(0x80); // A now equals Y
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.N).toBe(1); // Negative flag set
        });
    });

    describe('TSX - Transfer Stack Pointer to X', function () {
        test('TSX ($BA) - Basic transfer', function () {
            setupProgram([0xBA]); // TSX
            cpu.S = 0x42;
            cpu.X = 0x00;
            
            cpu.performSingleStep();
            expect(cpu.S).toBe(0x42); // Stack pointer unchanged
            expect(cpu.X).toBe(0x42); // X now equals S
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.N).toBe(0); // Not negative
        });

        test('TSX - Zero transfer', function () {
            setupProgram([0xBA]); // TSX
            cpu.S = 0x00;
            cpu.X = 0xFF;
            
            cpu.performSingleStep();
            expect(cpu.S).toBe(0x00); // Stack pointer unchanged
            expect(cpu.X).toBe(0x00); // X now equals S
            expect(cpu.Z).toBe(1); // Zero flag set
            expect(cpu.N).toBe(0); // Not negative
        });

        test('TSX - Negative transfer', function () {
            setupProgram([0xBA]); // TSX
            cpu.S = 0x80;
            cpu.X = 0x00;
            
            cpu.performSingleStep();
            expect(cpu.S).toBe(0x80); // Stack pointer unchanged
            expect(cpu.X).toBe(0x80); // X now equals S
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.N).toBe(1); // Negative flag set
        });

        test('TSX - Stack pointer at FF (typical)', function () {
            setupProgram([0xBA]); // TSX
            cpu.S = 0xFF;
            cpu.X = 0x00;
            
            cpu.performSingleStep();
            expect(cpu.S).toBe(0xFF); // Stack pointer unchanged
            expect(cpu.X).toBe(0xFF); // X now equals S
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.N).toBe(1); // Negative flag set
        });
    });

    describe('TXS - Transfer X to Stack Pointer', function () {
        test('TXS ($9A) - Basic transfer', function () {
            setupProgram([0x9A]); // TXS
            cpu.X = 0x42;
            cpu.S = 0x00;
            
            cpu.performSingleStep();
            expect(cpu.X).toBe(0x42); // X unchanged
            expect(cpu.S).toBe(0x42); // S now equals X
            // TXS does not affect flags
            expect(cpu.Z).toBe(1); // Initial reset state
            expect(cpu.N).toBe(0); // Initial reset state
        });

        test('TXS - Zero transfer', function () {
            setupProgram([0x9A]); // TXS
            cpu.X = 0x00;
            cpu.S = 0xFF;
            
            cpu.performSingleStep();
            expect(cpu.X).toBe(0x00); // X unchanged
            expect(cpu.S).toBe(0x00); // S now equals X
            // TXS does not affect flags
            expect(cpu.Z).toBe(1); // Initial reset state
            expect(cpu.N).toBe(0); // Initial reset state
        });

        test('TXS - Negative transfer', function () {
            setupProgram([0x9A]); // TXS
            cpu.X = 0x80;
            cpu.S = 0x00;
            
            cpu.performSingleStep();
            expect(cpu.X).toBe(0x80); // X unchanged
            expect(cpu.S).toBe(0x80); // S now equals X
            // TXS does not affect flags
            expect(cpu.Z).toBe(1); // Initial reset state
            expect(cpu.N).toBe(0); // Initial reset state
        });

        test('TXS - Set stack pointer to FF', function () {
            setupProgram([0x9A]); // TXS
            cpu.X = 0xFF;
            cpu.S = 0x00;
            
            cpu.performSingleStep();
            expect(cpu.X).toBe(0xFF); // X unchanged
            expect(cpu.S).toBe(0xFF); // S now equals X
            // TXS does not affect flags
            expect(cpu.Z).toBe(1); // Initial reset state
            expect(cpu.N).toBe(0); // Initial reset state
        });
    });
});