import Bus from '../Bus';
import RAM from '../RAM';
import ROM from '../ROM';
import { BusSpaceType } from '../types/bus';

describe('Bus', function () {
    let testBus: Bus;
    let ramA: RAM;
    let romB: ROM;

    beforeEach(function () {
        ramA = new RAM(256); // 256 bytes RAM for BANK_A
        romB = new ROM(256); // 256 bytes ROM for BANK_B
        
        // Flash ROM with test data
        const romData = Array(256).fill(0x0b);
        romData[0] = 0x00; // Start address low
        romData[1] = 0x00; // Start address high
        romB.flash(romData);

        const busMapping: BusSpaceType[] = [
            {
                addr: [0x00, 0xff],
                component: ramA,
                name: 'BANK_A',
            },
            {
                addr: [0x100, 0x1ff],
                component: romB,
                name: 'BANK_B',
            },
        ];

        testBus = new Bus(busMapping);
    });
    test('Should read from BANK_A (RAM)', function () {
        // Write test data to RAM first
        ramA.write(0x10, 0x0a);
        const result = testBus.read(0x10);
        expect(result).toBe(0x0a);
    });
    
    test('Should read from BANK_B (ROM)', function () {
        const result = testBus.read(0x110);
        expect(result).toBe(0x0b); // ROM was flashed with 0x0b values
    });

    test('Should return 0 for non-existing address space', function () {
        const result = testBus.read(0xffff);
        expect(result).toBe(0);
    });

    test('Should write to BANK_A (RAM)', function () {
        testBus.write(0x10, 0x0a);
        expect(ramA.read(0x10)).toBe(0x0a);
    });

    test('Should not write to BANK_B (ROM)', function () {
        const originalValue = romB.read(0x10);
        testBus.write(0x110, 0x0b);
        expect(romB.read(0x10)).toBe(originalValue); // ROM should not change
    });

    test('Should silently ignore writes to non-existing address space', function () {
        testBus.write(0xffff, 0xff);
        // No exception should be thrown
        expect(testBus.read(0xffff)).toBe(0);
    });

    test('Should Fail if Bus Spaces overlap', function () {
        const ram1 = new RAM(256);
        const ram2 = new RAM(256);
        const ram3 = new RAM(256);
        
        const tmpMapping: BusSpaceType[] = [
            {
                addr: [0x00, 0xff],
                component: ram1,
                name: 'BANK_A',
            },
            {
                addr: [0x1ff, 0x2ff], // Overlap with C - 1 byte
                component: ram2,
                name: 'BANK_C',
            },
            {
                addr: [0x100, 0x1ff],
                component: ram3,
                name: 'BANK_B',
            },
        ];
        expect(() => new Bus(tmpMapping)).toThrow(Error);
        expect(() => new Bus(tmpMapping)).toThrow('Space "BANK_B" overlaps with "BANK_C"');
    });

    test('Should Fail if space start < space end addr', function () {
        const ram = new RAM(256);
        const tmpMapping: BusSpaceType[] = [
            {
                addr: [0xff, 0xfe],
                component: ram,
                name: 'BANK_A',
            },
        ];
        expect(() => new Bus(tmpMapping)).toThrow(Error);
        expect(() => new Bus(tmpMapping)).toThrow('"BANK_A": Starting address is greater than ending address');
    });

    test('Should cache frequently accessed addresses', function () {
        // Access the same address multiple times
        testBus.read(0x10);
        testBus.read(0x10);
        testBus.read(0x10);
        
        const inspectable = testBus.getInspectable();
        expect(inspectable.cacheSize).toBeGreaterThan(0);
        expect(inspectable.cacheHitRate).toBeGreaterThan(0);
    });

    test('Should clear cache', function () {
        testBus.read(0x10);
        expect(testBus.getInspectable().cacheSize).toBeGreaterThan(0);
        
        testBus.clearCache();
        expect(testBus.getInspectable().cacheSize).toBe(0);
        expect(testBus.getInspectable().cacheHitRate).toBe(0);
    });

    test('Should handle cache overflow with LRU eviction', function () {
        const largeBus = new Bus([
            {
                addr: [0x0000, 0xFFFF],
                component: {
                    read: jest.fn().mockReturnValue(0x42),
                    write: jest.fn(),
                    flash: jest.fn(),
                },
                name: 'LARGE_BANK',
            },
        ]);

        // Fill cache beyond max size (256)
        for (let i = 0; i < 300; i++) {
            largeBus.read(i);
        }

        const inspectable = largeBus.getInspectable();
        expect(inspectable.cacheSize).toBeLessThanOrEqual(256);
    });

    test('Should include cache stats in debug output', function () {
        testBus.read(0x10);
        testBus.read(0x10);
        
        const debugOutput = testBus.toDebug();
        
        expect(debugOutput).toHaveProperty('CACHE');
        expect(debugOutput).toHaveProperty('HIT_RATE');
        expect(debugOutput).toHaveProperty('ACCESSES');
        expect(debugOutput['ACCESSES']).toBe('2');
        expect(debugOutput['HIT_RATE']).toBe('50.0%');
    });
});
