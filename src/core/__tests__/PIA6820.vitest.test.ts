import { describe, test, expect, beforeEach, vi } from 'vitest';
import PIA6820 from '../PIA6820';

describe('PIA6820', () => {
    let pia: PIA6820;

    beforeEach(() => {
        pia = new PIA6820();
    });

    // ... (previous tests)

    test('write to Port A and Port B works correctly', () => {
        // Set CRA bit 2 to access Output Register A
        pia.write(1, 0x04);
        pia.write(0, 0x42);
        let debugObj = pia.toDebug();
        expect(debugObj.ORA).toBe('42');
        
        // Set CRB bit 2 to access Output Register B
        pia.write(3, 0x04);
        pia.write(2, 0x84);
        debugObj = pia.toDebug();
        expect(debugObj.ORB).toBe('84');
    });

    test('bit manipulation through Port B write works correctly', () => {
        // Set CRB bit 2 to access Output Register B
        pia.write(3, 0x04);
        
        // Set bit 1 of ORB
        pia.write(2, 0x02);
        let debugObj = pia.toDebug();
        expect(parseInt(debugObj.ORB, 16) & 0x02).toBe(0x02);

        // Clear bit 1 of ORB
        pia.write(2, 0x00);
        debugObj = pia.toDebug();
        expect(parseInt(debugObj.ORB, 16) & 0x02).toBe(0x00);
    });

    test('read method works correctly', () => {
        // Control registers are already initialized to 0x04 (access output registers)
        
        // Write values to registers
        pia.write(0, 42);   // ORA
        pia.write(1, 84);   // CRA (preserves bit 2 for output register access)
        pia.write(2, 168);  // ORB
        pia.write(3, 5);    // CRB (1 | 4 = 5, to preserve bit 2 for output register access)

        // Read back - note that reading port A/B clears IRQ flags
        expect(pia.read(0)).toBe(42 | 0x80); // Port A has bit 7 always high
        expect(pia.read(1)).toBe(84 & 0x3F); // IRQ flags are cleared
        expect(pia.read(2)).toBe(168 & 0x7F); // Port B output bits only (bit 7 is hardware-controlled input)
        expect(pia.read(3)).toBe(5 & 0x3F); // IRQ flags are cleared
    });

    test('write method works correctly', () => {
        const ioA = { write: vi.fn() };
        const ioB = { write: vi.fn() };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pia.wireIOA(ioA as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pia.wireIOB(ioB as any);

        // Set control registers to access output registers
        pia.write(1, 0x04); // CRA bit 2 = 1
        pia.write(3, 0x04); // CRB bit 2 = 1
        
        pia.write(0, 42);
        pia.write(2, 168);

        // Port A is input-only in Apple 1 (keyboard), so writing to it
        // should NOT trigger ioA.write() to prevent circular dependency
        expect(ioA.write).not.toHaveBeenCalled();
        // Port B is output (display), so writing to it should trigger ioB.write()
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
        expect(debugObj.CACHE_SIZE).toBeDefined();
    });

    test('PIA6820 does not implement flash method', () => {
        expect((pia as unknown as { flash?: () => void }).flash).toBeUndefined();
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
        expect(inspectable.stats?.reads).toBe(2);
        expect(inspectable.stats?.writes).toBe(1);
        expect(parseInt(String(inspectable.stats?.opsPerSecond))).toBeGreaterThanOrEqual(0);
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
        pia.loadState(state);
        controlLines = pia.getControlLines();
        expect(controlLines.ca1).toBe(true);
        expect(controlLines.cb1).toBe(true);
    });

    test('PB7 display status hardware control works correctly', () => {
        // Initially display should be ready (PB7 = 0)
        pia.write(3, 0x04); // Set CRB bit 2 to access ORB
        expect(pia.read(2) & 0x80).toBe(0x00); // PB7 should be 0 (ready)
        
        // Set display busy
        pia.setPB7DisplayStatus(true);
        expect(pia.read(2) & 0x80).toBe(0x80); // PB7 should be 1 (busy)
        
        // Set display ready
        pia.setPB7DisplayStatus(false);
        expect(pia.read(2) & 0x80).toBe(0x00); // PB7 should be 0 (ready)
    });

    describe('Performance Optimizations', () => {
        test('control registers are not cached (due to dynamic interrupt flags)', () => {
            pia.reset();
            
            // Write control register values
            pia.write(1, 0x04); // CRA
            pia.write(3, 0x04); // CRB
            
            // Read control registers multiple times
            const cra1 = pia.read(1);
            const crb1 = pia.read(3);
            const cra2 = pia.read(1);
            const crb2 = pia.read(3);
            
            // Values should be consistent
            expect(cra1).toBe(cra2);
            expect(crb1).toBe(crb2);
            
            // Control registers should not be cached (cache remains empty)
            const stats = pia.getInspectable().stats;
            expect(stats?.cacheSize).toBe(0);
        });

        test('cache is invalidated on writes', () => {
            pia.reset();
            
            // Write and read control register
            pia.write(1, 0x04); // CRA
            const value1 = pia.read(1);
            
            // Write different value
            pia.write(1, 0x08);
            const value2 = pia.read(1);
            
            expect(value1).not.toBe(value2);
            expect(value2).toBe(0x08);
        });

        test('batch notifications work for multiple write operations', () => {
            const subscriber = vi.fn();
            pia.subscribe(subscriber);
            
            // Clear initial call
            subscriber.mockClear();
            
            // Set CRB bit 2 to access Output Register B
            pia.write(3, 0x04);
            subscriber.mockClear();
            
            // Multiple writes to same register should batch
            pia.write(2, 0x01);
            pia.write(2, 0x03);
            pia.write(2, 0x07);
            
            // Notifications are async via queueMicrotask
            expect(subscriber).not.toHaveBeenCalled();
            
            // Allow microtasks to run
            return new Promise(resolve => {
                globalThis.queueMicrotask(() => {
                    // Should only be called once due to batching
                    expect(subscriber).toHaveBeenCalledTimes(1);
                    resolve(undefined);
                });
            });
        });

        test('I/O writes always trigger notifications (even for same value)', () => {
            const subscriber = vi.fn();
            pia.subscribe(subscriber);
            
            // Clear initial call
            subscriber.mockClear();
            
            // Reset PIA to known state
            pia.reset();
            subscriber.mockClear();
            
            // Set control register to access output register
            pia.write(1, 0x04); // CRA bit 2 = 1
            
            return new Promise(resolve => {
                globalThis.queueMicrotask(() => {
                    // Clear any pending notifications
                    subscriber.mockClear();
                    
                    // Write same value multiple times - should trigger notifications each time
                    // (I/O writes are commands, not state changes)
                    pia.write(0, 0x42);
                    
                    globalThis.queueMicrotask(() => {
                        expect(subscriber).toHaveBeenCalledTimes(1);
                        subscriber.mockClear();
                        
                        // Write same value again - should notify again
                        pia.write(0, 0x42);
                        
                        globalThis.queueMicrotask(() => {
                            expect(subscriber).toHaveBeenCalledTimes(1);
                            resolve(undefined);
                        });
                    });
                });
            });
        });

        test('performance metrics are included in stats', () => {
            const inspectable = pia.getInspectable();
            expect(inspectable.stats).toHaveProperty('cacheSize');
            expect(inspectable.stats).toHaveProperty('cacheStatus');
            expect(inspectable.stats?.cacheStatus).toBe('Empty'); // Control registers are not cached
            
            // Control register reads don't populate cache
            pia.read(1);
            pia.read(3);
            
            const inspectable2 = pia.getInspectable();
            expect(inspectable2.stats?.cacheStatus).toBe('Empty'); // Still empty since control registers aren't cached
        });
    });
});
