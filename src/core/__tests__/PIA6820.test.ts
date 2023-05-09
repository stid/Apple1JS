import PIA6820 from '../PIA6820';

describe('PIA6820', () => {
    let pia: PIA6820;

    beforeEach(() => {
        pia = new PIA6820();
    });

    // ... (previous tests)

    test('setBitDataA, clearBitDataA, setBitCtrA, and clearBitCrtA methods work correctly', () => {
        pia.setBitDataA(2);
        expect(pia['data'][0]).toBe(4);

        pia.clearBitDataA(2);
        expect(pia['data'][0]).toBe(0);

        pia.setBitCtrA(3);
        expect(pia['data'][1]).toBe(8);

        pia.clearBitCrtA(3);
        expect(pia['data'][1]).toBe(0);
    });

    test('setBitDataB, clearBitDataB, setBitCtrB, and clearBitCrtB methods work correctly', () => {
        pia.setBitDataB(1);
        expect(pia['data'][2]).toBe(2);

        pia.clearBitDataB(1);
        expect(pia['data'][2]).toBe(0);

        pia.setBitCtrB(4);
        expect(pia['data'][1]).toBe(16);

        pia.clearBitCrtB(4);
        expect(pia['data'][3]).toBe(0);
    });

    test('read method works correctly', () => {
        pia['data'][0] = 42;
        pia['data'][1] = 84;
        pia['data'][2] = 168;
        pia['data'][3] = 1;

        expect(pia.read(0)).toBe(42);
        expect(pia.read(1)).toBe(84);
        expect(pia.read(2)).toBe(168);
        expect(pia.read(3)).toBe(1);
    });

    test('write method works correctly', () => {
        const ioA = { write: jest.fn() };
        const ioB = { write: jest.fn() };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pia.wireIOA(ioA as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pia.wireIOB(ioB as any);

        pia.write(0, 42);
        pia.write(2, 168);

        expect(ioA.write).toHaveBeenCalledWith(42);
        expect(ioB.write).toHaveBeenCalledWith(168);
    });

    test('toDebug method returns a formatted debug object', () => {
        pia['data'][0] = 42;
        pia['data'][1] = 84;
        pia['data'][2] = 168;
        pia['data'][3] = 1;

        const debugObj = pia.toDebug();
        expect(debugObj).toEqual({
            A_KBD: '2A',
            A_KBDCR: '54',
            B_DSP: 'A8',
            B_DSPCR: '01',
        });
    });

    test('flash method is a no-op', () => {
        expect(() => pia.flash([1, 2, 3])).not.toThrow();
    });
});
