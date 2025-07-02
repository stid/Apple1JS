import Bus from '../Bus';
import { BusSpaceType } from '../@types/IoAddressable';

describe('Bus', function () {
    let testBus: Bus;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let readMockA: jest.Mock<any, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let writeMockA: jest.Mock<any, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let flashMockA: jest.Mock<any, any>;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let readMockB: jest.Mock<any, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let writeMockB: jest.Mock<any, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let flashMockB: jest.Mock<any, any>;

    beforeEach(function () {
        readMockA = jest.fn().mockReturnValue(0x0a);
        writeMockA = jest.fn();
        flashMockA = jest.fn();

        readMockB = jest.fn().mockReturnValue(0x0b);
        writeMockB = jest.fn();
        flashMockB = jest.fn();

        const busMapping: BusSpaceType[] = [
            {
                addr: [0x00, 0xff],
                component: {
                    read: readMockA,
                    write: writeMockA,
                    flash: flashMockA,
                },
                name: 'BANK_A',
            },
            {
                addr: [0x100, 0x1ff],
                component: {
                    read: readMockB,
                    write: writeMockB,
                    flash: flashMockB,
                },
                name: 'BANK_B',
            },
        ];

        testBus = new Bus(busMapping);
    });
    test('Should Cal Read on BANK_A', function () {
        const result = testBus.read(0x10);
        expect(readMockA).toHaveBeenCalledWith(0x10);
        expect(result).toBe(0x0a);
    });
    test('Should Cal Read on BANK_B', function () {
        const result = testBus.read(0x110);
        expect(readMockB).toHaveBeenCalledWith(0x10); // Relatiev AddressS
        expect(result).toBe(0x0b);
    });

    test('Should not Call read on non Existing address space', function () {
        const result = testBus.read(0xffff);
        expect(readMockA).toHaveBeenCalledTimes(0);
        expect(readMockB).toHaveBeenCalledTimes(0);
        expect(result).toBe(0);
    });

    test('Should Cal write on BANK_A', function () {
        testBus.write(0x10, 0x0a);
        expect(writeMockA).toHaveBeenCalledWith(0x10, 0x0a);
    });

    test('Should Cal write on BANK_B', function () {
        testBus.write(0x110, 0x0b);
        expect(writeMockB).toHaveBeenCalledWith(0x10, 0x0b);
    });

    test('Should not Call write on non Existing address space', function () {
        testBus.write(0xffff, 0xff);
        expect(writeMockB).toHaveBeenCalledTimes(0);
        expect(writeMockB).toHaveBeenCalledTimes(0);
    });

    test('Should Fail if Bus Spaces overlap', function () {
        const fn = jest.fn();
        const tmpMapping: BusSpaceType[] = [
            {
                addr: [0x00, 0xff],
                component: {
                    read: fn,
                    write: fn,
                    flash: fn,
                },
                name: 'BANK_A',
            },
            {
                addr: [0x1ff, 0x2ff], // Overlap with C - 1 byte
                component: {
                    read: fn,
                    write: fn,
                    flash: fn,
                },
                name: 'BANK_C',
            },
            {
                addr: [0x100, 0x1ff],
                component: {
                    read: fn,
                    write: fn,
                    flash: fn,
                },
                name: 'BANK_B',
            },
        ];
        expect(() => new Bus(tmpMapping)).toThrow(Error);
        expect(() => new Bus(tmpMapping)).toThrow('Space "BANK_B" overlaps with "BANK_C"');
    });

    test('Should Fail if space start < space end addr', function () {
        const fn = jest.fn();
        const tmpMapping: BusSpaceType[] = [
            {
                addr: [0xff, 0xfe],
                component: {
                    read: fn,
                    write: fn,
                    flash: fn,
                },
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
