import CPU6502 from '../6502';
import ROM from '../ROM';
import RAM from '../RAM';
import AddressSpaces from '../AddressSpaces';

describe('CPU6502', function () {
    let cpu: CPU6502;
    let ramInstance: RAM;
    let romInstance: ROM;

    beforeEach(function () {
        romInstance = new ROM();
        ramInstance = new RAM();
        const addressMapping: AddressSpaceType[] = [
            { addr: [0, 100], component: ramInstance, name: 'ROM' },
            { addr: [0xff00, 0xffff], component: romInstance, name: 'RAM_BANK_1' },
        ];
        const addressSpaces = new AddressSpaces(addressMapping);
        cpu = new CPU6502(addressSpaces);
    });
    test('Initial state', function () {
        expect(cpu.getCycles()).toBe(0x00);
        const cycles = cpu.step();
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
        expect(cpu.getCycles()).toBe(0x00);

        let stepRes = cpu.step();
        expect(cpu.PC).toBe(0xff01);
        expect(cpu.getCycles()).toBe(2);
        expect(stepRes).toBe(2);

        stepRes = cpu.step();
        expect(cpu.PC).toBe(0xff02);
        expect(cpu.getCycles()).toBe(4);
        expect(stepRes).toBe(2);

        stepRes = cpu.step();
        expect(cpu.PC).toBe(0xff03);
        expect(cpu.getCycles()).toBe(6);
        expect(stepRes).toBe(2);

        stepRes = cpu.step();
        expect(cpu.PC).toBe(0xff02);
        expect(cpu.getCycles()).toBe(9);
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
        expect(cpu.getCycles()).toBe(0x00);

        // lda mem
        let stepRes = cpu.step();
        expect(cpu.PC).toBe(0xff03);
        expect(cpu.A).toBe(0xaa);
        expect(cpu.getCycles()).toBe(4);
        expect(stepRes).toBe(4);

        // sta 10
        stepRes = cpu.step();
        expect(cpu.PC).toBe(0xff05);
        expect(ramInstance.read(10)).toBe(0xaa);
        expect(cpu.getCycles()).toBe(7);
        expect(stepRes).toBe(3);

        // lda mem+1
        stepRes = cpu.step();
        expect(cpu.PC).toBe(0xff08);
        expect(cpu.A).toBe(0xbb);
        expect(cpu.getCycles()).toBe(11);
        expect(stepRes).toBe(4);

        // sta 11
        stepRes = cpu.step();
        expect(cpu.PC).toBe(0xff0a);
        expect(ramInstance.read(11)).toBe(0xbb);
        expect(cpu.getCycles()).toBe(14);
        expect(stepRes).toBe(3);

        // lda #$CC
        stepRes = cpu.step();
        expect(cpu.PC).toBe(0xff0c);
        expect(cpu.A).toBe(0xcc);
        expect(cpu.getCycles()).toBe(16);
        expect(stepRes).toBe(2);

        // ldx #1
        stepRes = cpu.step();
        expect(cpu.PC).toBe(0xff0e);
        expect(cpu.X).toBe(0x01);

        // sta 11, x
        stepRes = cpu.step();
        expect(ramInstance.read(12)).toBe(0xcc);

        // jmp start
        stepRes = cpu.step();
        expect(cpu.PC).toBe(0xff00);
    });
});
