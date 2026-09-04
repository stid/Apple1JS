/**
 * LCD Deep phase 4 — hw-accuracy (AC-6, AC-7, AC-8, AC-9, AC-10, AC-12, AC-13, AC-14)
 *
 * Hardware-accuracy criteria for the 6502 core, from
 * `docs/active/hardware-accuracy-audit.md` findings 4-11. Internal emulation
 * behaviour — `none` surface, so no surface suffix on the test names.
 *
 * Scope note: these run the TypeScript engine. The Rust engine cannot be
 * exercised under Node (see `docs/active/cpu_test_guidelines.md`), so the
 * "on both engines" half of AC-6, AC-7, AC-8, AC-9, AC-10, AC-12 and AC-14 is
 * covered by the browser-verification tasks T11 and T34 in `tasks.md`, not here.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import Bus from '../Bus';
import RAM from '../RAM';
import CPU6502 from '../cpu6502';

describe('CPU6502 — hardware accuracy', () => {
    let bus: Bus;
    let cpu: CPU6502;

    beforeEach(() => {
        const ram = new RAM(0x10000);
        bus = new Bus([{ addr: [0x0000, 0xffff], component: ram, name: 'RAM64K' }]);
        cpu = new CPU6502(bus);
        cpu.reset();
        cpu.PC = 0x0200;
        cpu.cycles = 0;
    });

    const load = (addr: number, ...bytes: number[]) => bytes.forEach((b, i) => bus.write(addr + i, b));

    test('AC-6: decimal add and subtract follow BCD', () => {
        // NMOS semantics: accumulator and carry are BCD; N/Z/V come from the
        // binary result. The Rust engine ignores the decimal flag entirely —
        // that half is T11.
        cpu.D = 1;

        cpu.A = 0x09;
        cpu.C = 0;
        load(0x0200, 0x69, 0x01); // ADC #$01
        cpu.performSingleStep();
        expect(cpu.A, '$09 + $01 in decimal').toBe(0x10);
        expect(cpu.C).toBe(0);

        cpu.PC = 0x0210;
        cpu.A = 0x99;
        cpu.C = 0;
        load(0x0210, 0x69, 0x01); // ADC #$01
        cpu.performSingleStep();
        expect(cpu.A, '$99 + $01 in decimal wraps').toBe(0x00);
        expect(cpu.C, 'and carries').toBe(1);

        cpu.PC = 0x0220;
        cpu.A = 0x10;
        cpu.C = 1;
        load(0x0220, 0xe9, 0x01); // SBC #$01
        cpu.performSingleStep();
        expect(cpu.A, '$10 - $01 in decimal').toBe(0x09);
    });

    test('AC-7: indexed-indirect pointer wraps in zero page', () => {
        // LDA ($80,X) with X=$7F -> pointer base $FF. The real 6502 reads the
        // high byte from $0000, not $0100.
        load(0x0200, 0xa1, 0x80);
        bus.write(0x00ff, 0x34); // pointer low
        bus.write(0x0000, 0x12); // pointer high, wrapped
        bus.write(0x0100, 0xab); // pointer high if the wrap is missing
        bus.write(0x1234, 0x11);
        bus.write(0xab34, 0x22);
        cpu.X = 0x7f;

        cpu.performSingleStep();

        expect(cpu.A).toBe(0x11);
    });

    test('AC-8: indirect jump reproduces the page-boundary vector bug', () => {
        // "An indirect jump must never use a vector beginning on the last byte
        // of a page" — the high byte comes from the start of the same page.
        load(0x0200, 0x6c, 0xff, 0x10); // JMP ($10FF)
        bus.write(0x10ff, 0x00);
        bus.write(0x1000, 0x40); // real 6502 reads here -> $4000
        bus.write(0x1100, 0x80); // where a "fixed" implementation would read
        cpu.performSingleStep();
        expect(cpu.PC, 'pointer dereference wraps within the page').toBe(0x4000);

        // The operand fetch itself does NOT wrap: a JMP at $20FE reads its
        // vector bytes from $20FF and $2100.
        cpu.PC = 0x20fe;
        load(0x20fe, 0x6c, 0x34);
        bus.write(0x2100, 0x12); // operand high -> pointer $1234
        bus.write(0x2000, 0x99); // where a wrapped operand fetch would read
        bus.write(0x1234, 0x00);
        bus.write(0x1235, 0x44);
        cpu.performSingleStep();
        expect(cpu.PC, 'operand fetch crosses the page normally').toBe(0x4400);
    });

    test('AC-9: software interrupt leaves the decimal flag alone', () => {
        // NMOS 6502: BRK/IRQ/NMI do not affect D. Clearing it is 65C02 behaviour.
        load(0x0200, 0x00, 0xea);
        bus.write(0xfffe, 0x00);
        bus.write(0xffff, 0x30);
        cpu.D = 1;

        cpu.performSingleStep();

        expect(cpu.D).toBe(1);
    });

    test('AC-10: indexed stores and RMW cost a fixed cycle count', () => {
        const run = (setup: () => void): number => {
            cpu.reset();
            cpu.PC = 0x0200;
            cpu.cycles = 0;
            setup();
            return cpu.performSingleStep();
        };

        // Stores always pay the index fix-up cycle, page crossing or not.
        expect(
            run(() => {
                load(0x0200, 0x9d, 0x00, 0x12);
                cpu.X = 0x01;
            }),
            'STA abs,X no page cross',
        ).toBe(5);
        expect(
            run(() => {
                load(0x0200, 0x9d, 0xff, 0x12);
                cpu.X = 0x01;
            }),
            'STA abs,X page cross',
        ).toBe(5);
        expect(
            run(() => {
                load(0x0200, 0x99, 0x00, 0x12);
                cpu.Y = 0x01;
            }),
            'STA abs,Y no page cross',
        ).toBe(5);
        expect(
            run(() => {
                load(0x0200, 0x91, 0x80);
                bus.write(0x80, 0x00);
                bus.write(0x81, 0x12);
                cpu.Y = 0x01;
            }),
            'STA (zp),Y no page cross',
        ).toBe(6);
        expect(
            run(() => {
                load(0x0200, 0x1e, 0x00, 0x12);
                cpu.X = 0x01;
            }),
            'ASL abs,X no page cross',
        ).toBe(7);

        // Loads keep their conditional penalty — this must not regress.
        expect(
            run(() => {
                load(0x0200, 0xbd, 0x00, 0x12);
                cpu.X = 0x01;
            }),
            'LDA abs,X no page cross',
        ).toBe(4);
        expect(
            run(() => {
                load(0x0200, 0xbd, 0xff, 0x12);
                cpu.X = 0x01;
            }),
            'LDA abs,X page cross',
        ).toBe(5);
    });

    test('AC-12: reset preserves registers and decrements the stack pointer by three', () => {
        // Reset performs three fake stack reads; it does not clear the
        // registers and does not touch the decimal flag.
        bus.write(0xfffc, 0x00);
        bus.write(0xfffd, 0xff);
        cpu.A = 0x11;
        cpu.X = 0x22;
        cpu.Y = 0x33;
        cpu.S = 0x80;
        cpu.D = 1;

        cpu.reset();

        expect(cpu.A, 'accumulator preserved').toBe(0x11);
        expect(cpu.X, 'X preserved').toBe(0x22);
        expect(cpu.Y, 'Y preserved').toBe(0x33);
        expect(cpu.S, 'stack pointer decremented by three').toBe(0x7d);
        expect(cpu.D, 'decimal flag untouched').toBe(1);
        expect(cpu.I, 'interrupts disabled').toBe(1);
        expect(cpu.PC, 'reset vector loaded').toBe(0xff00);
    });

    test('AC-13: non-maskable interrupt latches on the assertion edge', () => {
        expect(cpu.pendingNmi).toBe(0);

        cpu.setNmi(true);
        expect(cpu.pendingNmi, 'latched when the line is asserted').toBe(1);

        cpu.pendingNmi = 0;
        cpu.setNmi(false);
        expect(cpu.pendingNmi, 'release must not latch').toBe(0);

        // The defining property of edge triggering: a line already asserted
        // must not latch again. Without this case the test passes even with the
        // edge check removed, since every assertion above follows a low state.
        cpu.setNmi(true);
        cpu.pendingNmi = 0;
        cpu.setNmi(true);
        expect(cpu.pendingNmi, 'a line held high must not re-latch').toBe(0);
    });

    test('AC-14: undocumented read-modify-write instructions write back the memory result', () => {
        const probe = (opcode: number, memIn: number, a: number, c: number) => {
            cpu.reset();
            cpu.PC = 0x0200;
            cpu.cycles = 0;
            load(0x0200, opcode, 0x10);
            bus.write(0x0010, memIn);
            cpu.A = a;
            cpu.C = c;
            cpu.performSingleStep();
            return { mem: bus.read(0x0010), a: cpu.A, c: cpu.C };
        };

        // Each writes back what its *memory* operation produces, independent of
        // what it leaves in the accumulator.
        expect(probe(0x07, 0x40, 0x01, 0), 'SLO $10').toMatchObject({ mem: 0x80, a: 0x81 });
        expect(probe(0x27, 0x40, 0x0f, 0), 'RLA $10').toMatchObject({ mem: 0x80, a: 0x00 });
        expect(probe(0x47, 0x02, 0x0f, 0), 'SRE $10').toMatchObject({ mem: 0x01, a: 0x0e });
        expect(probe(0x67, 0x02, 0x10, 0), 'RRA $10').toMatchObject({ mem: 0x01, a: 0x11 });
        expect(probe(0xc7, 0x05, 0x05, 0), 'DCP $10').toMatchObject({ mem: 0x04, a: 0x05, c: 1 });
        expect(probe(0xe7, 0x05, 0x10, 1), 'ISC $10').toMatchObject({ mem: 0x06, a: 0x0a });

        // ANC #imm: A &= imm, then carry takes the sign bit of the result.
        // The immediate must clear bits, or the assertion cannot tell a real
        // AND from leaving A untouched.
        cpu.reset();
        cpu.PC = 0x0200;
        load(0x0200, 0x0b, 0xf0);
        cpu.A = 0x0f;
        cpu.performSingleStep();
        expect(cpu.A, 'ANC #$F0 with A=$0F clears every bit').toBe(0x00);
        expect(cpu.C, 'carry follows bit 7 of the result').toBe(0);

        // And the C = N path.
        cpu.reset();
        cpu.PC = 0x0200;
        load(0x0200, 0x0b, 0xff);
        cpu.A = 0x81;
        cpu.performSingleStep();
        expect(cpu.A, 'ANC #$FF with A=$81').toBe(0x81);
        expect(cpu.C, 'carry set when bit 7 of the result is set').toBe(1);
    });

    test('decimal ARR adjusts the rotated value and keeps ROR-phase flags', () => {
        // NMOS behaviour (VICE / "No More Secrets"): in decimal mode ARR still
        // rotates A AND #imm through the carry, takes N from the incoming carry
        // and Z from the rotated value, then applies the BCD fix-ups to that
        // rotated value. Replacing the rotated value with a fix-up built from
        // the pre-rotate byte loses the carry-in — the bug these inputs catch.
        const arr = (a: number, imm: number, c: number) => {
            cpu.reset();
            cpu.PC = 0x0200;
            cpu.D = 1;
            cpu.A = a;
            cpu.C = c;
            load(0x0200, 0x6b, imm); // ARR #imm
            cpu.performSingleStep();
            return { a: cpu.A, c: cpu.C, n: cpu.N, z: cpu.Z };
        };

        // t = $00 with carry in: the carry rotates into bit 7 and survives.
        expect(arr(0xff, 0x00, 1), 'ARR #$00 with C=1').toEqual({ a: 0x80, c: 0, n: 1, z: 0 });
        // Low-nibble fix-up applies +6 to the rotated $07, not to the source.
        expect(arr(0x0f, 0x0f, 0), 'ARR #$0F low-nibble fix-up').toEqual({ a: 0x0d, c: 0, n: 0, z: 0 });
        // High-nibble fix-up applies +$60 to the rotated $78 and sets carry.
        expect(arr(0xf0, 0xf0, 0), 'ARR #$F0 high-nibble fix-up').toEqual({ a: 0xd8, c: 1, n: 0, z: 0 });
    });
});
