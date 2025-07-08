import CPU6502 from '../CPU6502';
import ROM from '../ROM';
import RAM from '../RAM';
import Bus from '../Bus';
import { BusSpaceType } from '../types/bus';

describe('CPU6502 - Arithmetic Operations', function () {
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

    describe('ADC - Add with Carry', function () {
        test('ADC Immediate ($69) - Basic addition', function () {
            setupProgram([0x69, 0x30]); // ADC #$30
            cpu.A = 0x20;
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x50); // 0x20 + 0x30 = 0x50
            expect(cpu.C).toBe(0);
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(0);
            expect(cpu.V).toBe(0);
        });

        test('ADC Immediate - Addition with carry in', function () {
            setupProgram([0x69, 0x30]); // ADC #$30
            cpu.A = 0x20;
            cpu.C = 1; // Carry set
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x51); // 0x20 + 0x30 + 1 = 0x51
            expect(cpu.C).toBe(0);
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(0);
            expect(cpu.V).toBe(0);
        });

        test('ADC Immediate - Carry out', function () {
            setupProgram([0x69, 0x80]); // ADC #$80
            cpu.A = 0x90;
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x10); // (0x90 + 0x80) & 0xFF = 0x10
            expect(cpu.C).toBe(1); // Carry out
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(0);
            expect(cpu.V).toBe(1); // Overflow: both positive, result negative
        });

        test('ADC Immediate - Zero result', function () {
            setupProgram([0x69, 0x00]); // ADC #$00
            cpu.A = 0x00;
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x00);
            expect(cpu.C).toBe(0);
            expect(cpu.Z).toBe(1); // Zero flag
            expect(cpu.N).toBe(0);
            expect(cpu.V).toBe(0);
        });

        test('ADC Immediate - Negative result', function () {
            setupProgram([0x69, 0x70]); // ADC #$70
            cpu.A = 0x20;
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x90); // 0x20 + 0x70 = 0x90 (negative in signed)
            expect(cpu.C).toBe(0);
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(1); // Negative flag
            expect(cpu.V).toBe(1); // Overflow: positive + positive = negative
        });

        test('ADC Immediate - Overflow case 1 (pos + pos = neg)', function () {
            setupProgram([0x69, 0x7F]); // ADC #$7F
            cpu.A = 0x01;
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x80); // 0x01 + 0x7F = 0x80
            expect(cpu.V).toBe(1); // Overflow
            expect(cpu.N).toBe(1); // Negative
            expect(cpu.C).toBe(0);
        });

        test('ADC Immediate - Overflow case 2 (neg + neg = pos)', function () {
            setupProgram([0x69, 0x80]); // ADC #$80
            cpu.A = 0x80;
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x00); // (0x80 + 0x80) & 0xFF = 0x00
            expect(cpu.V).toBe(1); // Overflow: negative + negative = positive
            expect(cpu.N).toBe(0);
            expect(cpu.C).toBe(1); // Carry out
            expect(cpu.Z).toBe(1); // Zero
        });

        test('ADC Zero Page ($65)', function () {
            ramInstance.write(0x10, 0x25);
            setupProgram([0x65, 0x10]); // ADC $10
            cpu.A = 0x15;
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x3A); // 0x15 + 0x25 = 0x3A
            expect(cpu.C).toBe(0);
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(0);
            expect(cpu.V).toBe(0);
        });

        test('ADC Zero Page,X ($75)', function () {
            ramInstance.write(0x15, 0x33);
            setupProgram([0x75, 0x10]); // ADC $10,X
            cpu.A = 0x22;
            cpu.X = 0x05;
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x55); // 0x22 + 0x33 = 0x55
        });

        test('ADC Absolute ($6D)', function () {
            ramInstance.write(0x200, 0x44);
            setupProgram([0x6D, 0x00, 0x02]); // ADC $0200
            cpu.A = 0x33;
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x77); // 0x33 + 0x44 = 0x77
        });

        test('ADC Absolute,X ($7D)', function () {
            ramInstance.write(0x210, 0x40);
            setupProgram([0x7D, 0x00, 0x02]); // ADC $0200,X
            cpu.A = 0x30;
            cpu.X = 0x10;
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x70); // 0x30 + 0x40 = 0x70
        });

        test('ADC Absolute,Y ($79)', function () {
            ramInstance.write(0x220, 0x50);
            setupProgram([0x79, 0x00, 0x02]); // ADC $0200,Y
            cpu.A = 0x25;
            cpu.Y = 0x20;
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x75); // 0x25 + 0x50 = 0x75
        });

        test('ADC Indirect,X ($61)', function () {
            ramInstance.write(0x24, 0x00);
            ramInstance.write(0x25, 0x03);
            ramInstance.write(0x300, 0x60);
            setupProgram([0x61, 0x20]); // ADC ($20,X)
            cpu.A = 0x15;
            cpu.X = 0x04;
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x75); // 0x15 + 0x60 = 0x75
        });

        test('ADC Indirect,Y ($71)', function () {
            ramInstance.write(0x20, 0x00);
            ramInstance.write(0x21, 0x03);
            ramInstance.write(0x310, 0x35);
            setupProgram([0x71, 0x20]); // ADC ($20),Y
            cpu.A = 0x45;
            cpu.Y = 0x10;
            cpu.C = 0;
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x7A); // 0x45 + 0x35 = 0x7A
        });
    });

    describe('SBC - Subtract with Carry', function () {
        test('SBC Immediate ($E9) - Basic subtraction', function () {
            setupProgram([0xE9, 0x20]); // SBC #$20
            cpu.A = 0x50;
            cpu.C = 1; // Carry clear = no borrow
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x30); // 0x50 - 0x20 = 0x30
            expect(cpu.C).toBe(1); // No borrow
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(0);
            expect(cpu.V).toBe(0);
        });

        test('SBC Immediate - Subtraction with borrow', function () {
            setupProgram([0xE9, 0x20]); // SBC #$20
            cpu.A = 0x50;
            cpu.C = 0; // Carry clear = borrow
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x2F); // 0x50 - 0x20 - 1 = 0x2F
            expect(cpu.C).toBe(1); // No final borrow
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(0);
            expect(cpu.V).toBe(0);
        });

        test('SBC Immediate - Borrow required', function () {
            setupProgram([0xE9, 0x60]); // SBC #$60
            cpu.A = 0x30;
            cpu.C = 1; // No initial borrow
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0xD0); // (0x30 - 0x60) & 0xFF = 0xD0
            expect(cpu.C).toBe(0); // Borrow occurred
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(1); // Result is negative
            expect(cpu.V).toBe(0);
        });

        test('SBC Immediate - Zero result', function () {
            setupProgram([0xE9, 0x30]); // SBC #$30
            cpu.A = 0x30;
            cpu.C = 1; // No borrow
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x00); // 0x30 - 0x30 = 0x00
            expect(cpu.C).toBe(1); // No borrow
            expect(cpu.Z).toBe(1); // Zero flag
            expect(cpu.N).toBe(0);
            expect(cpu.V).toBe(0);
        });

        test('SBC Immediate - Overflow case (pos - neg = neg)', function () {
            setupProgram([0xE9, 0x80]); // SBC #$80 (negative)
            cpu.A = 0x7F; // positive
            cpu.C = 1; // No borrow
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0xFF); // 0x7F - 0x80 = 0xFF
            expect(cpu.V).toBe(1); // Overflow: positive - negative = negative (unexpected)
            expect(cpu.N).toBe(1); // Negative
            expect(cpu.C).toBe(0); // Borrow occurred
        });

        test('SBC Immediate - Overflow case (neg - pos = pos)', function () {
            setupProgram([0xE9, 0x01]); // SBC #$01 (positive)
            cpu.A = 0x80; // negative
            cpu.C = 1; // No borrow
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x7F); // 0x80 - 0x01 = 0x7F
            expect(cpu.V).toBe(1); // Overflow: negative - positive = positive (unexpected)
            expect(cpu.N).toBe(0); // Positive
            expect(cpu.C).toBe(1); // No borrow
        });

        test('SBC Zero Page ($E5)', function () {
            ramInstance.write(0x10, 0x15);
            setupProgram([0xE5, 0x10]); // SBC $10
            cpu.A = 0x35;
            cpu.C = 1; // No borrow
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x20); // 0x35 - 0x15 = 0x20
            expect(cpu.C).toBe(1);
        });

        test('SBC Zero Page,X ($F5)', function () {
            ramInstance.write(0x15, 0x22);
            setupProgram([0xF5, 0x10]); // SBC $10,X
            cpu.A = 0x55;
            cpu.X = 0x05;
            cpu.C = 1; // No borrow
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x33); // 0x55 - 0x22 = 0x33
        });

        test('SBC Absolute ($ED)', function () {
            ramInstance.write(0x200, 0x33);
            setupProgram([0xED, 0x00, 0x02]); // SBC $0200
            cpu.A = 0x77;
            cpu.C = 1; // No borrow
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x44); // 0x77 - 0x33 = 0x44
        });

        test('SBC Absolute,X ($FD)', function () {
            ramInstance.write(0x210, 0x30);
            setupProgram([0xFD, 0x00, 0x02]); // SBC $0200,X
            cpu.A = 0x70;
            cpu.X = 0x10;
            cpu.C = 1; // No borrow
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x40); // 0x70 - 0x30 = 0x40
        });

        test('SBC Absolute,Y ($F9)', function () {
            ramInstance.write(0x220, 0x25);
            setupProgram([0xF9, 0x00, 0x02]); // SBC $0200,Y
            cpu.A = 0x75;
            cpu.Y = 0x20;
            cpu.C = 1; // No borrow
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x50); // 0x75 - 0x25 = 0x50
        });

        test('SBC Indirect,X ($E1)', function () {
            ramInstance.write(0x24, 0x00);
            ramInstance.write(0x25, 0x03);
            ramInstance.write(0x300, 0x15);
            setupProgram([0xE1, 0x20]); // SBC ($20,X)
            cpu.A = 0x75;
            cpu.X = 0x04;
            cpu.C = 1; // No borrow
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x60); // 0x75 - 0x15 = 0x60
        });

        test('SBC Indirect,Y ($F1)', function () {
            ramInstance.write(0x20, 0x00);
            ramInstance.write(0x21, 0x03);
            ramInstance.write(0x310, 0x35);
            setupProgram([0xF1, 0x20]); // SBC ($20),Y
            cpu.A = 0x7A;
            cpu.Y = 0x10;
            cpu.C = 1; // No borrow
            
            cpu.performSingleStep();
            expect(cpu.A).toBe(0x45); // 0x7A - 0x35 = 0x45
        });
    });
});