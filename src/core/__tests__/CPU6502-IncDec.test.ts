import CPU6502 from '../CPU6502';
import ROM from '../ROM';
import RAM from '../RAM';
import Bus from '../Bus';
import { BusSpaceType } from '../@types/IoAddressable';

describe('CPU6502 - Increment and Decrement Operations', function () {
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

    describe('INC - Increment Memory', function () {
        test('INC Zero Page ($E6) - Basic increment', function () {
            ramInstance.write(0x10, 0x42);
            setupProgram([0xE6, 0x10]); // INC $10
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x10)).toBe(0x43); // 0x42 + 1 = 0x43
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.N).toBe(0); // Not negative
        });

        test('INC Zero Page - Increment to zero (wrap around)', function () {
            ramInstance.write(0x10, 0xFF);
            setupProgram([0xE6, 0x10]); // INC $10
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x10)).toBe(0x00); // 0xFF + 1 = 0x00 (wrap)
            expect(cpu.Z).toBe(1); // Zero flag set
            expect(cpu.N).toBe(0); // Not negative
        });

        test('INC Zero Page - Increment to negative', function () {
            ramInstance.write(0x10, 0x7F);
            setupProgram([0xE6, 0x10]); // INC $10
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x10)).toBe(0x80); // 0x7F + 1 = 0x80
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.N).toBe(1); // Negative flag set
        });

        test('INC Zero Page,X ($F6)', function () {
            ramInstance.write(0x15, 0x30);
            setupProgram([0xF6, 0x10]); // INC $10,X
            cpu.X = 0x05;
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x15)).toBe(0x31); // 0x30 + 1 = 0x31
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.N).toBe(0); // Not negative
        });

        test('INC Absolute ($EE)', function () {
            ramInstance.write(0x200, 0x7E);
            setupProgram([0xEE, 0x00, 0x02]); // INC $0200
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x200)).toBe(0x7F); // 0x7E + 1 = 0x7F
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.N).toBe(0); // Not negative
        });

        test('INC Absolute,X ($FE)', function () {
            ramInstance.write(0x210, 0x00);
            setupProgram([0xFE, 0x00, 0x02]); // INC $0200,X
            cpu.X = 0x10;
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x210)).toBe(0x01); // 0x00 + 1 = 0x01
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.N).toBe(0); // Not negative
        });
    });

    describe('DEC - Decrement Memory', function () {
        test('DEC Zero Page ($C6) - Basic decrement', function () {
            ramInstance.write(0x10, 0x42);
            setupProgram([0xC6, 0x10]); // DEC $10
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x10)).toBe(0x41); // 0x42 - 1 = 0x41
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.N).toBe(0); // Not negative
        });

        test('DEC Zero Page - Decrement to zero', function () {
            ramInstance.write(0x10, 0x01);
            setupProgram([0xC6, 0x10]); // DEC $10
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x10)).toBe(0x00); // 0x01 - 1 = 0x00
            expect(cpu.Z).toBe(1); // Zero flag set
            expect(cpu.N).toBe(0); // Not negative
        });

        test('DEC Zero Page - Decrement from zero (wrap around)', function () {
            ramInstance.write(0x10, 0x00);
            setupProgram([0xC6, 0x10]); // DEC $10
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x10)).toBe(0xFF); // 0x00 - 1 = 0xFF (wrap)
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.N).toBe(1); // Negative flag set
        });

        test('DEC Zero Page - Decrement to negative', function () {
            ramInstance.write(0x10, 0x80);
            setupProgram([0xC6, 0x10]); // DEC $10
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x10)).toBe(0x7F); // 0x80 - 1 = 0x7F
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.N).toBe(0); // Not negative
        });

        test('DEC Zero Page,X ($D6)', function () {
            ramInstance.write(0x15, 0x30);
            setupProgram([0xD6, 0x10]); // DEC $10,X
            cpu.X = 0x05;
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x15)).toBe(0x2F); // 0x30 - 1 = 0x2F
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.N).toBe(0); // Not negative
        });

        test('DEC Absolute ($CE)', function () {
            ramInstance.write(0x200, 0x7F);
            setupProgram([0xCE, 0x00, 0x02]); // DEC $0200
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x200)).toBe(0x7E); // 0x7F - 1 = 0x7E
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.N).toBe(0); // Not negative
        });

        test('DEC Absolute,X ($DE)', function () {
            ramInstance.write(0x210, 0x01);
            setupProgram([0xDE, 0x00, 0x02]); // DEC $0200,X
            cpu.X = 0x10;
            
            cpu.performSingleStep();
            expect(ramInstance.read(0x210)).toBe(0x00); // 0x01 - 1 = 0x00
            expect(cpu.Z).toBe(1); // Zero flag set
            expect(cpu.N).toBe(0); // Not negative
        });
    });

    describe('INX - Increment X Register', function () {
        test('INX ($E8) - Basic increment', function () {
            setupProgram([0xE8]); // INX
            cpu.X = 0x42;
            
            cpu.performSingleStep();
            expect(cpu.X).toBe(0x43); // 0x42 + 1 = 0x43
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.N).toBe(0); // Not negative
        });

        test('INX - Increment to zero (wrap around)', function () {
            setupProgram([0xE8]); // INX
            cpu.X = 0xFF;
            
            cpu.performSingleStep();
            expect(cpu.X).toBe(0x00); // 0xFF + 1 = 0x00 (wrap)
            expect(cpu.Z).toBe(1); // Zero flag set
            expect(cpu.N).toBe(0); // Not negative
        });

        test('INX - Increment to negative', function () {
            setupProgram([0xE8]); // INX
            cpu.X = 0x7F;
            
            cpu.performSingleStep();
            expect(cpu.X).toBe(0x80); // 0x7F + 1 = 0x80
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.N).toBe(1); // Negative flag set
        });
    });

    describe('INY - Increment Y Register', function () {
        test('INY ($C8) - Basic increment', function () {
            setupProgram([0xC8]); // INY
            cpu.Y = 0x42;
            
            cpu.performSingleStep();
            expect(cpu.Y).toBe(0x43); // 0x42 + 1 = 0x43
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.N).toBe(0); // Not negative
        });

        test('INY - Increment to zero (wrap around)', function () {
            setupProgram([0xC8]); // INY
            cpu.Y = 0xFF;
            
            cpu.performSingleStep();
            expect(cpu.Y).toBe(0x00); // 0xFF + 1 = 0x00 (wrap)
            expect(cpu.Z).toBe(1); // Zero flag set
            expect(cpu.N).toBe(0); // Not negative
        });

        test('INY - Increment to negative', function () {
            setupProgram([0xC8]); // INY
            cpu.Y = 0x7F;
            
            cpu.performSingleStep();
            expect(cpu.Y).toBe(0x80); // 0x7F + 1 = 0x80
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.N).toBe(1); // Negative flag set
        });
    });

    describe('DEX - Decrement X Register', function () {
        test('DEX ($CA) - Basic decrement', function () {
            setupProgram([0xCA]); // DEX
            cpu.X = 0x42;
            
            cpu.performSingleStep();
            expect(cpu.X).toBe(0x41); // 0x42 - 1 = 0x41
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.N).toBe(0); // Not negative
        });

        test('DEX - Decrement to zero', function () {
            setupProgram([0xCA]); // DEX
            cpu.X = 0x01;
            
            cpu.performSingleStep();
            expect(cpu.X).toBe(0x00); // 0x01 - 1 = 0x00
            expect(cpu.Z).toBe(1); // Zero flag set
            expect(cpu.N).toBe(0); // Not negative
        });

        test('DEX - Decrement from zero (wrap around)', function () {
            setupProgram([0xCA]); // DEX
            cpu.X = 0x00;
            
            cpu.performSingleStep();
            expect(cpu.X).toBe(0xFF); // 0x00 - 1 = 0xFF (wrap)
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.N).toBe(1); // Negative flag set
        });

        test('DEX - Decrement to positive', function () {
            setupProgram([0xCA]); // DEX
            cpu.X = 0x80;
            
            cpu.performSingleStep();
            expect(cpu.X).toBe(0x7F); // 0x80 - 1 = 0x7F
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.N).toBe(0); // Not negative
        });
    });

    describe('DEY - Decrement Y Register', function () {
        test('DEY ($88) - Basic decrement', function () {
            setupProgram([0x88]); // DEY
            cpu.Y = 0x42;
            
            cpu.performSingleStep();
            expect(cpu.Y).toBe(0x41); // 0x42 - 1 = 0x41
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.N).toBe(0); // Not negative
        });

        test('DEY - Decrement to zero', function () {
            setupProgram([0x88]); // DEY
            cpu.Y = 0x01;
            
            cpu.performSingleStep();
            expect(cpu.Y).toBe(0x00); // 0x01 - 1 = 0x00
            expect(cpu.Z).toBe(1); // Zero flag set
            expect(cpu.N).toBe(0); // Not negative
        });

        test('DEY - Decrement from zero (wrap around)', function () {
            setupProgram([0x88]); // DEY
            cpu.Y = 0x00;
            
            cpu.performSingleStep();
            expect(cpu.Y).toBe(0xFF); // 0x00 - 1 = 0xFF (wrap)
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.N).toBe(1); // Negative flag set
        });

        test('DEY - Decrement to positive', function () {
            setupProgram([0x88]); // DEY
            cpu.Y = 0x80;
            
            cpu.performSingleStep();
            expect(cpu.Y).toBe(0x7F); // 0x80 - 1 = 0x7F
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.N).toBe(0); // Not negative
        });
    });

    describe('Combined increment/decrement operations', function () {
        test('Multiple register operations', function () {
            setupProgram([0xE8, 0xC8, 0xCA, 0x88]); // INX, INY, DEX, DEY
            cpu.X = 0x10;
            cpu.Y = 0x20;
            
            // INX
            cpu.performSingleStep();
            expect(cpu.X).toBe(0x11);
            expect(cpu.Y).toBe(0x20);
            
            // INY
            cpu.performSingleStep();
            expect(cpu.X).toBe(0x11);
            expect(cpu.Y).toBe(0x21);
            
            // DEX
            cpu.performSingleStep();
            expect(cpu.X).toBe(0x10);
            expect(cpu.Y).toBe(0x21);
            
            // DEY
            cpu.performSingleStep();
            expect(cpu.X).toBe(0x10);
            expect(cpu.Y).toBe(0x20);
        });

        test('Memory and register operations', function () {
            ramInstance.write(0x10, 0x50);
            setupProgram([0xE6, 0x10, 0xE8, 0xC6, 0x10, 0xCA]); // INC $10, INX, DEC $10, DEX
            cpu.X = 0x30;
            
            // INC $10
            cpu.performSingleStep();
            expect(ramInstance.read(0x10)).toBe(0x51);
            expect(cpu.X).toBe(0x30);
            
            // INX
            cpu.performSingleStep();
            expect(ramInstance.read(0x10)).toBe(0x51);
            expect(cpu.X).toBe(0x31);
            
            // DEC $10
            cpu.performSingleStep();
            expect(ramInstance.read(0x10)).toBe(0x50);
            expect(cpu.X).toBe(0x31);
            
            // DEX
            cpu.performSingleStep();
            expect(ramInstance.read(0x10)).toBe(0x50);
            expect(cpu.X).toBe(0x30);
        });
    });
});