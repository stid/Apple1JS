import { describe, test, expect } from 'vitest';
import Bus from '../Bus';
import type { BusSpaceType, IoAddressable } from '../types/bus';
import { Formatters } from '../../utils/formatters';

/**
 * A device that answers a read with its own tag above bit 16 and the whole
 * decoded offset below it, so a read identifies both the device and the exact
 * offset it was handed. It also records every access.
 */
function probe(tag: number) {
    const reads: number[] = [];
    const writes: Array<[number, number]> = [];
    const component: IoAddressable = {
        read: (offset) => {
            reads.push(offset);
            return tag * 0x10000 + offset;
        },
        write: (offset, value) => {
            writes.push([offset, value]);
        },
    };
    return { component, reads, writes };
}

/** The decode the Bus must match: the first mapping that contains the address. */
function expectedDecode(mapping: BusSpaceType[], address: number): { space: BusSpaceType; offset: number } | null {
    for (const space of mapping) {
        if (address >= space.addr[0] && address <= space.addr[1]) {
            const offset = address - space.addr[0];
            return { space, offset: space.mirrorMask === undefined ? offset : offset & space.mirrorMask };
        }
    }
    return null;
}

describe('Bus address decoding', () => {
    // Every shape a page can take: wholly inside one mapping, split between two,
    // partly mapped, covered by a mirrored device, and untouched.
    const whole = probe(1);
    const lowHalf = probe(2);
    const highHalf = probe(3);
    const fourBytes = probe(4);
    const mirrored = probe(5);
    const unaligned = probe(6);
    const mapping: BusSpaceType[] = [
        { addr: [0x0000, 0x0fff], component: whole.component, name: 'WHOLE_PAGES' },
        { addr: [0x1000, 0x107f], component: lowHalf.component, name: 'LOW_HALF' },
        { addr: [0x1080, 0x10ff], component: highHalf.component, name: 'HIGH_HALF' },
        { addr: [0x2010, 0x2013], component: fourBytes.component, name: 'FOUR_BYTES' },
        { addr: [0xd000, 0xdfff], component: mirrored.component, name: 'MIRRORED', mirrorMask: 0x03 },
        { addr: [0xe080, 0xe27f], component: unaligned.component, name: 'UNALIGNED' },
    ];

    test('routes every address in the 64K space to the mapping that contains it', () => {
        const bus = new Bus([...mapping]);
        const mismatches: string[] = [];

        for (let address = 0; address <= 0xffff; address++) {
            const expected = expectedDecode(mapping, address);
            const want = expected ? expected.space.component.read(expected.offset) : 0xff;
            const got = bus.read(address);
            if (got !== want) {
                mismatches.push(`${Formatters.hexWord(address)}: got ${got}, want ${want}`);
            }
        }

        expect(mismatches.slice(0, 5)).toEqual([]);
    });

    test('hands a write the same decoded offset as a read', () => {
        const bus = new Bus([...mapping]);
        unaligned.writes.length = 0;
        mirrored.writes.length = 0;

        bus.write(0xe100, 0xaa); // a whole page inside a mapping that starts mid-page
        bus.write(0xd012, 0xbb); // mirror of register 2
        bus.write(0x3000, 0xcc); // nothing there

        expect(unaligned.writes).toEqual([[0x80, 0xaa]]);
        expect(mirrored.writes).toEqual([[0x02, 0xbb]]);
    });

    test('an address beyond the 16-bit space floats, as an unmapped one does', () => {
        // The JS CPU can form $10000+ before masking (indexed addressing, PC++).
        const bus = new Bus([{ addr: [0x0000, 0xffff], component: probe(7).component, name: 'ALL' }]);

        expect(bus.read(0x10000)).toBe(0xff);
        expect(bus.read(0x100fe)).toBe(0xff);
        expect(bus.read(-1)).toBe(0xff);
    });

    test('decoding does not depend on which addresses were accessed before', () => {
        // More distinct addresses than the old 256-entry cache held, then back
        // to the first ones.
        const bus = new Bus([...mapping]);
        for (let address = 0x0000; address < 0x0800; address++) {
            bus.read(address);
        }

        expect(bus.read(0x0005)).toBe(0x10005);
        expect(bus.read(0x1085)).toBe(0x30005);
        expect(bus.read(0x2011)).toBe(0x40001);
        expect(bus.read(0x2014)).toBe(0xff);
    });
});
