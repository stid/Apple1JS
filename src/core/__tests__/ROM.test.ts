import ROM from '../ROM';

describe('ROM', function() {
    let testRom: ROM;

    beforeEach(function() {
        testRom = new ROM();
    });

    test('Should bulk load', function() {
        testRom.flash([1, 2, 3, 4, 5]);
        expect(testRom.read(0x00)).toBe(0x03);
        expect(testRom.read(0x01)).toBe(0x04);
        expect(testRom.read(0x02)).toBe(0x05);
    });

    test('Should not write (read only)', function() {
        testRom.write(0x0a, 0xab); // This will just be ignored
        expect(testRom.read(0x0a)).toBe(0x00);
    });
});
