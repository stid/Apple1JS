/**
 * LCD Deep phase 4 — hw-accuracy (AC-3, AC-17)
 *
 * RENDER surface — the display path. From
 * `docs/active/hardware-accuracy-audit.md` finding 1.
 *
 * AC-17 (cycle-paced display busy) was withdrawn: see spec.md Out of scope.
 * Pacing the handshake from emulated cycles quantised the display to the
 * clock's chunk rate, because the cycle count is only observable at chunk
 * boundaries. Finding 13 stands as an accepted deviation.
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

});
