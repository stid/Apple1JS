import { describe, test, expect, beforeEach } from 'vitest';
import CPU6502 from '../cpu6502';
import ROM from '../ROM';
import RAM from '../RAM';
import Bus from '../Bus';
import { BusSpaceType } from '../types/bus';

describe('CPU6502 - Load/Store Operations', function () {
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

    describe('LDA - Load Accumulator', function () {
        test('LDA Immediate ($A9) - Load immediate value', function () {
            setupProgram([0xA9, 0x42]); // LDA #$42
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x42);
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(0);
            expect(cpu.PC).toBe(0xff02);
        });

        test('LDA Immediate - Zero flag', function () {
            setupProgram([0xA9, 0x00]); // LDA #$00
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x00);
            expect(cpu.Z).toBe(1);
            expect(cpu.N).toBe(0);
        });

        test('LDA Immediate - Negative flag', function () {
            setupProgram([0xA9, 0x80]); // LDA #$80
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x80);
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(1);
        });

        test('LDA Zero Page ($A5)', function () {
            ramInstance.write(0x10, 0x33);
            setupProgram([0xA5, 0x10]); // LDA $10
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x33);
            expect(cpu.PC).toBe(0xff02);
        });

        test('LDA Zero Page,X ($B5)', function () {
            ramInstance.write(0x15, 0x44);
            setupProgram([0xB5, 0x10]); // LDA $10,X
            cpu.X = 0x05;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x44);
        });

        test('LDA Absolute ($AD)', function () {
            ramInstance.write(0x200, 0x55);
            setupProgram([0xAD, 0x00, 0x02]); // LDA $0200
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x55);
        });

        test('LDA Absolute,X ($BD)', function () {
            ramInstance.write(0x210, 0x66);
            setupProgram([0xBD, 0x00, 0x02]); // LDA $0200,X
            cpu.X = 0x10;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x66);
        });

        test('LDA Absolute,Y ($B9)', function () {
            ramInstance.write(0x220, 0x77);
            setupProgram([0xB9, 0x00, 0x02]); // LDA $0200,Y
            cpu.Y = 0x20;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x77);
        });

        test('LDA Indirect,X ($A1)', function () {
            ramInstance.write(0x24, 0x00);
            ramInstance.write(0x25, 0x03);
            ramInstance.write(0x300, 0x88);
            setupProgram([0xA1, 0x20]); // LDA ($20,X)
            cpu.X = 0x04;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x88);
        });

        test('LDA Indirect,Y ($B1)', function () {
            ramInstance.write(0x20, 0x00);
            ramInstance.write(0x21, 0x03);
            ramInstance.write(0x310, 0x99);
            setupProgram([0xB1, 0x20]); // LDA ($20),Y
            cpu.Y = 0x10;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x99);
        });
    });

    describe('LDX - Load X Register', function () {
        test('LDX Immediate ($A2)', function () {
            setupProgram([0xA2, 0x42]); // LDX #$42
            
            cpu.performSingleStep();
            expect(cpu.X).toBe(0x42);
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(0);
        });

        test('LDX Zero Page ($A6)', function () {
            ramInstance.write(0x10, 0x33);
            setupProgram([0xA6, 0x10]); // LDX $10
            
            cpu.performSingleStep();
            expect(cpu.X).toBe(0x33);
        });

        test('LDX Zero Page,Y ($B6)', function () {
            ramInstance.write(0x15, 0x44);
            setupProgram([0xB6, 0x10]); // LDX $10,Y
            cpu.Y = 0x05;
            
            cpu.performSingleStep();
            expect(cpu.X).toBe(0x44);
        });

        test('LDX Absolute ($AE)', function () {
            ramInstance.write(0x200, 0x55);
            setupProgram([0xAE, 0x00, 0x02]); // LDX $0200
            
            cpu.performSingleStep();
            expect(cpu.X).toBe(0x55);
        });

        test('LDX Absolute,Y ($BE)', function () {
            ramInstance.write(0x210, 0x66);
            setupProgram([0xBE, 0x00, 0x02]); // LDX $0200,Y
            cpu.Y = 0x10;
            
            cpu.performSingleStep();
            expect(cpu.X).toBe(0x66);
        });
    });

    describe('LDY - Load Y Register', function () {
        test('LDY Immediate ($A0)', function () {
            setupProgram([0xA0, 0x42]); // LDY #$42
            
            cpu.performSingleStep();
            expect(cpu.Y).toBe(0x42);
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(0);
        });

        test('LDY Zero Page ($A4)', function () {
            ramInstance.write(0x10, 0x33);
            setupProgram([0xA4, 0x10]); // LDY $10
            
            cpu.performSingleStep();
            expect(cpu.Y).toBe(0x33);
        });

        test('LDY Zero Page,X ($B4)', function () {
            ramInstance.write(0x15, 0x44);
            setupProgram([0xB4, 0x10]); // LDY $10,X
            cpu.X = 0x05;
            
            cpu.performSingleStep();
            expect(cpu.Y).toBe(0x44);
        });

        test('LDY Absolute ($AC)', function () {
            ramInstance.write(0x200, 0x55);
            setupProgram([0xAC, 0x00, 0x02]); // LDY $0200
            
            cpu.performSingleStep();
            expect(cpu.Y).toBe(0x55);
        });

        test('LDY Absolute,X ($BC)', function () {
            ramInstance.write(0x210, 0x66);
            setupProgram([0xBC, 0x00, 0x02]); // LDY $0200,X
            cpu.X = 0x10;
            
            cpu.performSingleStep();
            expect(cpu.Y).toBe(0x66);
        });
    });

    describe('STA - Store Accumulator', function () {
        test('STA Zero Page ($85)', function () {
            setupProgram([0x85, 0x10]); // STA $10
            cpu.A = 0x42;
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x10)).toBe(0x42);
        });

        test('STA Zero Page,X ($95)', function () {
            setupProgram([0x95, 0x10]); // STA $10,X
            cpu.A = 0x33;
            cpu.X = 0x05;
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x15)).toBe(0x33);
        });

        test('STA Absolute ($8D)', function () {
            setupProgram([0x8D, 0x00, 0x02]); // STA $0200
            cpu.A = 0x44;
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x200)).toBe(0x44);
        });

        test('STA Absolute,X ($9D)', function () {
            setupProgram([0x9D, 0x00, 0x02]); // STA $0200,X
            cpu.A = 0x55;
            cpu.X = 0x10;
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x210)).toBe(0x55);
        });

        test('STA Absolute,Y ($99)', function () {
            setupProgram([0x99, 0x00, 0x02]); // STA $0200,Y
            cpu.A = 0x66;
            cpu.Y = 0x20;
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x220)).toBe(0x66);
        });

        test('STA Indirect,X ($81)', function () {
            ramInstance.write(0x24, 0x00);
            ramInstance.write(0x25, 0x03);
            setupProgram([0x81, 0x20]); // STA ($20,X)
            cpu.A = 0x77;
            cpu.X = 0x04;
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x300)).toBe(0x77);
        });

        test('STA Indirect,Y ($91)', function () {
            ramInstance.write(0x20, 0x00);
            ramInstance.write(0x21, 0x03);
            setupProgram([0x91, 0x20]); // STA ($20),Y
            cpu.A = 0x88;
            cpu.Y = 0x10;
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x310)).toBe(0x88);
        });
    });

    describe('STX - Store X Register', function () {
        test('STX Zero Page ($86)', function () {
            setupProgram([0x86, 0x10]); // STX $10
            cpu.X = 0x42;
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x10)).toBe(0x42);
        });

        test('STX Zero Page,Y ($96)', function () {
            setupProgram([0x96, 0x10]); // STX $10,Y
            cpu.X = 0x33;
            cpu.Y = 0x05;
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x15)).toBe(0x33);
        });

        test('STX Absolute ($8E)', function () {
            setupProgram([0x8E, 0x00, 0x02]); // STX $0200
            cpu.X = 0x44;
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x200)).toBe(0x44);
        });
    });

    describe('STY - Store Y Register', function () {
        test('STY Zero Page ($84)', function () {
            setupProgram([0x84, 0x10]); // STY $10
            cpu.Y = 0x42;
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x10)).toBe(0x42);
        });

        test('STY Zero Page,X ($94)', function () {
            setupProgram([0x94, 0x10]); // STY $10,X
            cpu.Y = 0x33;
            cpu.X = 0x05;
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x15)).toBe(0x33);
        });

        test('STY Absolute ($8C)', function () {
            setupProgram([0x8C, 0x00, 0x02]); // STY $0200
            cpu.Y = 0x44;
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x200)).toBe(0x44);
        });
    });
});