import FRAM from '../FRAM';

describe('RAM', function () {
    test('Should bulk load & read', function () {
        const testRam = FRAM();
        // Should load at 0x0280
        const newRam = testRam.flash([0x80, 0x02, 1, 2, 3]);
        expect(newRam.read(0x00)).toBe(0x00);
        expect(newRam.read(0x280)).toBe(0x01);
        expect(newRam.read(0x281)).toBe(0x02);
        expect(newRam.read(0x282)).toBe(0x03);
    });

    test('Should write & read', function () {
        const testRam = FRAM();
        const newRam = testRam.write(0x0a, 0xab);
        expect(newRam.read(0x0a)).toBe(0xab);
    });
});
