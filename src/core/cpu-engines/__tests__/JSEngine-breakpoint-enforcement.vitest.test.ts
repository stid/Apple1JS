/**
 * JSEngine breakpoint-enforcement tests
 *
 * The JS engine is the node-runnable parity oracle for the WASM engine. It must
 * actually halt at a breakpoint (not merely log) and emit onBreakpointHit, and a
 * single step must be able to advance *past* a breakpoint sitting on the current
 * PC (so the debugger can step off a breakpoint).
 */

import { describe, it, expect } from 'vitest';
import Bus from '../../Bus';
import RAM from '../../RAM';
import { JSEngine } from '../JSEngine';

function makeEngine(): JSEngine {
    const ram = new RAM(0xffff);
    const bus = new Bus([{ component: ram, addr: [0x0000, 0xffff], name: 'RAM' }]);
    const engine = new JSEngine(bus);
    // Fill with NOP (0xEA, 2 cycles each) so PC walks forward predictably.
    engine.writeRange(0x0000, new Uint8Array(32).fill(0xea));
    return engine;
}

describe('JSEngine breakpoint enforcement', () => {
    it('halts bulk execution at the breakpoint and fires onBreakpointHit once', () => {
        const engine = makeEngine();
        engine.setRegisters({ PC: 0x0000 });
        engine.setBreakpoint(0x0003);

        const hits: number[] = [];
        engine.onBreakpointHit?.((addr) => hits.push(addr));

        engine.performBulkSteps(100);

        // Stopped *before* executing the instruction at the breakpoint.
        expect(engine.getRegisters().PC).toBe(0x0003);
        expect(hits).toEqual([0x0003]);
    });

    it('single-step advances past a breakpoint on the current PC without firing', () => {
        const engine = makeEngine();
        engine.setRegisters({ PC: 0x0003 });
        engine.setBreakpoint(0x0003);

        const hits: number[] = [];
        engine.onBreakpointHit?.((addr) => hits.push(addr));

        const cycles = engine.performSingleStep();

        expect(cycles).toBeGreaterThan(0);
        expect(engine.getRegisters().PC).toBe(0x0004);
        expect(hits).toEqual([]);
    });

    it('does not halt once the breakpoint is cleared', () => {
        const engine = makeEngine();
        engine.setRegisters({ PC: 0x0000 });
        engine.setBreakpoint(0x0003);
        engine.clearBreakpoint(0x0003);

        const hits: number[] = [];
        engine.onBreakpointHit?.((addr) => hits.push(addr));

        engine.performBulkSteps(10); // ~5 NOPs, would pass 0x0003

        expect(hits).toEqual([]);
        expect(engine.getRegisters().PC).toBeGreaterThan(0x0003);
    });

    it('unsubscribing stops further notifications', () => {
        const engine = makeEngine();
        engine.setRegisters({ PC: 0x0000 });
        engine.setBreakpoint(0x0002);

        const hits: number[] = [];
        const unsub = engine.onBreakpointHit?.((addr) => hits.push(addr));
        unsub?.();

        engine.performBulkSteps(100);

        expect(hits).toEqual([]);
        expect(engine.getRegisters().PC).toBe(0x0002); // still halts execution
    });
});
