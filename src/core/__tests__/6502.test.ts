import CPU6502 from '../6502';
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
            { addr: [0, 100], component: ramInstance, name: 'ROM' },
            { addr: [0xff00, 0xffff], component: romInstance, name: 'RAM_BANK_1' },
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
            cpu.C = true; // Start with carry set
            
            // Set up immediate addressing mode
            cpu.addr = 0x10; // Arbitrary address for immediate value
            ramInstance.write(0x10, 0x05); // Store immediate value 0x05
            
            // Execute AXS directly
            cpu.axs();
            
            // X should be (A & X) - immediate = (0xAA & 0x55) - 0x05 = 0x00 - 0x05 = 0xFB (with borrow)
            expect(cpu.X).toBe(0xfb);
            expect(cpu.C).toBe(false); // Borrow occurred
            expect(cpu.Z).toBe(false);
            expect(cpu.N).toBe(true); // Negative result
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
            expect(cpu.Z).toBe(false);
            expect(cpu.N).toBe(false);
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
            expect(cpu.Z).toBe(true);
            expect(cpu.N).toBe(false);
        });
    });
});
