/**
 * LCD Deep phase 4 — hw-accuracy (AC-15, AC-16)
 *
 * Apple 1 partial address decoding and the floating bus, from
 * `docs/active/hardware-accuracy-audit.md` finding 12. Internal emulation
 * behaviour — `none` surface, so no surface suffix on the test names.
 */
import { describe, test, expect } from 'vitest';
import Bus from '../Bus';
import RAM from '../RAM';
import PIA6820 from '../PIA6820';

/** The value a floating Apple 1 data bus reads back. */
const OPEN_BUS = 0xff;

describe('Bus — hardware accuracy', () => {
    test('AC-15: the PIA answers throughout its mirrored region', () => {
        // The Apple 1 decodes partially, so the PIA repeats through the whole
        // of $D000-$DFFF. The mapping widens to cover the repeat and carries an
        // offset mask; no ranges overlap, so validate() is unaffected.
        const pia = new PIA6820();
        const bus = new Bus([
            { addr: [0x0000, 0x0fff], component: new RAM(0x1000), name: 'RAM' },
            { addr: [0xd000, 0xdfff], component: pia, name: 'PIA6820', mirrorMask: 0x03 },
        ]);

        // A write through any mirror reaches the register that address selects.
        bus.write(0xd112, 0x7f); // $D112 mirrors $D012 — port B
        expect(pia.read(0x2), 'write through a mirror reaches port B').toBe(0x7f);

        // And reads decode the same way from every repeat of the block.
        pia.write(0x1, 0x24);
        for (const addr of [0xd011, 0xd015, 0xd111, 0xdff5]) {
            expect(bus.read(addr), `read at $${addr.toString(16)}`).toBe(pia.read(0x1));
        }

        // The base range still works unchanged.
        expect(bus.read(0xd010)).toBe(pia.read(0x0));
    });

    test('AC-16: an unanswered address reads the floating-bus value', () => {
        // Nothing drives the bus, so it floats high. The Rust core already
        // returns this; the TypeScript core returns 0 today.
        const bus = new Bus([{ addr: [0x0000, 0x0fff], component: new RAM(0x1000), name: 'RAM' }]);

        expect(bus.read(0xc000)).toBe(OPEN_BUS);
        expect(bus.read(0x9999)).toBe(OPEN_BUS);
        expect(bus.read(0x1000), 'one past a mapped range').toBe(OPEN_BUS);
    });
});
