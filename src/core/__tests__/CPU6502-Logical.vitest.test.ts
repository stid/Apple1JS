import { describe, test, expect, beforeEach } from 'vitest';
import CPU6502 from '../cpu6502';
import ROM from '../ROM';
import RAM from '../RAM';
import Bus from '../Bus';
import { BusSpaceType } from '../types/bus';

describe('CPU6502 - Logical Operations', function () {
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

    describe('AND - Logical AND with Accumulator', function () {
        test('AND Immediate ($29) - Basic AND operation', function () {
            setupProgram([0x29, 0x0F]); // AND #$0F
            cpu.A = 0x3F;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x0F); // 0x3F & 0x0F = 0x0F
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(0);
        });

        test('AND Immediate - Zero result', function () {
            setupProgram([0x29, 0x00]); // AND #$00
            cpu.A = 0xFF;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x00); // 0xFF & 0x00 = 0x00
            expect(cpu.Z).toBe(1); // Zero flag set
            expect(cpu.N).toBe(0);
        });

        test('AND Immediate - Negative result', function () {
            setupProgram([0x29, 0x80]); // AND #$80
            cpu.A = 0xFF;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x80); // 0xFF & 0x80 = 0x80
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(1); // Negative flag set (bit 7 is 1)
        });

        test('AND Immediate - All bits cleared', function () {
            setupProgram([0x29, 0x55]); // AND #$55
            cpu.A = 0xAA;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x00); // 0xAA & 0x55 = 0x00
            expect(cpu.Z).toBe(1); // Zero flag set
            expect(cpu.N).toBe(0);
        });

        test('AND Zero Page ($25)', function () {
            ramInstance.write(0x10, 0x3C);
            setupProgram([0x25, 0x10]); // AND $10
            cpu.A = 0xFF;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x3C); // 0xFF & 0x3C = 0x3C
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(0);
        });

        test('AND Zero Page,X ($35)', function () {
            ramInstance.write(0x15, 0x7F);
            setupProgram([0x35, 0x10]); // AND $10,X
            cpu.A = 0x80;
            cpu.X = 0x05;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x00); // 0x80 & 0x7F = 0x00
            expect(cpu.Z).toBe(1);
            expect(cpu.N).toBe(0);
        });

        test('AND Absolute ($2D)', function () {
            ramInstance.write(0x200, 0xF0);
            setupProgram([0x2D, 0x00, 0x02]); // AND $0200
            cpu.A = 0x0F;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x00); // 0x0F & 0xF0 = 0x00
            expect(cpu.Z).toBe(1);
            expect(cpu.N).toBe(0);
        });

        test('AND Absolute,X ($3D)', function () {
            ramInstance.write(0x210, 0x33);
            setupProgram([0x3D, 0x00, 0x02]); // AND $0200,X
            cpu.A = 0x77;
            cpu.X = 0x10;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x33); // 0x77 & 0x33 = 0x33
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(0);
        });

        test('AND Absolute,Y ($39)', function () {
            ramInstance.write(0x220, 0xCC);
            setupProgram([0x39, 0x00, 0x02]); // AND $0200,Y
            cpu.A = 0x99;
            cpu.Y = 0x20;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x88); // 0x99 & 0xCC = 0x88
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(1); // Negative flag set
        });

        test('AND Indirect,X ($21)', function () {
            ramInstance.write(0x24, 0x00);
            ramInstance.write(0x25, 0x03);
            ramInstance.write(0x300, 0x5A);
            setupProgram([0x21, 0x20]); // AND ($20,X)
            cpu.A = 0xA5;
            cpu.X = 0x04;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x00); // 0xA5 & 0x5A = 0x00
            expect(cpu.Z).toBe(1);
            expect(cpu.N).toBe(0);
        });

        test('AND Indirect,Y ($31)', function () {
            ramInstance.write(0x20, 0x00);
            ramInstance.write(0x21, 0x03);
            ramInstance.write(0x310, 0x7E);
            setupProgram([0x31, 0x20]); // AND ($20),Y
            cpu.A = 0x81;
            cpu.Y = 0x10;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x00); // 0x81 & 0x7E = 0x00
            expect(cpu.Z).toBe(1);
            expect(cpu.N).toBe(0);
        });
    });

    describe('ORA - Logical OR with Accumulator', function () {
        test('ORA Immediate ($09) - Basic OR operation', function () {
            setupProgram([0x09, 0x0F]); // ORA #$0F
            cpu.A = 0x30;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x3F); // 0x30 | 0x0F = 0x3F
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(0);
        });

        test('ORA Immediate - Zero result', function () {
            setupProgram([0x09, 0x00]); // ORA #$00
            cpu.A = 0x00;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x00); // 0x00 | 0x00 = 0x00
            expect(cpu.Z).toBe(1); // Zero flag set
            expect(cpu.N).toBe(0);
        });

        test('ORA Immediate - Negative result', function () {
            setupProgram([0x09, 0x80]); // ORA #$80
            cpu.A = 0x00;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x80); // 0x00 | 0x80 = 0x80
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(1); // Negative flag set
        });

        test('ORA Immediate - All bits set', function () {
            setupProgram([0x09, 0x55]); // ORA #$55
            cpu.A = 0xAA;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0xFF); // 0xAA | 0x55 = 0xFF
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(1); // Negative flag set
        });

        test('ORA Zero Page ($05)', function () {
            ramInstance.write(0x10, 0x3C);
            setupProgram([0x05, 0x10]); // ORA $10
            cpu.A = 0x03;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x3F); // 0x03 | 0x3C = 0x3F
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(0);
        });

        test('ORA Zero Page,X ($15)', function () {
            ramInstance.write(0x15, 0x7F);
            setupProgram([0x15, 0x10]); // ORA $10,X
            cpu.A = 0x80;
            cpu.X = 0x05;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0xFF); // 0x80 | 0x7F = 0xFF
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(1); // Negative flag set
        });

        test('ORA Absolute ($0D)', function () {
            ramInstance.write(0x200, 0xF0);
            setupProgram([0x0D, 0x00, 0x02]); // ORA $0200
            cpu.A = 0x0F;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0xFF); // 0x0F | 0xF0 = 0xFF
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(1); // Negative flag set
        });

        test('ORA Absolute,X ($1D)', function () {
            ramInstance.write(0x210, 0x33);
            setupProgram([0x1D, 0x00, 0x02]); // ORA $0200,X
            cpu.A = 0x44;
            cpu.X = 0x10;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x77); // 0x44 | 0x33 = 0x77
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(0);
        });

        test('ORA Absolute,Y ($19)', function () {
            ramInstance.write(0x220, 0xCC);
            setupProgram([0x19, 0x00, 0x02]); // ORA $0200,Y
            cpu.A = 0x11;
            cpu.Y = 0x20;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0xDD); // 0x11 | 0xCC = 0xDD
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(1); // Negative flag set
        });

        test('ORA Indirect,X ($01)', function () {
            ramInstance.write(0x24, 0x00);
            ramInstance.write(0x25, 0x03);
            ramInstance.write(0x300, 0x5A);
            setupProgram([0x01, 0x20]); // ORA ($20,X)
            cpu.A = 0xA5;
            cpu.X = 0x04;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0xFF); // 0xA5 | 0x5A = 0xFF
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(1); // Negative flag set
        });

        test('ORA Indirect,Y ($11)', function () {
            ramInstance.write(0x20, 0x00);
            ramInstance.write(0x21, 0x03);
            ramInstance.write(0x310, 0x7E);
            setupProgram([0x11, 0x20]); // ORA ($20),Y
            cpu.A = 0x01;
            cpu.Y = 0x10;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x7F); // 0x01 | 0x7E = 0x7F
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(0);
        });
    });

    describe('EOR - Logical Exclusive OR with Accumulator', function () {
        test('EOR Immediate ($49) - Basic XOR operation', function () {
            setupProgram([0x49, 0x0F]); // EOR #$0F
            cpu.A = 0x3F;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x30); // 0x3F ^ 0x0F = 0x30
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(0);
        });

        test('EOR Immediate - Zero result', function () {
            setupProgram([0x49, 0xFF]); // EOR #$FF
            cpu.A = 0xFF;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x00); // 0xFF ^ 0xFF = 0x00
            expect(cpu.Z).toBe(1); // Zero flag set
            expect(cpu.N).toBe(0);
        });

        test('EOR Immediate - Negative result', function () {
            setupProgram([0x49, 0x80]); // EOR #$80
            cpu.A = 0x00;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x80); // 0x00 ^ 0x80 = 0x80
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(1); // Negative flag set
        });

        test('EOR Immediate - Bit inversion', function () {
            setupProgram([0x49, 0xFF]); // EOR #$FF
            cpu.A = 0x55;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0xAA); // 0x55 ^ 0xFF = 0xAA (inverted)
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(1); // Negative flag set
        });

        test('EOR Immediate - Self XOR', function () {
            setupProgram([0x49, 0x55]); // EOR #$55
            cpu.A = 0x55;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x00); // 0x55 ^ 0x55 = 0x00
            expect(cpu.Z).toBe(1); // Zero flag set
            expect(cpu.N).toBe(0);
        });

        test('EOR Zero Page ($45)', function () {
            ramInstance.write(0x10, 0x3C);
            setupProgram([0x45, 0x10]); // EOR $10
            cpu.A = 0x0F;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x33); // 0x0F ^ 0x3C = 0x33
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(0);
        });

        test('EOR Zero Page,X ($55)', function () {
            ramInstance.write(0x15, 0x7F);
            setupProgram([0x55, 0x10]); // EOR $10,X
            cpu.A = 0x80;
            cpu.X = 0x05;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0xFF); // 0x80 ^ 0x7F = 0xFF
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(1); // Negative flag set
        });

        test('EOR Absolute ($4D)', function () {
            ramInstance.write(0x200, 0xF0);
            setupProgram([0x4D, 0x00, 0x02]); // EOR $0200
            cpu.A = 0x0F;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0xFF); // 0x0F ^ 0xF0 = 0xFF
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(1); // Negative flag set
        });

        test('EOR Absolute,X ($5D)', function () {
            ramInstance.write(0x210, 0x33);
            setupProgram([0x5D, 0x00, 0x02]); // EOR $0200,X
            cpu.A = 0x44;
            cpu.X = 0x10;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x77); // 0x44 ^ 0x33 = 0x77
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(0);
        });

        test('EOR Absolute,Y ($59)', function () {
            ramInstance.write(0x220, 0xCC);
            setupProgram([0x59, 0x00, 0x02]); // EOR $0200,Y
            cpu.A = 0x33;
            cpu.Y = 0x20;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0xFF); // 0x33 ^ 0xCC = 0xFF
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(1); // Negative flag set
        });

        test('EOR Indirect,X ($41)', function () {
            ramInstance.write(0x24, 0x00);
            ramInstance.write(0x25, 0x03);
            ramInstance.write(0x300, 0x5A);
            setupProgram([0x41, 0x20]); // EOR ($20,X)
            cpu.A = 0xA5;
            cpu.X = 0x04;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0xFF); // 0xA5 ^ 0x5A = 0xFF
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(1); // Negative flag set
        });

        test('EOR Indirect,Y ($51)', function () {
            ramInstance.write(0x20, 0x00);
            ramInstance.write(0x21, 0x03);
            ramInstance.write(0x310, 0x7E);
            setupProgram([0x51, 0x20]); // EOR ($20),Y
            cpu.A = 0x81;
            cpu.Y = 0x10;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0xFF); // 0x81 ^ 0x7E = 0xFF
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(1); // Negative flag set
        });
    });
});