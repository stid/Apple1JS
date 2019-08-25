import ROM from '../ROM';

describe('ROM', () => {
    let testRom: ROM;

    beforeEach(() => {
        testRom = new ROM();
    });

    test('Should bulk load', () => {
        testRom.flash([1,2,3,4,5]);
        expect(testRom.read(0x00)).toBe(0x03);
        expect(testRom.read(0x01)).toBe(0x04);
        expect(testRom.read(0x02)).toBe(0x05);
    });

    test('Should not write (read only)', () => {
        testRom.write(0x0A, 0xAB); // This will just be ignored
        expect(testRom.read(0x0A)).toBe(0x00);
    });

});
