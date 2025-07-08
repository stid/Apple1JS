import CPU6502 from '../CPU6502';
import ROM from '../ROM';
import RAM from '../RAM';
import Bus from '../Bus';
import { BusSpaceType } from '../types/bus';

describe('CPU6502 - Shift and Rotate Operations', function () {
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

    describe('ASL - Arithmetic Shift Left', function () {
        test('ASL Accumulator ($0A) - Basic shift left', function () {
            setupProgram([0x0A]); // ASL A
            cpu.A = 0x42;
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x84); // 0x42 << 1 = 0x84
            expect(cpu.C).toBe(0); // No carry out
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(1); // Bit 7 set
        });

        test('ASL Accumulator - Carry out', function () {
            setupProgram([0x0A]); // ASL A
            cpu.A = 0x80;
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x00); // 0x80 << 1 = 0x00 (with carry)
            expect(cpu.C).toBe(1); // Carry out
            expect(cpu.Z).toBe(1); // Zero result
            expect(cpu.N).toBe(0);
        });

        test('ASL Accumulator - Zero result', function () {
            setupProgram([0x0A]); // ASL A
            cpu.A = 0x00;
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x00); // 0x00 << 1 = 0x00
            expect(cpu.C).toBe(0); // No carry
            expect(cpu.Z).toBe(1); // Zero flag
            expect(cpu.N).toBe(0);
        });

        test('ASL Zero Page ($06)', function () {
            ramInstance.write(0x10, 0x55);
            setupProgram([0x06, 0x10]); // ASL $10
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x10)).toBe(0xAA); // 0x55 << 1 = 0xAA
            expect(cpu.C).toBe(0); // No carry
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(1); // Bit 7 set
        });

        test('ASL Zero Page,X ($16)', function () {
            ramInstance.write(0x15, 0x40);
            setupProgram([0x16, 0x10]); // ASL $10,X
            cpu.X = 0x05;
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x15)).toBe(0x80); // 0x40 << 1 = 0x80
            expect(cpu.C).toBe(0); // No carry
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(1); // Bit 7 set
        });

        test('ASL Absolute ($0E)', function () {
            ramInstance.write(0x200, 0x7F);
            setupProgram([0x0E, 0x00, 0x02]); // ASL $0200
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x200)).toBe(0xFE); // 0x7F << 1 = 0xFE
            expect(cpu.C).toBe(0); // No carry
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(1); // Bit 7 set
        });

        test('ASL Absolute,X ($1E)', function () {
            ramInstance.write(0x210, 0x81);
            setupProgram([0x1E, 0x00, 0x02]); // ASL $0200,X
            cpu.X = 0x10;
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x210)).toBe(0x02); // 0x81 << 1 = 0x02 (with carry)
            expect(cpu.C).toBe(1); // Carry out
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(0);
        });
    });

    describe('LSR - Logical Shift Right', function () {
        test('LSR Accumulator ($4A) - Basic shift right', function () {
            setupProgram([0x4A]); // LSR A
            cpu.A = 0x42;
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x21); // 0x42 >> 1 = 0x21
            expect(cpu.C).toBe(0); // No carry out
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(0); // Always clears bit 7
        });

        test('LSR Accumulator - Carry out', function () {
            setupProgram([0x4A]); // LSR A
            cpu.A = 0x81;
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x40); // 0x81 >> 1 = 0x40
            expect(cpu.C).toBe(1); // Carry out from bit 0
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(0);
        });

        test('LSR Accumulator - Zero result', function () {
            setupProgram([0x4A]); // LSR A
            cpu.A = 0x01;
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x00); // 0x01 >> 1 = 0x00
            expect(cpu.C).toBe(1); // Carry out
            expect(cpu.Z).toBe(1); // Zero flag
            expect(cpu.N).toBe(0);
        });

        test('LSR Zero Page ($46)', function () {
            ramInstance.write(0x10, 0xAA);
            setupProgram([0x46, 0x10]); // LSR $10
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x10)).toBe(0x55); // 0xAA >> 1 = 0x55
            expect(cpu.C).toBe(0); // No carry
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(0);
        });

        test('LSR Zero Page,X ($56)', function () {
            ramInstance.write(0x15, 0xFF);
            setupProgram([0x56, 0x10]); // LSR $10,X
            cpu.X = 0x05;
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x15)).toBe(0x7F); // 0xFF >> 1 = 0x7F
            expect(cpu.C).toBe(1); // Carry out
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(0);
        });

        test('LSR Absolute ($4E)', function () {
            ramInstance.write(0x200, 0x80);
            setupProgram([0x4E, 0x00, 0x02]); // LSR $0200
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x200)).toBe(0x40); // 0x80 >> 1 = 0x40
            expect(cpu.C).toBe(0); // No carry
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(0);
        });

        test('LSR Absolute,X ($5E)', function () {
            ramInstance.write(0x210, 0x03);
            setupProgram([0x5E, 0x00, 0x02]); // LSR $0200,X
            cpu.X = 0x10;
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x210)).toBe(0x01); // 0x03 >> 1 = 0x01
            expect(cpu.C).toBe(1); // Carry out
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(0);
        });
    });

    describe('ROL - Rotate Left', function () {
        test('ROL Accumulator ($2A) - Basic rotate left', function () {
            setupProgram([0x2A]); // ROL A
            cpu.A = 0x42;
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x84); // 0x42 << 1 | 0 = 0x84
            expect(cpu.C).toBe(0); // No carry out
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(1); // Bit 7 set
        });

        test('ROL Accumulator - Carry in', function () {
            setupProgram([0x2A]); // ROL A
            cpu.A = 0x42;
            cpu.C = 1;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x85); // 0x42 << 1 | 1 = 0x85
            expect(cpu.C).toBe(0); // No carry out
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(1); // Bit 7 set
        });

        test('ROL Accumulator - Carry out', function () {
            setupProgram([0x2A]); // ROL A
            cpu.A = 0x80;
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x00); // 0x80 << 1 | 0 = 0x00 (with carry)
            expect(cpu.C).toBe(1); // Carry out
            expect(cpu.Z).toBe(1); // Zero result
            expect(cpu.N).toBe(0);
        });

        test('ROL Accumulator - Both carry in and out', function () {
            setupProgram([0x2A]); // ROL A
            cpu.A = 0x80;
            cpu.C = 1;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x01); // 0x80 << 1 | 1 = 0x01 (with carry)
            expect(cpu.C).toBe(1); // Carry out
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(0);
        });

        test('ROL Zero Page ($26)', function () {
            ramInstance.write(0x10, 0x55);
            setupProgram([0x26, 0x10]); // ROL $10
            cpu.C = 1;
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x10)).toBe(0xAB); // 0x55 << 1 | 1 = 0xAB
            expect(cpu.C).toBe(0); // No carry out
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(1); // Bit 7 set
        });

        test('ROL Zero Page,X ($36)', function () {
            ramInstance.write(0x15, 0x81);
            setupProgram([0x36, 0x10]); // ROL $10,X
            cpu.X = 0x05;
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x15)).toBe(0x02); // 0x81 << 1 | 0 = 0x02 (with carry)
            expect(cpu.C).toBe(1); // Carry out
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(0);
        });

        test('ROL Absolute ($2E)', function () {
            ramInstance.write(0x200, 0x7F);
            setupProgram([0x2E, 0x00, 0x02]); // ROL $0200
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x200)).toBe(0xFE); // 0x7F << 1 | 0 = 0xFE
            expect(cpu.C).toBe(0); // No carry out
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(1); // Bit 7 set
        });

        test('ROL Absolute,X ($3E)', function () {
            ramInstance.write(0x210, 0x40);
            setupProgram([0x3E, 0x00, 0x02]); // ROL $0200,X
            cpu.X = 0x10;
            cpu.C = 1;
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x210)).toBe(0x81); // 0x40 << 1 | 1 = 0x81
            expect(cpu.C).toBe(0); // No carry out
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(1); // Bit 7 set
        });
    });

    describe('ROR - Rotate Right', function () {
        test('ROR Accumulator ($6A) - Basic rotate right', function () {
            setupProgram([0x6A]); // ROR A
            cpu.A = 0x42;
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x21); // 0x42 >> 1 | 0 = 0x21
            expect(cpu.C).toBe(0); // No carry out
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(0);
        });

        test('ROR Accumulator - Carry in', function () {
            setupProgram([0x6A]); // ROR A
            cpu.A = 0x42;
            cpu.C = 1;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0xA1); // 0x42 >> 1 | 0x80 = 0xA1
            expect(cpu.C).toBe(0); // No carry out
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(1); // Bit 7 set from carry
        });

        test('ROR Accumulator - Carry out', function () {
            setupProgram([0x6A]); // ROR A
            cpu.A = 0x01;
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x00); // 0x01 >> 1 | 0 = 0x00 (with carry)
            expect(cpu.C).toBe(1); // Carry out
            expect(cpu.Z).toBe(1); // Zero result
            expect(cpu.N).toBe(0);
        });

        test('ROR Accumulator - Both carry in and out', function () {
            setupProgram([0x6A]); // ROR A
            cpu.A = 0x01;
            cpu.C = 1;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x80); // 0x01 >> 1 | 0x80 = 0x80 (with carry)
            expect(cpu.C).toBe(1); // Carry out
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(1); // Bit 7 set from carry
        });

        test('ROR Zero Page ($66)', function () {
            ramInstance.write(0x10, 0xAA);
            setupProgram([0x66, 0x10]); // ROR $10
            cpu.C = 1;
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x10)).toBe(0xD5); // 0xAA >> 1 | 0x80 = 0xD5
            expect(cpu.C).toBe(0); // No carry out
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(1); // Bit 7 set from carry
        });

        test('ROR Zero Page,X ($76)', function () {
            ramInstance.write(0x15, 0xFF);
            setupProgram([0x76, 0x10]); // ROR $10,X
            cpu.X = 0x05;
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x15)).toBe(0x7F); // 0xFF >> 1 | 0 = 0x7F (with carry)
            expect(cpu.C).toBe(1); // Carry out
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(0);
        });

        test('ROR Absolute ($6E)', function () {
            ramInstance.write(0x200, 0x80);
            setupProgram([0x6E, 0x00, 0x02]); // ROR $0200
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x200)).toBe(0x40); // 0x80 >> 1 | 0 = 0x40
            expect(cpu.C).toBe(0); // No carry out
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(0);
        });

        test('ROR Absolute,X ($7E)', function () {
            ramInstance.write(0x210, 0x03);
            setupProgram([0x7E, 0x00, 0x02]); // ROR $0200,X
            cpu.X = 0x10;
            cpu.C = 1;
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x210)).toBe(0x81); // 0x03 >> 1 | 0x80 = 0x81 (with carry)
            expect(cpu.C).toBe(1); // Carry out
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(1); // Bit 7 set from carry
        });
    });
});