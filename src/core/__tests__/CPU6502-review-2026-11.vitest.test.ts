import { describe, it, expect } from 'vitest';
import CPU6502 from '../cpu6502';
import Bus from '../Bus';
import RAM from '../RAM';

function makeCpu() {
    const ram = new RAM(0x10000);
    const bus = new Bus([{ component: ram, addr: [0x0000, 0xffff], name: 'RAM' }]);
    for (let a = 0x0300; a < 0x0340; a++) bus.write(a, 0xea); // NOP, 2 cycles
    const cpu = new CPU6502(bus);
    cpu.PC = 0x0300;
    return cpu;
}

describe('CPU6502 bulk stepping budget (review-2026-11)', () => {
    it('a zero-cycle budget executes nothing', () => {
        // Clock.subscribe() calls its subscriber immediately with 0 cycles. With
        // a `<=` budget check that ran one instruction, so the JS engine executed
        // whatever sat at the power-on PC before the reset sequence.
        const cpu = makeCpu();

        cpu.performBulkSteps(0);

        expect(cpu.PC).toBe(0x0300);
    });

    it('stops once the budget is spent, like the WASM engine', () => {
        // 4 cycles = exactly two NOPs. The old check ran a third.
        const cpu = makeCpu();

        cpu.performBulkSteps(4);

        expect(cpu.PC).toBe(0x0302);
    });

    it('loading a state without cycleAccurateMode leaves the slow path off', () => {
        const cpu = makeCpu();
        const state = cpu.saveState();
        delete (state as Partial<typeof state>).cycleAccurateMode;

        cpu.loadState(state);

        expect(cpu.cycleAccurateMode).toBe(false);
    });
});
