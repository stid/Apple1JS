import { describe, test, expect, beforeEach } from 'vitest';
import CPU6502 from '../cpu6502';
import ROM from '../ROM';
import RAM from '../RAM';
import Bus from '../Bus';
import { BusSpaceType } from '../types/bus';

describe('CPU6502 - Flag Operations', function () {
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

    describe('CLC - Clear Carry Flag', function () {
        test('CLC ($18) - Clear carry flag', function () {
            setupProgram([0x18]); // CLC
            cpu.C = 1; // Set carry flag
            
            cpu.performSingleStep();
            expect(cpu.C).toBe(0); // Carry flag cleared
            // Other flags unchanged
            expect(cpu.Z).toBe(1); // Initial reset state
            expect(cpu.N).toBe(0); // Initial reset state
            expect(cpu.V).toBe(0); // Initial reset state
            expect(cpu.D).toBe(0); // Initial reset state
            expect(cpu.I).toBe(1); // Initial reset state
        });

        test('CLC - Clear already clear carry flag', function () {
            setupProgram([0x18]); // CLC
            cpu.C = 0; // Carry flag already clear
            
            cpu.performSingleStep();
            expect(cpu.C).toBe(0); // Carry flag remains clear
        });
    });

    describe('CLD - Clear Decimal Flag', function () {
        test('CLD ($D8) - Clear decimal flag', function () {
            setupProgram([0xD8]); // CLD
            cpu.D = 1; // Set decimal flag
            
            cpu.performSingleStep();
            expect(cpu.D).toBe(0); // Decimal flag cleared
            // Other flags unchanged
            expect(cpu.Z).toBe(1); // Initial reset state
            expect(cpu.N).toBe(0); // Initial reset state
            expect(cpu.V).toBe(0); // Initial reset state
            expect(cpu.C).toBe(0); // Initial reset state
            expect(cpu.I).toBe(1); // Initial reset state
        });

        test('CLD - Clear already clear decimal flag', function () {
            setupProgram([0xD8]); // CLD
            cpu.D = 0; // Decimal flag already clear
            
            cpu.performSingleStep();
            expect(cpu.D).toBe(0); // Decimal flag remains clear
        });
    });

    describe('CLI - Clear Interrupt Flag', function () {
        test('CLI ($58) - Clear interrupt flag', function () {
            setupProgram([0x58]); // CLI
            cpu.I = 1; // Set interrupt flag
            
            cpu.performSingleStep();
            expect(cpu.I).toBe(0); // Interrupt flag cleared
            // Other flags unchanged
            expect(cpu.Z).toBe(1); // Initial reset state
            expect(cpu.N).toBe(0); // Initial reset state
            expect(cpu.V).toBe(0); // Initial reset state
            expect(cpu.C).toBe(0); // Initial reset state
            expect(cpu.D).toBe(0); // Initial reset state
        });

        test('CLI - Clear already clear interrupt flag', function () {
            setupProgram([0x58]); // CLI
            cpu.I = 0; // Interrupt flag already clear
            
            cpu.performSingleStep();
            expect(cpu.I).toBe(0); // Interrupt flag remains clear
        });
    });

    describe('CLV - Clear Overflow Flag', function () {
        test('CLV ($B8) - Clear overflow flag', function () {
            setupProgram([0xB8]); // CLV
            cpu.V = 1; // Set overflow flag
            
            cpu.performSingleStep();
            expect(cpu.V).toBe(0); // Overflow flag cleared
            // Other flags unchanged
            expect(cpu.Z).toBe(1); // Initial reset state
            expect(cpu.N).toBe(0); // Initial reset state
            expect(cpu.C).toBe(0); // Initial reset state
            expect(cpu.D).toBe(0); // Initial reset state
            expect(cpu.I).toBe(1); // Initial reset state
        });

        test('CLV - Clear already clear overflow flag', function () {
            setupProgram([0xB8]); // CLV
            cpu.V = 0; // Overflow flag already clear
            
            cpu.performSingleStep();
            expect(cpu.V).toBe(0); // Overflow flag remains clear
        });
    });

    describe('SEC - Set Carry Flag', function () {
        test('SEC ($38) - Set carry flag', function () {
            setupProgram([0x38]); // SEC
            cpu.C = 0; // Clear carry flag
            
            cpu.performSingleStep();
            expect(cpu.C).toBe(1); // Carry flag set
            // Other flags unchanged
            expect(cpu.Z).toBe(1); // Initial reset state
            expect(cpu.N).toBe(0); // Initial reset state
            expect(cpu.V).toBe(0); // Initial reset state
            expect(cpu.D).toBe(0); // Initial reset state
            expect(cpu.I).toBe(1); // Initial reset state
        });

        test('SEC - Set already set carry flag', function () {
            setupProgram([0x38]); // SEC
            cpu.C = 1; // Carry flag already set
            
            cpu.performSingleStep();
            expect(cpu.C).toBe(1); // Carry flag remains set
        });
    });

    describe('SED - Set Decimal Flag', function () {
        test('SED ($F8) - Set decimal flag', function () {
            setupProgram([0xF8]); // SED
            cpu.D = 0; // Clear decimal flag
            
            cpu.performSingleStep();
            expect(cpu.D).toBe(1); // Decimal flag set
            // Other flags unchanged
            expect(cpu.Z).toBe(1); // Initial reset state
            expect(cpu.N).toBe(0); // Initial reset state
            expect(cpu.V).toBe(0); // Initial reset state
            expect(cpu.C).toBe(0); // Initial reset state
            expect(cpu.I).toBe(1); // Initial reset state
        });

        test('SED - Set already set decimal flag', function () {
            setupProgram([0xF8]); // SED
            cpu.D = 1; // Decimal flag already set
            
            cpu.performSingleStep();
            expect(cpu.D).toBe(1); // Decimal flag remains set
        });
    });

    describe('SEI - Set Interrupt Flag', function () {
        test('SEI ($78) - Set interrupt flag', function () {
            setupProgram([0x78]); // SEI
            cpu.I = 0; // Clear interrupt flag
            
            cpu.performSingleStep();
            expect(cpu.I).toBe(1); // Interrupt flag set
            // Other flags unchanged
            expect(cpu.Z).toBe(1); // Initial reset state
            expect(cpu.N).toBe(0); // Initial reset state
            expect(cpu.V).toBe(0); // Initial reset state
            expect(cpu.C).toBe(0); // Initial reset state
            expect(cpu.D).toBe(0); // Initial reset state
        });

        test('SEI - Set already set interrupt flag', function () {
            setupProgram([0x78]); // SEI
            cpu.I = 1; // Interrupt flag already set
            
            cpu.performSingleStep();
            expect(cpu.I).toBe(1); // Interrupt flag remains set
        });
    });

    describe('Flag combinations', function () {
        test('Multiple flag operations in sequence', function () {
            setupProgram([0x18, 0x38, 0xD8, 0xF8]); // CLC, SEC, CLD, SED
            
            // Initial state
            cpu.C = 1;
            cpu.D = 1;
            
            // CLC - Clear carry
            cpu.performSingleStep();
            expect(cpu.C).toBe(0);
            expect(cpu.D).toBe(1);
            
            // SEC - Set carry
            cpu.performSingleStep();
            expect(cpu.C).toBe(1);
            expect(cpu.D).toBe(1);
            
            // CLD - Clear decimal
            cpu.performSingleStep();
            expect(cpu.C).toBe(1);
            expect(cpu.D).toBe(0);
            
            // SED - Set decimal
            cpu.performSingleStep();
            expect(cpu.C).toBe(1);
            expect(cpu.D).toBe(1);
        });

        test('All clear operations', function () {
            setupProgram([0x18, 0xD8, 0x58, 0xB8]); // CLC, CLD, CLI, CLV
            
            // Set all flags
            cpu.C = 1;
            cpu.D = 1;
            cpu.I = 1;
            cpu.V = 1;
            
            // CLC
            cpu.performSingleStep();
            expect(cpu.C).toBe(0);
            expect(cpu.D).toBe(1);
            expect(cpu.I).toBe(1);
            expect(cpu.V).toBe(1);
            
            // CLD
            cpu.performSingleStep();
            expect(cpu.C).toBe(0);
            expect(cpu.D).toBe(0);
            expect(cpu.I).toBe(1);
            expect(cpu.V).toBe(1);
            
            // CLI
            cpu.performSingleStep();
            expect(cpu.C).toBe(0);
            expect(cpu.D).toBe(0);
            expect(cpu.I).toBe(0);
            expect(cpu.V).toBe(1);
            
            // CLV
            cpu.performSingleStep();
            expect(cpu.C).toBe(0);
            expect(cpu.D).toBe(0);
            expect(cpu.I).toBe(0);
            expect(cpu.V).toBe(0);
        });

        test('All set operations', function () {
            setupProgram([0x38, 0xF8, 0x78]); // SEC, SED, SEI
            
            // Clear all flags
            cpu.C = 0;
            cpu.D = 0;
            cpu.I = 0;
            
            // SEC
            cpu.performSingleStep();
            expect(cpu.C).toBe(1);
            expect(cpu.D).toBe(0);
            expect(cpu.I).toBe(0);
            
            // SED
            cpu.performSingleStep();
            expect(cpu.C).toBe(1);
            expect(cpu.D).toBe(1);
            expect(cpu.I).toBe(0);
            
            // SEI
            cpu.performSingleStep();
            expect(cpu.C).toBe(1);
            expect(cpu.D).toBe(1);
            expect(cpu.I).toBe(1);
        });
    });
});