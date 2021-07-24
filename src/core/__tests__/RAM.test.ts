import RAM from '../RAM';

describe('RAM', function () {
    let testRam: RAM;

    beforeEach(function () {
        testRam = new RAM();
    });
    test('Should flash', function () {
        // Should load at 0x0280
        testRam.flash([0x80, 0x02, 1, 2, 3]);
        expect(testRam.read(0x00)).toBe(0x00);
        expect(testRam.read(0x280)).toBe(0x01);
        expect(testRam.read(0x281)).toBe(0x02);
        expect(testRam.read(0x282)).toBe(0x03);
    });

    test('Should write & read', function () {
        testRam.write(0x0a, 0xab);
        expect(testRam.read(0x0a)).toBe(0xab);
    });

    test('Should write at edges', function () {
        const smallRam = new RAM(4);
        smallRam.write(0, 0xab);
        expect(smallRam.read(0)).toBe(0xab);
        smallRam.write(0x3, 0xbb);
        expect(smallRam.read(0x03)).toBe(0xbb);
    });

    test('Should not write if above RAM space', function () {
        const smallRam = new RAM(4);
        smallRam.write(0x03, 0xab);
        expect(smallRam.read(0x03)).toBe(0xab);
        smallRam.write(0x04, 0xab);
        expect(smallRam.read(0x04)).toBe(0);
    });

    test('Should not write if below RAM space', function () {
        const smallRam = new RAM(4);
        smallRam.write(-2, 0xab);
        expect(smallRam.read(-2)).toBe(0);
    });

    test('Should flash content if size == ram space', function () {
        const smallRam = new RAM(4);
        expect(() => smallRam.flash([9, 9, 1, 2, 3, 4])).not.toThrow();
    });

    test('Should raise an exception is flash content > ram space', function () {
        const smallRam = new RAM(4);
        expect(() => smallRam.flash([9, 9, 1, 2, 3, 4, 5])).toThrow(Error('Flash Data too large (5 -> 4)'));
    });
});
