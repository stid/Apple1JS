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
        expect(pia['data'][3]).toBe(16);

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
        expect(debugObj.A_KBD).toBe('2A');
        expect(debugObj.A_KBDCR).toBe('54');
        expect(debugObj.B_DSP).toBe('A8');
        expect(debugObj.B_DSPCR).toBe('01');
        // Check that stats are included
        expect(debugObj.READS).toBeDefined();
        expect(debugObj.WRITES).toBeDefined();
        expect(debugObj.OPS_SEC).toBeDefined();
        expect(debugObj.NOTIFICATIONS).toBeDefined();
        expect(debugObj.INVALID_OPS).toBeDefined();
    });

    test('flash method is a no-op', () => {
        expect(() => pia.flash([1, 2, 3])).not.toThrow();
    });

    test('validation catches invalid bit numbers', () => {
        // Test invalid bit numbers
        pia.setBitDataA(8); // Invalid bit > 7
        pia.setBitDataA(-1); // Invalid bit < 0
        
        // Data should remain unchanged
        expect(pia['data'][0]).toBe(0);
        
        // Check invalid operations were tracked
        const debugObj = pia.toDebug();
        expect(parseInt(debugObj.INVALID_OPS)).toBeGreaterThan(0);
    });

    test('validation catches invalid addresses', () => {
        // Test invalid read
        const result = pia.read(4); // Invalid address > 3
        expect(result).toBe(0);
        
        // Test invalid write
        pia.write(-1, 0xFF); // Invalid address < 0
        pia.write(5, 0xFF); // Invalid address > 3
        
        // Check invalid operations were tracked
        const debugObj = pia.toDebug();
        expect(parseInt(debugObj.INVALID_OPS)).toBeGreaterThan(0);
    });

    test('performance stats are tracked correctly', () => {
        // Reset to ensure clean state
        pia.reset();
        
        // Perform some operations
        pia.read(0);
        pia.read(1);
        pia.write(2, 0x42);
        pia.setBitDataA(3);
        
        const debugObj = pia.toDebug();
        expect(debugObj.READS).toBe('2');
        expect(debugObj.WRITES).toBe('1');
        expect(parseInt(debugObj.OPS_SEC)).toBeGreaterThanOrEqual(0);
        expect(parseInt(debugObj.NOTIFICATIONS)).toBeGreaterThan(0);
    });

    test('control line CA1 sets IRQ1 flag on positive edge', () => {
        // Reset to ensure clean state
        pia.reset();
        
        // Configure for positive edge detection (bit 0 = 1)
        pia['data'][1] = 0x01; // A_KBDCR
        
        // Transition from low to high
        pia.setCA1(false);
        pia.setCA1(true);
        
        // Check that bit 7 (IRQ1 flag) is set
        expect(pia['data'][1] & 0x80).toBe(0x80);
    });

    test('control lines are included in debug output', () => {
        pia.reset();
        pia.setCA1(true);
        pia.setCB2(true);
        
        const debugObj = pia.toDebug();
        expect(debugObj.CA1).toBe('1');
        expect(debugObj.CA2).toBe('0');
        expect(debugObj.CB1).toBe('0');
        expect(debugObj.CB2).toBe('1');
    });

    test('control lines are saved and restored', () => {
        pia.setCA1(true);
        pia.setCB1(true);
        
        const state = pia.saveState();
        
        // Reset and verify control lines are cleared
        pia.reset();
        let controlLines = pia.getControlLines();
        expect(controlLines.ca1).toBe(false);
        expect(controlLines.cb1).toBe(false);
        
        // Restore and verify control lines are back
        pia.loadState(state as { data: number[]; controlLines?: { 
            ca1: boolean; ca2: boolean; cb1: boolean; cb2: boolean;
            prevCa1: boolean; prevCa2: boolean; prevCb1: boolean; prevCb2: boolean;
        } });
        controlLines = pia.getControlLines();
        expect(controlLines.ca1).toBe(true);
        expect(controlLines.cb1).toBe(true);
    });
});
