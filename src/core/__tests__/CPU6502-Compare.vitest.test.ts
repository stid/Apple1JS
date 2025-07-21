import { describe, test, expect, beforeEach } from 'vitest';
import CPU6502 from '../cpu6502';
import ROM from '../ROM';
import RAM from '../RAM';
import Bus from '../Bus';
import { BusSpaceType } from '../types/bus';

describe('CPU6502 - Compare Operations', function () {
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

    describe('CMP - Compare with Accumulator', function () {
        test('CMP Immediate ($C9) - Equal values', function () {
            setupProgram([0xC9, 0x42]); // CMP #$42
            cpu.A = 0x42;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x42); // Accumulator unchanged
            expect(cpu.Z).toBe(1); // Zero flag set (equal)
            expect(cpu.C).toBe(1); // Carry set (A >= operand)
            expect(cpu.N).toBe(0); // Not negative
        });

        test('CMP Immediate - A greater than operand', function () {
            setupProgram([0xC9, 0x30]); // CMP #$30
            cpu.A = 0x50;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x50); // Accumulator unchanged
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.C).toBe(1); // Carry set (A >= operand)
            expect(cpu.N).toBe(0); // Not negative (0x50 - 0x30 = 0x20)
        });

        test('CMP Immediate - A less than operand', function () {
            setupProgram([0xC9, 0x60]); // CMP #$60
            cpu.A = 0x30;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x30); // Accumulator unchanged
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.C).toBe(0); // Carry clear (A < operand)
            expect(cpu.N).toBe(1); // Negative (0x30 - 0x60 = 0xD0)
        });

        test('CMP Immediate - Zero comparison', function () {
            setupProgram([0xC9, 0x00]); // CMP #$00
            cpu.A = 0x00;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x00); // Accumulator unchanged
            expect(cpu.Z).toBe(1); // Zero flag set
            expect(cpu.C).toBe(1); // Carry set (equal)
            expect(cpu.N).toBe(0); // Not negative
        });

        test('CMP Zero Page ($C5)', function () {
            ramInstance.write(0x10, 0x25);
            setupProgram([0xC5, 0x10]); // CMP $10
            cpu.A = 0x30;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x30); // Accumulator unchanged
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.C).toBe(1); // Carry set (A >= operand)
            expect(cpu.N).toBe(0); // Not negative
        });

        test('CMP Zero Page,X ($D5)', function () {
            ramInstance.write(0x15, 0x40);
            setupProgram([0xD5, 0x10]); // CMP $10,X
            cpu.A = 0x30;
            cpu.X = 0x05;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x30); // Accumulator unchanged
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.C).toBe(0); // Carry clear (A < operand)
            expect(cpu.N).toBe(1); // Negative
        });

        test('CMP Absolute ($CD)', function () {
            ramInstance.write(0x200, 0x80);
            setupProgram([0xCD, 0x00, 0x02]); // CMP $0200
            cpu.A = 0x80;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x80); // Accumulator unchanged
            expect(cpu.Z).toBe(1); // Zero flag set (equal)
            expect(cpu.C).toBe(1); // Carry set (equal)
            expect(cpu.N).toBe(0); // Not negative
        });

        test('CMP Absolute,X ($DD)', function () {
            ramInstance.write(0x210, 0x70);
            setupProgram([0xDD, 0x00, 0x02]); // CMP $0200,X
            cpu.A = 0x90;
            cpu.X = 0x10;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x90); // Accumulator unchanged
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.C).toBe(1); // Carry set (A >= operand)
            expect(cpu.N).toBe(0); // Not negative
        });

        test('CMP Absolute,Y ($D9)', function () {
            ramInstance.write(0x220, 0xFF);
            setupProgram([0xD9, 0x00, 0x02]); // CMP $0200,Y
            cpu.A = 0x80;
            cpu.Y = 0x20;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x80); // Accumulator unchanged
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.C).toBe(0); // Carry clear (A < operand)
            expect(cpu.N).toBe(1); // Negative
        });

        test('CMP Indirect,X ($C1)', function () {
            ramInstance.write(0x24, 0x00);
            ramInstance.write(0x25, 0x03);
            ramInstance.write(0x300, 0x50);
            setupProgram([0xC1, 0x20]); // CMP ($20,X)
            cpu.A = 0x50;
            cpu.X = 0x04;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x50); // Accumulator unchanged
            expect(cpu.Z).toBe(1); // Zero flag set (equal)
            expect(cpu.C).toBe(1); // Carry set (equal)
            expect(cpu.N).toBe(0); // Not negative
        });

        test('CMP Indirect,Y ($D1)', function () {
            ramInstance.write(0x20, 0x00);
            ramInstance.write(0x21, 0x03);
            ramInstance.write(0x310, 0x35);
            setupProgram([0xD1, 0x20]); // CMP ($20),Y
            cpu.A = 0x45;
            cpu.Y = 0x10;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x45); // Accumulator unchanged
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.C).toBe(1); // Carry set (A >= operand)
            expect(cpu.N).toBe(0); // Not negative
        });
    });

    describe('CPX - Compare with X Register', function () {
        test('CPX Immediate ($E0) - Equal values', function () {
            setupProgram([0xE0, 0x42]); // CPX #$42
            cpu.X = 0x42;
            
            cpu.performSingleStep();
            expect(cpu.X).toBe(0x42); // X register unchanged
            expect(cpu.Z).toBe(1); // Zero flag set (equal)
            expect(cpu.C).toBe(1); // Carry set (X >= operand)
            expect(cpu.N).toBe(0); // Not negative
        });

        test('CPX Immediate - X greater than operand', function () {
            setupProgram([0xE0, 0x30]); // CPX #$30
            cpu.X = 0x50;
            
            cpu.performSingleStep();
            expect(cpu.X).toBe(0x50); // X register unchanged
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.C).toBe(1); // Carry set (X >= operand)
            expect(cpu.N).toBe(0); // Not negative
        });

        test('CPX Immediate - X less than operand', function () {
            setupProgram([0xE0, 0x60]); // CPX #$60
            cpu.X = 0x30;
            
            cpu.performSingleStep();
            expect(cpu.X).toBe(0x30); // X register unchanged
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.C).toBe(0); // Carry clear (X < operand)
            expect(cpu.N).toBe(1); // Negative
        });

        test('CPX Zero Page ($E4)', function () {
            ramInstance.write(0x10, 0x80);
            setupProgram([0xE4, 0x10]); // CPX $10
            cpu.X = 0x80;
            
            cpu.performSingleStep();
            expect(cpu.X).toBe(0x80); // X register unchanged
            expect(cpu.Z).toBe(1); // Zero flag set (equal)
            expect(cpu.C).toBe(1); // Carry set (equal)
            expect(cpu.N).toBe(0); // Not negative
        });

        test('CPX Absolute ($EC)', function () {
            ramInstance.write(0x200, 0x70);
            setupProgram([0xEC, 0x00, 0x02]); // CPX $0200
            cpu.X = 0x90;
            
            cpu.performSingleStep();
            expect(cpu.X).toBe(0x90); // X register unchanged
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.C).toBe(1); // Carry set (X >= operand)
            expect(cpu.N).toBe(0); // Not negative
        });
    });

    describe('CPY - Compare with Y Register', function () {
        test('CPY Immediate ($C0) - Equal values', function () {
            setupProgram([0xC0, 0x42]); // CPY #$42
            cpu.Y = 0x42;
            
            cpu.performSingleStep();
            expect(cpu.Y).toBe(0x42); // Y register unchanged
            expect(cpu.Z).toBe(1); // Zero flag set (equal)
            expect(cpu.C).toBe(1); // Carry set (Y >= operand)
            expect(cpu.N).toBe(0); // Not negative
        });

        test('CPY Immediate - Y greater than operand', function () {
            setupProgram([0xC0, 0x30]); // CPY #$30
            cpu.Y = 0x50;
            
            cpu.performSingleStep();
            expect(cpu.Y).toBe(0x50); // Y register unchanged
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.C).toBe(1); // Carry set (Y >= operand)
            expect(cpu.N).toBe(0); // Not negative
        });

        test('CPY Immediate - Y less than operand', function () {
            setupProgram([0xC0, 0x60]); // CPY #$60
            cpu.Y = 0x30;
            
            cpu.performSingleStep();
            expect(cpu.Y).toBe(0x30); // Y register unchanged
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.C).toBe(0); // Carry clear (Y < operand)
            expect(cpu.N).toBe(1); // Negative
        });

        test('CPY Zero Page ($C4)', function () {
            ramInstance.write(0x10, 0x80);
            setupProgram([0xC4, 0x10]); // CPY $10
            cpu.Y = 0x80;
            
            cpu.performSingleStep();
            expect(cpu.Y).toBe(0x80); // Y register unchanged
            expect(cpu.Z).toBe(1); // Zero flag set (equal)
            expect(cpu.C).toBe(1); // Carry set (equal)
            expect(cpu.N).toBe(0); // Not negative
        });

        test('CPY Absolute ($CC)', function () {
            ramInstance.write(0x200, 0x70);
            setupProgram([0xCC, 0x00, 0x02]); // CPY $0200
            cpu.Y = 0x90;
            
            cpu.performSingleStep();
            expect(cpu.Y).toBe(0x90); // Y register unchanged
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.C).toBe(1); // Carry set (Y >= operand)
            expect(cpu.N).toBe(0); // Not negative
        });
    });
});