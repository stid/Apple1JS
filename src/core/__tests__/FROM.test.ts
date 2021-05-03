import FROM from '../FROM';

describe('FROM', function () {
    test('Should bulk load', function () {
        const testRom = FROM();
        const writtenRom = testRom.flash([1, 2, 3, 4, 5]);
        expect(writtenRom.read(0x00)).toBe(0x03);
        expect(writtenRom.read(0x01)).toBe(0x04);
        expect(writtenRom.read(0x02)).toBe(0x05);
    });

    test('Should not write (read only)', function () {
        const testRom = FROM();
        testRom.write(0x0a, 0xab); // This will just be ignored
        expect(testRom.read(0x0a)).toBe(0x00);
    });
});
