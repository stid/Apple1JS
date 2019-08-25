import RAM from '../RAM';

describe('RAM', () => {
    let testRam: RAM;

    beforeEach(() => {
        testRam = new RAM();
    });
    test('Should bulk load & read', () => {
        // Should load at 0x0280
        testRam.flash([0x80, 0x02, 1, 2, 3]);
        expect(testRam.read(0x00)).toBe(0x00);
        expect(testRam.read(0x280)).toBe(0x01);
        expect(testRam.read(0x281)).toBe(0x02);
        expect(testRam.read(0x282)).toBe(0x03);
    });

    test('Should write & read', () => {
        testRam.write(0x0A, 0xAB); // This will just be ignored
        expect(testRam.read(0x0A)).toBe(0xAB);
    });

});
