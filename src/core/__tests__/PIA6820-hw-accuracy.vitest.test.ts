/**
 * LCD Deep phase 4 — hw-accuracy (AC-1, AC-2, AC-4, AC-5)
 *
 * Hardware-accuracy criteria for the 6820/6821 PIA, from
 * `docs/active/hardware-accuracy-audit.md` findings 1-3. Internal emulation
 * behaviour — `none` surface, so no surface suffix on the test names.
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import PIA6820 from '../PIA6820';
import type { IoComponent } from '../types';

/** The six registers as the inspectable tree exposes them, e.g. `$04`. */
function registers(pia: PIA6820): Record<string, unknown> {
    return pia.getInspectable().state as Record<string, unknown>;
}

describe('PIA6820 — hardware accuracy', () => {
    let pia: PIA6820;

    beforeEach(() => {
        pia = new PIA6820();
    });

    test('AC-1: PIA powers up with all registers zero', () => {
        // MC6821 datasheet: the RES line resets every register in the PIA to a
        // logical zero. We currently seed CRA/CRB to $04 and DDRB to $7F, which
        // is the state WOZMON is supposed to produce, pre-applied.
        for (const pass of ['power-on', 'after reset'] as const) {
            if (pass === 'after reset') pia.reset();
            const r = registers(pia);
            expect(r['Port A Control'], `CRA ${pass}`).toBe('$00');
            expect(r['Port B Control'], `CRB ${pass}`).toBe('$00');
            expect(r['Port A DDR'], `DDRA ${pass}`).toBe('$00');
            expect(r['Port B DDR'], `DDRB ${pass}`).toBe('$00');
            expect(r['Port A Data'], `ORA ${pass}`).toBe('$00');
            expect(r['Port B Data'], `ORB ${pass}`).toBe('$00');
        }
    });

    test('AC-2: monitor port-B direction write reaches DDRB', () => {
        // WOZMON $FF02: LDY #$7F / STY $D012. With CRB bit 2 clear (the real
        // power-on state) that write selects DDRB. If CRB bit 2 is set, it
        // selects ORB instead and pushes $7F at the display.
        const write = vi.fn();
        pia.wireIOB({ write } as unknown as IoComponent);

        pia.write(0x2, 0x7f);

        const r = registers(pia);
        expect(r['Port B DDR'], 'DDRB should hold the direction mask').toBe('$7F');
        expect(r['Port B Data'], 'ORB should be untouched').toBe('$00');
        expect(write, 'no character should reach the display').not.toHaveBeenCalled();
    });

    test('AC-4: reading data register A clears both interrupt flags', () => {
        // Datasheet: both IRQA1 (bit 7) and IRQA2 (bit 6) are cleared by an MPU
        // read of Peripheral Data Register A. We clear only bit 7 today.
        // CRA $17 — b0 CA1 IRQ enable, b1 CA1 positive edge, b2 select data
        // register, b4 CA2 positive edge, b5 clear so CA2 is an input.
        pia.write(0x1, 0x17);
        pia.setCA1(true);
        pia.setCA2(true);
        expect(pia.read(0x1) & 0xc0, 'both flags should be set first').toBe(0xc0);

        pia.read(0x0);

        expect(pia.read(0x1) & 0xc0).toBe(0x00);
    });

    test('AC-5: reading the direction register clears no interrupt flag', () => {
        // With CRA bit 2 clear the same address decodes to DDRA, which is a
        // different access — it must not touch the interrupt flags.
        pia.write(0x1, 0x13); // as above but b2 clear -> DDRA selected
        pia.setCA1(true);
        expect(pia.read(0x1) & 0x80, 'IRQA1 should be set first').toBe(0x80);

        pia.read(0x0); // reads DDRA, not the peripheral data register

        expect(pia.read(0x1) & 0x80).toBe(0x80);
    });
});
