/**
 * LCD Deep phase 4 — hw-accuracy (AC-3, AC-17)
 *
 * RENDER surface — the display path. From
 * `docs/active/hardware-accuracy-audit.md` findings 1 and 13.
 * Plan cross-path matrix binds both to `src/apple1/DisplayLogic.ts`.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import DisplayLogic from '../DisplayLogic';
import PIA6820 from '../../core/PIA6820';

describe('DisplayLogic — hardware accuracy', () => {
    let pia: PIA6820;
    let displayLogic: DisplayLogic;
    let written: number[];

    beforeEach(() => {
        pia = new PIA6820();
        displayLogic = new DisplayLogic(pia);
        written = [];
        displayLogic.wire({ write: async (v: number) => void written.push(v) });
        pia.wireIOB(displayLogic);
    });

    test('AC-3 (RENDER): monitor startup emits no character', async () => {
        // WOZMON's reset entry, as it appears in src/apple1/progs/woz_monitor.ts:
        //   FF00 CLD / FF01 CLI / FF02 LDY #$7F / FF04 STY $D012
        //   FF07 LDA #$A7 / FF09 STA $D011 / FF0C STA $D013
        // From a true power-on state the STY selects DDRB, so nothing is sent
        // to the display. If CRB bit 2 is pre-set it selects ORB instead and
        // pushes $7F at the screen on every reset.
        pia.write(0x2, 0x7f); // STY $D012
        pia.write(0x1, 0xa7); // STA $D011
        pia.write(0x3, 0xa7); // STA $D013
        await Promise.resolve();

        expect(written, 'startup sequence must not reach the display').toEqual([]);
    });

    test('AC-17 (RENDER): display busy is held for emulated time', async () => {
        // The real terminal needs a full video field per character. Busy must
        // be released by emulated cycles elapsing, never by host scheduling.
        let emulatedCycles = 0;
        pia.wireCycleProvider(() => emulatedCycles);
        pia.write(0x3, 0x04); // select ORB so writes reach the display

        await displayLogic.write(0xc1);

        expect(pia.read(0x2) & 0x80, 'busy immediately after the write').toBe(0x80);

        // Host turns of the event loop must not release it.
        await Promise.resolve();
        await Promise.resolve();
        expect(pia.read(0x2) & 0x80, 'still busy after host microtasks').toBe(0x80);

        emulatedCycles = 1000;
        expect(pia.read(0x2) & 0x80, 'still busy part-way through the field').toBe(0x80);

        emulatedCycles = 30_000;
        expect(pia.read(0x2) & 0x80, 'released once the field has elapsed').toBe(0x00);
    });
});
