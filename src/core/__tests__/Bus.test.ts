import Bus from '../Bus';

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
        expect(readMockA).toBeCalledWith(0x10);
        expect(result).toBe(0x0a);
    });
    test('Should Cal Read on BANK_B', function () {
        const result = testBus.read(0x110);
        expect(readMockB).toBeCalledWith(0x10); // Relatiev AddressS
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
        expect(writeMockA).toBeCalledWith(0x10, 0x0a);
    });

    test('Should Cal write on BANK_B', function () {
        testBus.write(0x110, 0x0b);
        expect(writeMockB).toBeCalledWith(0x10, 0x0b);
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
        expect(() => new Bus(tmpMapping)).toThrow('Space BANK_B overlap with BANK_C');
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
        expect(() => new Bus(tmpMapping)).toThrow('BANK_A Starting address > ending address');
    });
});
