import CPU6502 from '../CPU6502';
import ROM from '../ROM';
import RAM from '../RAM';
import Bus from '../Bus';
import { BusSpaceType } from '../@types/IoAddressable';

describe('CPU6502 - Stack Operations', function () {
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

    describe('PHA - Push Accumulator', function () {
        test('PHA ($48) - Push accumulator to stack', function () {
            setupProgram([0x48]); // PHA
            cpu.A = 0x42;
            cpu.S = 0xFF; // Stack pointer at top
            
            cpu.performSingleStep();
            
            // Check that accumulator was pushed to stack
            expect(ramInstance.read(0x01FF)).toBe(0x42); // Stack location $01FF
            expect(cpu.S).toBe(0xFE); // Stack pointer decremented
            expect(cpu.A).toBe(0x42); // Accumulator unchanged
        });

        test('PHA - Push with different stack pointer', function () {
            setupProgram([0x48]); // PHA
            cpu.A = 0x7F;
            cpu.S = 0xF0; // Stack pointer in middle
            
            cpu.performSingleStep();
            
            expect(ramInstance.read(0x01F0)).toBe(0x7F); // Stack location $01F0
            expect(cpu.S).toBe(0xEF); // Stack pointer decremented
        });

        test('PHA - Push zero value', function () {
            setupProgram([0x48]); // PHA
            cpu.A = 0x00;
            cpu.S = 0xFF;
            
            cpu.performSingleStep();
            
            expect(ramInstance.read(0x01FF)).toBe(0x00);
            expect(cpu.S).toBe(0xFE);
        });

        test('PHA - Push negative value', function () {
            setupProgram([0x48]); // PHA
            cpu.A = 0x80; // Negative in signed interpretation
            cpu.S = 0xFF;
            
            cpu.performSingleStep();
            
            expect(ramInstance.read(0x01FF)).toBe(0x80);
            expect(cpu.S).toBe(0xFE);
        });

        test('PHA - Stack wraps around', function () {
            setupProgram([0x48]); // PHA
            cpu.A = 0x55;
            cpu.S = 0x00; // Stack pointer at bottom
            
            cpu.performSingleStep();
            
            expect(ramInstance.read(0x0100)).toBe(0x55); // Stack location $0100
            expect(cpu.S).toBe(0xFF); // Stack pointer wrapped to top
        });
    });

    describe('PLA - Pull Accumulator', function () {
        test('PLA ($68) - Pull accumulator from stack', function () {
            setupProgram([0x68]); // PLA
            cpu.S = 0xFE; // Stack pointer one below top
            ramInstance.write(0x01FF, 0x42); // Put value on stack
            cpu.A = 0x00; // Clear accumulator
            
            cpu.performSingleStep();
            
            expect(cpu.A).toBe(0x42); // Accumulator loaded from stack
            expect(cpu.S).toBe(0xFF); // Stack pointer incremented
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.N).toBe(0); // Not negative
        });

        test('PLA - Pull zero value sets zero flag', function () {
            setupProgram([0x68]); // PLA
            cpu.S = 0xFE;
            ramInstance.write(0x01FF, 0x00); // Zero value on stack
            cpu.A = 0x55; // Non-zero accumulator
            
            cpu.performSingleStep();
            
            expect(cpu.A).toBe(0x00);
            expect(cpu.S).toBe(0xFF);
            expect(cpu.Z).toBe(1); // Zero flag set
            expect(cpu.N).toBe(0); // Not negative
        });

        test('PLA - Pull negative value sets negative flag', function () {
            setupProgram([0x68]); // PLA
            cpu.S = 0xFE;
            ramInstance.write(0x01FF, 0x80); // Negative value on stack
            cpu.A = 0x00;
            
            cpu.performSingleStep();
            
            expect(cpu.A).toBe(0x80);
            expect(cpu.S).toBe(0xFF);
            expect(cpu.Z).toBe(0); // Not zero
            expect(cpu.N).toBe(1); // Negative flag set
        });

        test('PLA - Pull with different stack pointer', function () {
            setupProgram([0x68]); // PLA
            cpu.S = 0xEF; // Stack pointer in middle
            ramInstance.write(0x01F0, 0x7F); // Value on stack
            cpu.A = 0x00;
            
            cpu.performSingleStep();
            
            expect(cpu.A).toBe(0x7F);
            expect(cpu.S).toBe(0xF0); // Stack pointer incremented
        });

        test('PLA - Stack wraps around', function () {
            setupProgram([0x68]); // PLA
            cpu.S = 0xFF; // Stack pointer at top
            ramInstance.write(0x0100, 0x33); // Value at stack bottom
            cpu.A = 0x00;
            
            cpu.performSingleStep();
            
            expect(cpu.A).toBe(0x33);
            expect(cpu.S).toBe(0x00); // Stack pointer wrapped to bottom
        });
    });

    describe('PHP - Push Processor Status', function () {
        test('PHP ($08) - Push status register to stack', function () {
            setupProgram([0x08]); // PHP
            cpu.S = 0xFF;
            // Set some flags
            cpu.N = 1;
            cpu.V = 0;
            cpu.D = 1;
            cpu.I = 0; // Clear I flag  
            cpu.Z = 1;
            cpu.C = 0;
            
            cpu.performSingleStep();
            
            // Check what was actually pushed and calculate expected value
            const pushedValue = ramInstance.read(0x01FF);
            // Status register should be: NV11DIZC where bits 4&5 are always set during PHP
            // N=1, V=0, bits4&5=11, D=1, I=0, Z=1, C=0 = 10111010 = 0xBA
            expect(pushedValue).toBe(0xBA);
            expect(cpu.S).toBe(0xFE);
        });

        test('PHP - Push with all flags set', function () {
            setupProgram([0x08]); // PHP
            cpu.S = 0xFF;
            cpu.N = 1;
            cpu.V = 1;
            cpu.D = 1;
            cpu.I = 1;
            cpu.Z = 1;
            cpu.C = 1;
            
            cpu.performSingleStep();
            
            // Status register: NV11DIZC = 11111111 = 0xFF
            expect(ramInstance.read(0x01FF)).toBe(0xFF);
            expect(cpu.S).toBe(0xFE);
        });

        test('PHP - Push with all flags clear', function () {
            setupProgram([0x08]); // PHP
            cpu.S = 0xFF;
            cpu.N = 0;
            cpu.V = 0;
            cpu.D = 0;
            cpu.I = 0;
            cpu.Z = 0;
            cpu.C = 0;
            
            cpu.performSingleStep();
            
            // Status register: NV11DIZC = 00110000 = 0x30 (bits 4&5 always set during PHP)
            expect(ramInstance.read(0x01FF)).toBe(0x30);
            expect(cpu.S).toBe(0xFE);
        });

        test('PHP - Bits 4&5 behavior during PHP', function () {
            setupProgram([0x08]); // PHP
            cpu.S = 0xFF;
            // Clear all flags
            cpu.N = 0;
            cpu.V = 0;
            cpu.D = 0;
            cpu.I = 0;
            cpu.Z = 0;
            cpu.C = 0;
            
            cpu.performSingleStep();
            
            // Bits 4 and 5 should be set in pushed status during PHP
            const pushedStatus = ramInstance.read(0x01FF);
            expect((pushedStatus & 0x30) >> 4).toBe(3); // Bits 4&5 set in pushed status
        });

        test('PHP - Different stack pointer', function () {
            setupProgram([0x08]); // PHP
            cpu.S = 0xE0;
            cpu.N = 1;
            cpu.C = 1;
            // After reset: I=1, Z=1, so we have N=1, V=0, D=0, I=1, Z=1, C=1
            
            cpu.performSingleStep();
            
            // Status register: NV11DIZC = 10110111 = 0xB7 (bits 4&5 always set during PHP)
            // N=1, V=0, bits4&5=11, D=0, I=1, Z=1, C=1 = 10110111 = 0xB7
            expect(ramInstance.read(0x01E0)).toBe(0xB7);
            expect(cpu.S).toBe(0xDF);
        });
    });

    describe('PLP - Pull Processor Status', function () {
        test('PLP ($28) - Pull status register from stack', function () {
            setupProgram([0x28]); // PLP
            cpu.S = 0xFE;
            // Put status on stack: NV11DIZC = 10101010 = 0xAA
            ramInstance.write(0x01FF, 0xAA);
            
            cpu.performSingleStep();
            
            expect(cpu.N).toBe(1);
            expect(cpu.V).toBe(0);
            expect(cpu.D).toBe(1);
            expect(cpu.I).toBe(0);
            expect(cpu.Z).toBe(1);
            expect(cpu.C).toBe(0);
            expect(cpu.S).toBe(0xFF);
        });

        test('PLP - Pull with all flags set', function () {
            setupProgram([0x28]); // PLP
            cpu.S = 0xFE;
            ramInstance.write(0x01FF, 0xFF); // All flags set
            
            cpu.performSingleStep();
            
            expect(cpu.N).toBe(1);
            expect(cpu.V).toBe(1);
            expect(cpu.D).toBe(1);
            expect(cpu.I).toBe(1);
            expect(cpu.Z).toBe(1);
            expect(cpu.C).toBe(1);
            expect(cpu.S).toBe(0xFF);
        });

        test('PLP - Pull with all flags clear', function () {
            setupProgram([0x28]); // PLP
            cpu.S = 0xFE;
            ramInstance.write(0x01FF, 0x00); // All flags clear
            
            cpu.performSingleStep();
            
            expect(cpu.N).toBe(0);
            expect(cpu.V).toBe(0);
            expect(cpu.D).toBe(0);
            expect(cpu.I).toBe(0);
            expect(cpu.Z).toBe(0);
            expect(cpu.C).toBe(0);
            expect(cpu.S).toBe(0xFF);
        });

        test('PLP - Bits 4&5 ignored during PLP', function () {
            setupProgram([0x28]); // PLP
            cpu.S = 0xFE;
            // Set initial flags
            cpu.N = 1;
            cpu.V = 1;
            cpu.D = 1;
            cpu.I = 1;
            cpu.Z = 1;
            cpu.C = 1;
            ramInstance.write(0x01FF, 0x00); // Clear all flags including bits 4&5
            
            cpu.performSingleStep();
            
            // All flags should be cleared (bits 4&5 are ignored by PLP)
            expect(cpu.N).toBe(0);
            expect(cpu.V).toBe(0);
            expect(cpu.D).toBe(0);
            expect(cpu.I).toBe(0);
            expect(cpu.Z).toBe(0);
            expect(cpu.C).toBe(0);
        });

        test('PLP - Different stack pointer', function () {
            setupProgram([0x28]); // PLP
            cpu.S = 0xDF;
            // Put status on stack: NV11DIZC = 11100001 = 0xE1
            ramInstance.write(0x01E0, 0xE1);
            
            cpu.performSingleStep();
            
            expect(cpu.N).toBe(1);
            expect(cpu.V).toBe(1);
            expect(cpu.D).toBe(0);
            expect(cpu.I).toBe(0);
            expect(cpu.Z).toBe(0);
            expect(cpu.C).toBe(1);
            expect(cpu.S).toBe(0xE0);
        });

        test('PLP - Stack wraps around', function () {
            setupProgram([0x28]); // PLP
            cpu.S = 0xFF; // Stack pointer at top
            ramInstance.write(0x0100, 0x42); // Status at stack bottom
            
            cpu.performSingleStep();
            
            expect(cpu.S).toBe(0x00); // Stack pointer wrapped to bottom
            // Check that some flags were set from 0x42 = 01000010
            expect(cpu.V).toBe(1); // Bit 6
            expect(cpu.C).toBe(0); // Bit 0
        });
    });

    describe('Stack Operations - Integration Tests', function () {
        test('PHA followed by PLA preserves accumulator', function () {
            setupProgram([0x48, 0x68]); // PHA, PLA
            cpu.A = 0x77;
            cpu.S = 0xFF;
            
            cpu.performSingleStep(); // PHA
            cpu.A = 0x00; // Clear accumulator
            cpu.performSingleStep(); // PLA
            
            expect(cpu.A).toBe(0x77); // Original value restored
            expect(cpu.S).toBe(0xFF); // Stack pointer back to original
        });

        test('PHP followed by PLP preserves status', function () {
            setupProgram([0x08, 0x28]); // PHP, PLP
            cpu.S = 0xFF;
            cpu.N = 1;
            cpu.V = 0;
            cpu.D = 1;
            cpu.I = 0;
            cpu.Z = 1;
            cpu.C = 0;
            
            cpu.performSingleStep(); // PHP
            // Change flags
            cpu.N = 0;
            cpu.V = 1;
            cpu.D = 0;
            cpu.I = 1;
            cpu.Z = 0;
            cpu.C = 1;
            
            cpu.performSingleStep(); // PLP
            
            // Original flags should be restored
            expect(cpu.N).toBe(1);
            expect(cpu.V).toBe(0);
            expect(cpu.D).toBe(1);
            expect(cpu.I).toBe(0);
            expect(cpu.Z).toBe(1);
            expect(cpu.C).toBe(0);
            expect(cpu.S).toBe(0xFF);
        });

        test('Multiple stack operations', function () {
            setupProgram([0x48, 0x48, 0x68, 0x68]); // PHA, PHA, PLA, PLA
            cpu.A = 0x11;
            cpu.S = 0xFF;
            
            cpu.performSingleStep(); // PHA - push 0x11
            cpu.A = 0x22;
            cpu.performSingleStep(); // PHA - push 0x22
            expect(cpu.S).toBe(0xFD); // Stack pointer decremented twice
            
            cpu.performSingleStep(); // PLA - pull 0x22 (last in, first out)
            expect(cpu.A).toBe(0x22);
            expect(cpu.S).toBe(0xFE);
            
            cpu.performSingleStep(); // PLA - pull 0x11
            expect(cpu.A).toBe(0x11);
            expect(cpu.S).toBe(0xFF);
        });

        test('Stack underflow behavior', function () {
            setupProgram([0x68]); // PLA
            cpu.S = 0xFF; // Stack pointer at top
            cpu.A = 0x00;
            ramInstance.write(0x0100, 0x99); // Value at stack bottom
            
            cpu.performSingleStep(); // PLA with stack "empty"
            
            expect(cpu.A).toBe(0x99); // Still reads from stack
            expect(cpu.S).toBe(0x00); // Stack pointer wrapped
        });
    });
});