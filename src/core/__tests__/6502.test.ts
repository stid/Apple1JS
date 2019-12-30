import CPU6502 from '../6502';
import ROM from '../ROM';
import RAM from '../RAM';
import AddressSpaces from '../AddressSpaces';

describe('CPU6502', function() {
    let cpu: CPU6502;
    let ramInstance: RAM;
    let romInstance: ROM;

    beforeEach(function() {
        romInstance = new ROM();
        ramInstance = new RAM();
        const addressMapping = [
            { addr: [0, 100], component: ramInstance, name: 'ROM' },
            { addr: [0xff00, 0xffff], component: romInstance, name: 'RAM_BANK_1' },
        ];
        const addressSpaces = new AddressSpaces(addressMapping);
        cpu = new CPU6502(addressSpaces);
    });
    test('Initial state', function() {
        expect(cpu.getCycles()).toBe(0x00);
        const cycles = cpu.step();
        expect(cycles).toBe(0x07);
        expect(cpu.PC).toBe(0);
    });
    test('Reset', function() {
        const romData = Array(255).fill(0xff + 2);
        romData[2 + 0xfd] = 0x0a;
        romData[2 + 0xfc] = 0x0b;
        romInstance.flash(romData);
        cpu.reset();
        expect(cpu.PC).toBe(0x0a0b);
    });
    test('Read Steps', function() {
        const romData = Array(255).fill(0xff + 2);
        romData[2 + 0xfd] = 0xff;
        romData[2 + 0xfc] = 0x00;
        romData.splice(0, 8, ...[0x00, 0xff, 0xea, 0xea, 0xea, 0x4c, 0x02, 0xff]);

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
});
