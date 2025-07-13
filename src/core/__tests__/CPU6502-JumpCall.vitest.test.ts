import { describe, test, expect, beforeEach } from 'vitest';
import CPU6502 from '../CPU6502';
import ROM from '../ROM';
import RAM from '../RAM';
import Bus from '../Bus';
import { BusSpaceType } from '../types/bus';

describe('CPU6502 - Jump/Call Operations', function () {
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

    // Helper function to set up CPU with a program in RAM
    function setupProgram(program: number[]): void {
        // Clear RAM and place program at start of RAM (0x0000)
        program.forEach((byte, index) => {
            ramInstance.write(index, byte);
        });
        
        // Set reset vector in ROM to point to start of RAM
        const romData = Array(257).fill(0x00);
        romData[0] = 0x00; // header (ignored)
        romData[1] = 0xff; // header (ignored)
        romData[2 + 0xfc] = 0x00; // reset vector low (0x0000 - RAM start)
        romData[2 + 0xfd] = 0x00; // reset vector high
        romInstance.flash(romData);
        cpu.reset();
    }

    describe('JMP - Jump', function () {
        test('JMP Absolute ($4C) - Basic jump', function () {
            setupProgram([
                0x4C, 0x06, 0x00,  // JMP $0006 (jump to LDA)
                0xEA, 0xEA, 0xEA,  // NOPs (will be skipped)
                0xA9, 0x42         // LDA #$42 at $0006
            ]);
            
            cpu.performSingleStep(); // JMP
            expect(cpu.PC).toBe(0x0006);
            
            // Verify we can execute the instruction at the jump target
            cpu.performSingleStep(); // LDA #$42
            expect(cpu.A).toBe(0x42);
        });

        test('JMP Indirect ($6C) - Indirect jump', function () {
            // Set up indirect address at $0200
            ramInstance.write(0x200, 0x06); // Low byte of target address
            ramInstance.write(0x201, 0x00); // High byte of target address ($0006)
            
            setupProgram([
                0x6C, 0x00, 0x02,  // JMP ($0200)   - positions 0,1,2
                0xEA, 0xEA, 0xEA,  // NOPs          - positions 3,4,5
                0xA9, 0x42         // LDA #$42      - positions 6,7 (at $0006)
            ]);
            
            cpu.performSingleStep(); // JMP
            expect(cpu.PC).toBe(0x0006);
            
            // Verify we can execute the instruction at the jump target
            cpu.performSingleStep(); // LDA #$42
            expect(cpu.A).toBe(0x42);
        });

        test('JMP Absolute - Timing (3 cycles)', function () {
            setupProgram([0x4C, 0x10, 0x00]); // JMP $0010
            
            const cyclesBefore = cpu.getCompletedCycles();
            cpu.performSingleStep();
            const cyclesAfter = cpu.getCompletedCycles();
            
            expect(cyclesAfter - cyclesBefore).toBe(3);
        });

        test('JMP Indirect - Timing', function () {
            ramInstance.write(0x200, 0x10);
            ramInstance.write(0x201, 0x00);
            setupProgram([0x6C, 0x00, 0x02]); // JMP ($0200)
            
            const cyclesBefore = cpu.getCompletedCycles();
            cpu.performSingleStep();
            const cyclesAfter = cpu.getCompletedCycles();
            
            // JMP indirect uses 5 cycles (ind() = 6, jmp() = -1)
            expect(cyclesAfter - cyclesBefore).toBe(5);
        });
    });

    describe('JSR - Jump to Subroutine', function () {
        test('JSR Absolute ($20) - Basic subroutine call', function () {
            setupProgram([
                0x20, 0x10, 0x00,  // JSR $0010
                0xA9, 0x11,        // LDA #$11 (return point)
                0xEA,              // NOP
                0xEA, 0xEA, 0xEA, 0xEA, 0xEA, 0xEA, 0xEA, 0xEA, 0xEA, 0xEA, 0xEA, 0xEA, 0xEA, // NOPs to reach $0010
                0xA9, 0x42         // LDA #$42 at $0010 (subroutine start)
            ]);
            
            const initialStack = cpu.S;
            
            // Test that we can read the instruction bytes correctly
            expect(cpu.read(0x0000)).toBe(0x20); // JSR opcode
            expect(cpu.read(0x0001)).toBe(0x10); // Target address low
            expect(cpu.read(0x0002)).toBe(0x00); // Target address high
            expect(cpu.read(0x0003)).toBe(0xA9); // LDA opcode
            
            cpu.performSingleStep(); // JSR
            
            // Should jump to subroutine
            expect(cpu.PC).toBe(0x0010);
            
            // Should push return address - 1 onto stack
            // JSR pushes high byte first, then low byte, so stack decrements by 2
            // Stack goes from 0x00 to 0xFE (decrements by 2)
            // So we need to read from 0x100 + 0xFE = 0x1FE and 0x100 + 0xFF = 0x1FF
            const returnAddrLow = ramInstance.read(0x1FF);  // Low byte at final stack position
            const returnAddrHigh = ramInstance.read(0x1FE); // High byte at previous stack position
            const pushedAddr = (returnAddrHigh << 8) | returnAddrLow;
            
            // Based on the actual CPU behavior, the pushed address is 0x0002
            // This suggests that the PC during instruction execution is 0x0003
            // JSR pushes PC-1 = 0x0003 - 1 = 0x0002
            expect(pushedAddr).toBe(0x0002);
            
            // Stack pointer should be decremented by 2
            expect(cpu.S).toBe((initialStack - 2) & 0xFF);
        });

        test('JSR - Timing (6 cycles)', function () {
            setupProgram([0x20, 0x10, 0x00]); // JSR $0010
            
            const cyclesBefore = cpu.getCompletedCycles();
            cpu.performSingleStep();
            const cyclesAfter = cpu.getCompletedCycles();
            
            expect(cyclesAfter - cyclesBefore).toBe(6);
        });

        test('JSR - Stack management with multiple calls', function () {
            setupProgram([
                0x20, 0x08, 0x00,  // JSR subroutine1 ($0008) - at $0000
                0xA9, 0x99,        // LDA #$99 (final return) - at $0003
                0xEA,              // NOP - at $0005
                0xEA,              // NOP - at $0006
                0xEA,              // NOP - at $0007
                // Subroutine1 at $0008
                0x20, 0x0F, 0x00,  // JSR subroutine2 ($000F) - at $0008
                0xA9, 0x55,        // LDA #$55 - at $000B
                0x60,              // RTS (return from subroutine1) - at $000D
                0xEA,              // NOP - at $000E
                // Subroutine2 at $000F  
                0xA9, 0x42,        // LDA #$42 - at $000F
                0x60               // RTS (return from subroutine2) - at $0011
            ]);
            
            const initialStack = cpu.S;
            
            // Call first subroutine
            cpu.performSingleStep(); // JSR subroutine1
            expect(cpu.PC).toBe(0x0008);
            expect(cpu.S).toBe((initialStack - 2) & 0xFF);
            
            // Call nested subroutine
            cpu.performSingleStep(); // JSR subroutine2
            expect(cpu.PC).toBe(0x000F);
            expect(cpu.S).toBe((initialStack - 4) & 0xFF);
            
            // Execute nested subroutine
            cpu.performSingleStep(); // LDA #$42
            expect(cpu.A).toBe(0x42);
            
            // Return from nested subroutine
            cpu.performSingleStep(); // RTS
            expect(cpu.PC).toBe(0x000B); // Back to first subroutine after JSR
            expect(cpu.S).toBe((initialStack - 2) & 0xFF);
            
            // Execute first subroutine body
            cpu.performSingleStep(); // LDA #$55
            expect(cpu.A).toBe(0x55);
            
            // Return from first subroutine
            cpu.performSingleStep(); // RTS
            expect(cpu.PC).toBe(0x0003); // Back to main after JSR
            expect(cpu.S).toBe(initialStack);
        });
    });

    describe('RTS - Return from Subroutine', function () {
        test('RTS ($60) - Basic return', function () {
            setupProgram([
                0x60,              // RTS
                0xEA, 0xEA, 0xEA, 0xEA, // NOPs  
                0xA9, 0x42         // LDA #$42 at return address
            ]);
            
            // Set up stack with return address (after setupProgram which calls reset)
            cpu.S = 0xFD;
            ramInstance.write(0x1FE, 0x04); // Return address low byte
            ramInstance.write(0x1FF, 0x00); // Return address high byte (zero page)
            
            cpu.performSingleStep(); // RTS
            
            // RTS should return to (popped_address + 1)
            // If we pushed 0x0004, RTS returns to 0x0004 + 1 = 0x0005
            expect(cpu.PC).toBe(0x0005);
            
            // Stack pointer should be incremented by 2
            expect(cpu.S).toBe(0xFF);
        });

        test('RTS - Timing (6 cycles)', function () {
            cpu.S = 0xFD;
            ramInstance.write(0x1FE, 0x04);
            ramInstance.write(0x1FF, 0xFF);
            setupProgram([0x60]); // RTS
            
            const cyclesBefore = cpu.getCompletedCycles();
            cpu.performSingleStep();
            const cyclesAfter = cpu.getCompletedCycles();
            
            expect(cyclesAfter - cyclesBefore).toBe(6);
        });

        test('JSR + RTS - Complete subroutine cycle', function () {
            setupProgram([
                0x20, 0x08, 0x00,  // JSR $0008 (subroutine in zero page) - at $0000
                0xA9, 0x11,        // LDA #$11 (after return) - at $0003 
                0xEA,              // NOP - at $0005
                0xEA,              // NOP - at $0006
                0xEA,              // NOP - at $0007
                0xA9, 0x42,        // LDA #$42 (subroutine body) - at $0008-$0009
                0x60               // RTS (subroutine end) - at $000A
            ]);
            
            const initialStack = cpu.S;
            
            // Execute JSR
            cpu.performSingleStep();
            expect(cpu.PC).toBe(0x0008); // At subroutine
            expect(cpu.S).toBe((initialStack - 2) & 0xFF); // Stack decreased
            
            // Execute subroutine body
            cpu.performSingleStep(); // LDA #$42
            expect(cpu.A).toBe(0x42);
            
            // Execute RTS
            cpu.performSingleStep();
            expect(cpu.PC).toBe(0x0003); // Back at LDA #$11 (JSR pushed $0002, RTS returns to $0003)
            expect(cpu.S).toBe(initialStack); // Stack restored
            
            // Execute after return
            cpu.performSingleStep(); // LDA #$11
            expect(cpu.A).toBe(0x11);
        });
    });

    describe('Jump/Call Edge Cases', function () {
        test('Jump to same address (self-loop)', function () {
            setupProgram([
                0x4C, 0x00, 0x00   // JMP $0000 (jump to self)
            ]);
            
            cpu.performSingleStep(); // JMP
            expect(cpu.PC).toBe(0x0000); // Should jump to beginning
            
            // Verify it would loop (but don't actually loop to avoid infinite test)
            cpu.performSingleStep(); // JMP again
            expect(cpu.PC).toBe(0x0000); // Still at beginning
        });

        test('JSR with stack near boundaries', function () {
            setupProgram([
                0x20, 0x06, 0x00,  // JSR $0006
                0xEA, 0xEA, 0xEA,  // NOPs
                0x60               // RTS at subroutine
            ]);
            
            // Test with stack pointer near bottom (after setupProgram reset)
            cpu.S = 0x01;
            
            cpu.performSingleStep(); // JSR
            
            // Should wrap around stack (6502 behavior)
            expect(cpu.S).toBe(0xFF);
            expect(cpu.PC).toBe(0x0006);
            
            // Should be able to return
            cpu.performSingleStep(); // RTS
            expect(cpu.PC).toBe(0x0003); // Back to NOPs
            expect(cpu.S).toBe(0x01); // Stack restored
        });

        test('Multiple nested JSR calls', function () {
            setupProgram([
                0x20, 0x07, 0x00,  // JSR level1 ($0007) - at $0000
                0xA9, 0x99,        // LDA #$99 (final return) - at $0003
                0xEA,              // NOP - at $0005
                0xEA,              // NOP - at $0006
                // Level1 subroutine at $0007
                0x20, 0x0B, 0x00,  // JSR level2 ($000B) - at $0007
                0x60,              // RTS from level1 - at $000A
                // Level2 subroutine at $000B
                0x20, 0x0F, 0x00,  // JSR level3 ($000F) - at $000B
                0x60,              // RTS from level2 - at $000E
                // Level3 subroutine at $000F
                0xA9, 0x42,        // LDA #$42 - at $000F
                0x60               // RTS from level3 - at $0011
            ]);
            
            const initialStack = cpu.S;
            
            // Level 1 call
            cpu.performSingleStep(); // JSR level1
            expect(cpu.PC).toBe(0x0007);
            expect(cpu.S).toBe((initialStack - 2) & 0xFF);
            
            // Level 2 call
            cpu.performSingleStep(); // JSR level2
            expect(cpu.PC).toBe(0x000B);
            expect(cpu.S).toBe((initialStack - 4) & 0xFF);
            
            // Level 3 call
            cpu.performSingleStep(); // JSR level3
            expect(cpu.PC).toBe(0x000F);
            expect(cpu.S).toBe((initialStack - 6) & 0xFF);
            
            // Execute level 3
            cpu.performSingleStep(); // LDA #$42
            expect(cpu.A).toBe(0x42);
            
            // Return from level 3
            cpu.performSingleStep(); // RTS
            expect(cpu.PC).toBe(0x000E); // Back to level 2 after JSR level3
            expect(cpu.S).toBe((initialStack - 4) & 0xFF);
            
            // Return from level 2
            cpu.performSingleStep(); // RTS
            expect(cpu.PC).toBe(0x000A); // Back to level 1 after JSR level2
            expect(cpu.S).toBe((initialStack - 2) & 0xFF);
            
            // Return from level 1
            cpu.performSingleStep(); // RTS
            expect(cpu.PC).toBe(0x0003); // Back to main after JSR level1
            expect(cpu.S).toBe(initialStack);
        });
    });
});