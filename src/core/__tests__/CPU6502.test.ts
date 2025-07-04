import CPU6502 from '../CPU6502';
import ROM from '../ROM';
import RAM from '../RAM';
import Bus from '../Bus';
import { BusSpaceType } from '../@types/IoAddressable';

describe('CPU6502', function () {
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
    test('Initial state', function () {
        expect(cpu.getCompletedCycles()).toBe(0x00);
        const cycles = cpu.performSingleStep();
        expect(cycles).toBe(0x07);
        expect(cpu.PC).toBe(0);
    });
    test('Reset', function () {
        const romData = Array(255).fill(0xff + 2);
        romData[2 + 0xfd] = 0x0a;
        romData[2 + 0xfc] = 0x0b;
        romInstance.flash(romData);
        cpu.reset();
        expect(cpu.PC).toBe(0x0a0b);
    });
    test('Read Steps', function () {
        const romData = Array(255).fill(0xff + 2);
        romData[2 + 0xfd] = 0xff;
        romData[2 + 0xfc] = 0x00;

        const prog = [0x00, 0xff, 0xea, 0xea, 0xea, 0x4c, 0x02, 0xff];
        romData.splice(0, prog.length, ...prog);
        romInstance.flash(romData);

        cpu.reset();
        expect(cpu.PC).toBe(0xff00);
        expect(cpu.getCompletedCycles()).toBe(0x00);

        let stepRes = cpu.performSingleStep();
        expect(cpu.PC).toBe(0xff01);
        expect(cpu.getCompletedCycles()).toBe(2);
        expect(stepRes).toBe(2);

        stepRes = cpu.performSingleStep();
        expect(cpu.PC).toBe(0xff02);
        expect(cpu.getCompletedCycles()).toBe(4);
        expect(stepRes).toBe(2);

        stepRes = cpu.performSingleStep();
        expect(cpu.PC).toBe(0xff03);
        expect(cpu.getCompletedCycles()).toBe(6);
        expect(stepRes).toBe(2);

        stepRes = cpu.performSingleStep();
        expect(cpu.PC).toBe(0xff02);
        expect(cpu.getCompletedCycles()).toBe(9);
        expect(stepRes).toBe(3);
    });
    test('Write Steps', function () {
        const romData = Array(255).fill(0xff + 2);
        romData[2 + 0xfd] = 0xff;
        romData[2 + 0xfc] = 0x00;
        const prog = [
            0x00, 0x00, 0xad, 0x13, 0xff, 0x85, 0x0a, 0xad, 0x14, 0xff, 0x85, 0x0b, 0xa9, 0xcc, 0xa2, 0x01, 0x95, 0x0b,
            0x4c, 0x00, 0xff, 0xaa, 0xbb,
        ];

        /*
            * = $ff00 "Main"
            start:
                lda mem
                sta 10
                lda mem+1
                sta 11
                lda #$CC
                ldx #1
                sta 11, x
                jmp start
            mem:
            .byte $AA, $BB
        */

        romData.splice(0, prog.length, ...prog);
        romInstance.flash(romData);

        cpu.reset();
        expect(cpu.PC).toBe(0xff00);
        expect(cpu.getCompletedCycles()).toBe(0x00);

        // lda mem
        let stepRes = cpu.performSingleStep();
        expect(cpu.PC).toBe(0xff03);
        expect(cpu.A).toBe(0xaa);
        expect(cpu.getCompletedCycles()).toBe(4);
        expect(stepRes).toBe(4);

        // sta 10
        stepRes = cpu.performSingleStep();
        expect(cpu.PC).toBe(0xff05);
        expect(ramInstance.read(10)).toBe(0xaa);
        expect(cpu.getCompletedCycles()).toBe(7);
        expect(stepRes).toBe(3);

        // lda mem+1
        stepRes = cpu.performSingleStep();
        expect(cpu.PC).toBe(0xff08);
        expect(cpu.A).toBe(0xbb);
        expect(cpu.getCompletedCycles()).toBe(11);
        expect(stepRes).toBe(4);

        // sta 11
        stepRes = cpu.performSingleStep();
        expect(cpu.PC).toBe(0xff0a);
        expect(ramInstance.read(11)).toBe(0xbb);
        expect(cpu.getCompletedCycles()).toBe(14);
        expect(stepRes).toBe(3);

        // lda #$CC
        stepRes = cpu.performSingleStep();
        expect(cpu.PC).toBe(0xff0c);
        expect(cpu.A).toBe(0xcc);
        expect(cpu.getCompletedCycles()).toBe(16);
        expect(stepRes).toBe(2);

        // ldx #1
        stepRes = cpu.performSingleStep();
        expect(cpu.PC).toBe(0xff0e);
        expect(cpu.X).toBe(0x01);

        // sta 11, x
        stepRes = cpu.performSingleStep();
        expect(ramInstance.read(12)).toBe(0xcc);

        // jmp start
        stepRes = cpu.performSingleStep();
        expect(cpu.PC).toBe(0xff00);
    });

    describe('Illegal Opcodes', function () {
        test('KIL instruction should jam CPU', function () {
            // Setup ROM with KIL instruction (0x02)
            const romData = Array(255).fill(0xff + 2);
            romData[2 + 0xfd] = 0xff;
            romData[2 + 0xfc] = 0x00;
            const prog = [0x00, 0xff, 0x02]; // BRK, then KIL
            romData.splice(0, prog.length, ...prog);
            romInstance.flash(romData);

            cpu.reset();
            
            // Execute BRK
            cpu.performSingleStep();
            
            // Execute KIL - should jam the CPU
            const pcBeforeKIL = cpu.PC;
            cpu.performSingleStep();
            const pcAfterKIL = cpu.PC;
            
            // PC should not advance (jammed)
            expect(pcAfterKIL).toBe(pcBeforeKIL);
        });

        test('TAS instruction should transfer A AND X to S and store', function () {
            const romData = Array(255).fill(0xff + 2);
            romData[2 + 0xfd] = 0xff;
            romData[2 + 0xfc] = 0x00;
            const prog = [0x00, 0xff, 0xa9, 0xf0, 0xa2, 0x0f, 0x9b, 0x10, 0x00]; // LDA #$F0, LDX #$0F, TAS $0010
            romData.splice(0, prog.length, ...prog);
            romInstance.flash(romData);

            cpu.reset();
            cpu.performSingleStep(); // BRK
            cpu.performSingleStep(); // LDA #$F0
            cpu.performSingleStep(); // LDX #$0F
            
            expect(cpu.A).toBe(0xf0);
            expect(cpu.X).toBe(0x0f);
            
            cpu.performSingleStep(); // TAS $0010
            
            // S should be A AND X
            expect(cpu.S).toBe(0xf0 & 0x0f); // 0x00
            // Memory at 0x10 should contain A & X & (high_byte + 1)
            expect(ramInstance.read(0x10)).toBe(0xf0 & 0x0f & 0x01); // 0x00
        });

        test('LDX immediate value test', function () {
            const romData = Array(255).fill(0xff + 2);
            romData[2 + 0xfd] = 0xff;
            romData[2 + 0xfc] = 0x00;
            // BRK, then padding, then: LDX #$33
            const prog = [0x00, 0xff, 0xa2, 0x33];
            romData.splice(0, prog.length, ...prog);
            romInstance.flash(romData);

            cpu.reset();
            expect(cpu.PC).toBe(0xff00);
            
            // BRK
            cpu.performSingleStep();
            
            // LDX #$33  
            expect(cpu.PC).toBe(0xff02); // Should be at LDX
            cpu.performSingleStep();
            expect(cpu.X).toBe(0x33);
            expect(cpu.PC).toBe(0xff04); // Should be past LDX
        });

        test('AXS instruction implementation', function () {
            // Test AXS directly by setting up CPU state manually
            cpu.A = 0xaa;
            cpu.X = 0x55; 
            cpu.C = 1; // Start with carry set
            
            // Set up immediate addressing mode
            cpu.addr = 0x10; // Arbitrary address for immediate value
            ramInstance.write(0x10, 0x05); // Store immediate value 0x05
            
            // Execute AXS directly
            cpu.axs();
            
            // X should be (A & X) - immediate = (0xAA & 0x55) - 0x05 = 0x00 - 0x05 = 0xFB (with borrow)
            expect(cpu.X).toBe(0xfb);
            expect(cpu.C).toBe(0); // Borrow occurred
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(1); // Negative result
        });

        test('XAA instruction should transfer X to A then AND with immediate', function () {
            const romData = Array(255).fill(0xff + 2);
            romData[2 + 0xfd] = 0xff;
            romData[2 + 0xfc] = 0x00;
            const prog = [0x00, 0xff, 0xa2, 0xf0, 0x8b, 0x33]; // LDX #$F0, XAA #$33
            romData.splice(0, prog.length, ...prog);
            romInstance.flash(romData);

            cpu.reset();
            cpu.performSingleStep(); // BRK
            cpu.performSingleStep(); // LDX #$F0
            
            expect(cpu.X).toBe(0xf0);
            
            cpu.performSingleStep(); // XAA #$33
            
            // A should be X & immediate = 0xF0 & 0x33 = 0x30
            expect(cpu.A).toBe(0x30);
            expect(cpu.Z).toBe(0);
            expect(cpu.N).toBe(0);
        });

        test('XAA with zero result should set zero flag', function () {
            const romData = Array(255).fill(0xff + 2);
            romData[2 + 0xfd] = 0xff;
            romData[2 + 0xfc] = 0x00;
            const prog = [0x00, 0xff, 0xa2, 0xf0, 0x8b, 0x0f]; // LDX #$F0, XAA #$0F
            romData.splice(0, prog.length, ...prog);
            romInstance.flash(romData);

            cpu.reset();
            cpu.performSingleStep(); // BRK
            cpu.performSingleStep(); // LDX #$F0
            cpu.performSingleStep(); // XAA #$0F
            
            // A should be X & immediate = 0xF0 & 0x0F = 0x00
            expect(cpu.A).toBe(0x00);
            expect(cpu.Z).toBe(1);
            expect(cpu.N).toBe(0);
        });
    });

    describe('Interrupt handling', function () {
        test('CLI instruction should clear I flag', function () {
            // Setup ROM with reset vector pointing to 0xff00
            const romData = Array(255).fill(0xff + 2);
            romData[2 + 0xfc] = 0x00; // Reset vector low byte
            romData[2 + 0xfd] = 0xff; // Reset vector high byte  
            
            // Program: CLI, NOP
            const prog = [0x58, 0xea]; // CLI, NOP
            romData.splice(2, prog.length, ...prog); 
            romInstance.flash(romData);

            cpu.reset();
            expect(cpu.I).toBe(1); // I flag set after reset
            
            // Execute CLI to clear interrupt flag
            cpu.performSingleStep();
            expect(cpu.I).toBe(0); // I flag should be cleared
            expect(cpu.PC).toBe(0xff01); // PC should advance
        });

        test('IRQ should be ignored when I flag is set', function () {
            const romData = Array(255).fill(0x00);
            romData[2 + 0xfd] = 0xff; // Reset vector (with +2 offset)
            romData[2 + 0xfc] = 0x00;
            const prog = [0xea, 0xea]; // NOP, NOP
            romData.splice(2, prog.length, ...prog);
            romInstance.flash(romData);

            cpu.reset();
            expect(cpu.I).toBe(1); // I flag set after reset
            
            // Set IRQ line
            cpu.setIrq(true);
            
            // Execute NOP - IRQ should be ignored
            cpu.performSingleStep();
            expect(cpu.PC).toBe(0xff01); // Should continue normal execution
            expect(cpu.I).toBe(1); // I flag should remain set
        });

        test('NMI should be handled regardless of I flag', function () {
            const romData = Array(255).fill(0x00);
            romData[2 + 0xfd] = 0xff; // Reset vector high byte (with +2 offset)
            romData[2 + 0xfc] = 0x00; // Reset vector low byte (with +2 offset)
            romData[2 + 0xfb] = 0xff; // NMI vector high byte points to 0xff10 (with +2 offset)
            romData[2 + 0xfa] = 0x10; // NMI vector low byte (with +2 offset)
            
            const prog = [0xea, 0xea]; // NOP, NOP at 0xff00
            romData.splice(2, prog.length, ...prog);
            
            // Put a NOP at the NMI handler location (0xff10 = index 16+2 = 18)
            romData[2 + 0x10] = 0xea; // NOP at NMI handler
            
            romInstance.flash(romData);

            cpu.reset();
            expect(cpu.I).toBe(1); // I flag set after reset
            expect(cpu.PC).toBe(0xff00); // Should start at reset vector
            
            // Trigger NMI (edge-triggered on falling edge)
            cpu.setNmi(true);
            cpu.setNmi(false); // Falling edge triggers NMI
            
            const stackBefore = cpu.S;
            cpu.performSingleStep(); // This should handle the NMI before executing NOP
            
            // Check that NMI was handled
            expect(cpu.PC).toBe(0xff11); // Should be at NMI handler + 1 (after executing NOP)
            expect(cpu.I).toBe(1); // I flag should be set
            expect(cpu.S).toBe((stackBefore - 3) & 0xff); // Stack should have 3 bytes pushed
        });

        test('NMI has higher priority than IRQ', function () {
            const romData = Array(255).fill(0x00);
            romData[2 + 0xfd] = 0xff; // Reset vector (with +2 offset)
            romData[2 + 0xfc] = 0x00;
            romData[2 + 0xff] = 0xff; // IRQ vector points to 0xff20 (with +2 offset)
            romData[2 + 0xfe] = 0x20;
            romData[2 + 0xfb] = 0xff; // NMI vector points to 0xff10 (with +2 offset)
            romData[2 + 0xfa] = 0x10;
            
            const prog = [0x58, 0xea]; // CLI, NOP
            romData.splice(2, prog.length, ...prog);
            
            // Put NOPs at both handler locations
            romData[2 + 0x10] = 0xea; // NOP at NMI handler (0xff10)
            romData[2 + 0x20] = 0xea; // NOP at IRQ handler (0xff20)
            
            romInstance.flash(romData);

            cpu.reset();
            cpu.performSingleStep(); // CLI
            
            // Set both IRQ and NMI
            cpu.setIrq(true);
            cpu.setNmi(true);
            cpu.setNmi(false); // Trigger NMI
            
            cpu.performSingleStep(); // Should handle NMI, not IRQ
            expect(cpu.PC).toBe(0xff11); // Should be at NMI handler + 1, not IRQ handler
        });

        test('BRK should set B flag in status register', function () {
            const romData = Array(255).fill(0x00);
            romData[2 + 0xfd] = 0xff; // Reset vector (with +2 offset)
            romData[2 + 0xfc] = 0x00; 
            romData[2 + 0xff] = 0xff; // IRQ/BRK vector high byte (with +2 offset)
            romData[2 + 0xfe] = 0xee; // IRQ/BRK vector low byte (with +2 offset) 
            
            const prog = [0x00]; // BRK
            romData.splice(2, prog.length, ...prog);
            
            // Put a NOP at the BRK handler location to avoid infinite loop
            romData[2 + 0xee] = 0xea; // NOP at BRK handler (0xffee)
            
            romInstance.flash(romData);

            cpu.reset();
            cpu.I = 0; // Clear I flag for test
            const stackBefore = cpu.S;
            
            cpu.performSingleStep(); // BRK
            
            // Check stack contents (status register should have B flag set)
            const statusOnStack = ramInstance.read(stackBefore + 0x100);
            expect(statusOnStack & 0x10).toBe(0x10); // B flag should be set
            expect(cpu.PC).toBe(0xffee); // Should be at BRK handler
        });

        test('RTI should restore processor state correctly', function () {
            const romData = Array(255).fill(0x00);
            romData[2 + 0xfd] = 0xff; // Reset vector (with +2 offset)
            romData[2 + 0xfc] = 0x00;
            
            // Setup: RTI instruction
            const prog = [0x40]; // RTI
            romData.splice(2, prog.length, ...prog);
            romInstance.flash(romData);

            cpu.reset();
            
            // Manually setup stack as if interrupt occurred
            cpu.S = 0xfc; // Set stack pointer
            const returnAddr = 0x1234;
            const statusReg = 0x82; // N flag and Z flag set
            
            // Push status, then return address (low, high)
            ramInstance.write(0x01fd, statusReg);
            ramInstance.write(0x01fe, returnAddr & 0xff);
            ramInstance.write(0x01ff, returnAddr >> 8);
            
            cpu.performSingleStep(); // RTI
            
            // Check that state was restored
            expect(cpu.PC).toBe(returnAddr);
            expect(cpu.N).toBe(1);
            expect(cpu.Z).toBe(1); // Bit 1 was set in statusReg (0x82)
            expect(cpu.S).toBe(0xff); // Stack pointer should be restored
        });

        test('IRQ line state affects pending interrupt', function () {
            const romData = Array(255).fill(0x00);
            romData[2 + 0xfd] = 0xff; // Reset vector (with +2 offset)
            romData[2 + 0xfc] = 0x00;
            const prog = [0x58, 0xea, 0xea]; // CLI, NOP, NOP
            romData.splice(2, prog.length, ...prog);
            romInstance.flash(romData);

            cpu.reset();
            cpu.performSingleStep(); // CLI
            
            // Set and clear IRQ line quickly
            cpu.setIrq(true);
            cpu.setIrq(false);
            
            // Should not trigger interrupt since line is low
            cpu.performSingleStep(); // NOP
            expect(cpu.PC).toBe(0xff02); // Should continue normal execution
        });

        test('State serialization includes interrupt state', function () {
            cpu.setIrq(true);
            cpu.setNmi(true);
            cpu.setNmi(false); // Trigger NMI pending
            
            const state = cpu.saveState();
            
            expect(state.irq).toBe(1);
            expect(state.nmi).toBe(0);
            expect(state.pendingNmi).toBe(1);
            expect(state.pendingIrq).toBe(0); // Should be false due to I flag
            
            // Test state restoration
            const newCpu = new CPU6502(cpu.bus);
            newCpu.loadState(state);
            
            expect(newCpu.irq).toBe(1);
            expect(newCpu.nmi).toBe(0);
            expect((newCpu as unknown as { pendingNmi: number }).pendingNmi).toBe(1);
            expect((newCpu as unknown as { pendingIrq: number }).pendingIrq).toBe(0);
        });
    });

    describe('Load/Store Operations', function () {
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
});
