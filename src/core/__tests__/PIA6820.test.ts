import PIA6820 from '../PIA6820';

describe('PIA6820', () => {
    let pia: PIA6820;

    beforeEach(() => {
        pia = new PIA6820();
    });

    // ... (previous tests)

    test('setDataA and setDataB methods work correctly', () => {
        pia.setDataA(0x42);
        let debugObj = pia.toDebug();
        expect(debugObj.ORA).toBe('42');
        
        pia.setDataB(0x84);
        debugObj = pia.toDebug();
        expect(debugObj.ORB).toBe('84');
    });

    test('setBitDataB and clearBitDataB methods work correctly', () => {
        pia.setBitDataB(1);
        // Verify bit 1 is set by reading ORB through debug
        let debugObj = pia.toDebug();
        expect(parseInt(debugObj.ORB, 16) & 0x02).toBe(0x02);

        pia.clearBitDataB(1);
        // Verify bit 1 is cleared
        debugObj = pia.toDebug();
        expect(parseInt(debugObj.ORB, 16) & 0x02).toBe(0x00);
    });

    test('read method works correctly', () => {
        // Set control registers to access output registers
        pia.write(1, 0x04); // CRA bit 2 = 1
        pia.write(3, 0x04); // CRB bit 2 = 1
        
        // Write values to registers
        pia.write(0, 42);   // ORA
        pia.write(1, 84);   // CRA
        pia.write(2, 168);  // ORB
        pia.write(3, 1);    // CRB

        // Read back - note that reading port A/B clears IRQ flags
        expect(pia.read(0)).toBe(42 | 0x80); // Port A has bit 7 always high
        expect(pia.read(1)).toBe(84 & 0x3F); // IRQ flags are cleared
        expect(pia.read(2)).toBe(0); // Port B DDR is 0 by default, so reads as 0
        expect(pia.read(3)).toBe(1 & 0x3F); // IRQ flags are cleared
    });

    test('write method works correctly', () => {
        const ioA = { write: jest.fn() };
        const ioB = { write: jest.fn() };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pia.wireIOA(ioA as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pia.wireIOB(ioB as any);

        // Set control registers to access output registers
        pia.write(1, 0x04); // CRA bit 2 = 1
        pia.write(3, 0x04); // CRB bit 2 = 1
        
        pia.write(0, 42);
        pia.write(2, 168);

        expect(ioA.write).toHaveBeenCalledWith(42);
        expect(ioB.write).toHaveBeenCalledWith(168);
    });

    test('toDebug method returns a formatted debug object', () => {
        // Set control registers to access output registers
        pia.write(1, 0x04); // CRA bit 2 = 1 to select Output Register A
        pia.write(3, 0x04); // CRB bit 2 = 1 to select Output Register B
        
        // Write values
        pia.write(0, 42);   // Write to ORA
        pia.write(2, 168);  // Write to ORB
        
        // Update control registers
        pia.write(1, 84);   // Write to CRA
        pia.write(3, 1);    // Write to CRB

        const debugObj = pia.toDebug();
        expect(debugObj.ORA).toBe('2A');
        expect(debugObj.CRA).toBe('14'); // 84 & 0x3F (bits 6-7 are read-only)
        expect(debugObj.ORB).toBe('A8');
        expect(debugObj.CRB).toBe('01'); // 1 & 0x3F
        // Check that new debug fields are included
        expect(debugObj.CA1).toBeDefined();
        expect(debugObj.CB2).toBeDefined();
        expect(debugObj.IRQA).toBeDefined();
        expect(debugObj.IRQB).toBeDefined();
        expect(debugObj.OPS_SEC).toBeDefined();
    });

    test('flash method is a no-op', () => {
        expect(() => pia.flash([1, 2, 3])).not.toThrow();
    });

    test('validation catches invalid addresses', () => {
        // Test invalid read
        const result = pia.read(4); // Invalid address > 3
        expect(result).toBe(0);
        
        // Test invalid write
        pia.write(-1, 0xFF); // Invalid address < 0
        pia.write(5, 0xFF); // Invalid address > 3
        
        // Both operations should have been rejected
    });


    test('performance stats are tracked correctly', () => {
        // Reset to ensure clean state
        pia.reset();
        
        // Perform some operations
        pia.read(0);
        pia.read(1);
        pia.write(2, 0x42);
        
        // Get stats from inspectable data
        const inspectable = pia.getInspectable();
        expect(inspectable.stats.reads).toBe(2);
        expect(inspectable.stats.writes).toBe(1);
        expect(parseInt(inspectable.stats.opsPerSecond)).toBeGreaterThanOrEqual(0);
    });

    test('control line CA1 sets IRQ1 flag on positive edge', () => {
        // Reset to ensure clean state
        pia.reset();
        
        // Configure for positive edge detection (bit 1 = 1)
        pia.write(1, 0x02); // CRA bit 1 = 1 for positive edge
        
        // Transition from low to high
        pia.setCA1(false);
        pia.setCA1(true);
        
        // Check that bit 7 (IRQ1 flag) is set by reading CRA
        const cra = pia.read(1);
        expect(cra & 0x80).toBe(0x80);
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
