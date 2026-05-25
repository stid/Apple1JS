/**
 * DualEngine breakpoint-routing tests
 *
 * DualEngine must fan breakpoint mutations to both sub-engines (so a later
 * engine switch preserves them) and relay onBreakpointHit from whichever engine
 * is active. In node, WASM is unsupported, so the JS engine is always active and
 * acts as the real-execution oracle.
 */

import { describe, it, expect } from 'vitest';
import Bus from '../../Bus';
import RAM from '../../RAM';
import { DualEngine } from '../DualEngine';

function makeDualEngine(): DualEngine {
    const ram = new RAM(0xffff);
    const bus = new Bus([{ component: ram, addr: [0x0000, 0xffff], name: 'RAM' }]);
    // 'JS' initial engine: WASM is unavailable under node and would fall back anyway.
    return new DualEngine(bus, 'JS');
}

describe('DualEngine breakpoint routing', () => {
    it('set/clear/clearAll are reflected by the active engine', () => {
        const engine = makeDualEngine();

        engine.setBreakpoint(0x1234);
        expect(engine.getBreakpoints()).toContain(0x1234);
        expect(engine.hasBreakpoint(0x1234)).toBe(true);

        engine.clearBreakpoint(0x1234);
        expect(engine.getBreakpoints()).not.toContain(0x1234);

        engine.setBreakpoint(0x1);
        engine.setBreakpoint(0x2);
        engine.clearAllBreakpoints();
        expect(engine.getBreakpoints()).toEqual([]);
    });

    it('relays an active-engine breakpoint hit to a DualEngine subscriber', () => {
        const engine = makeDualEngine();
        engine.writeRange(0x0000, new Uint8Array(16).fill(0xea)); // NOPs
        engine.writeRange(0xfffc, new Uint8Array([0x00, 0x00])); // reset vector -> 0x0000
        engine.reset(); // PC <- reset vector (0x0000) on the active engine
        engine.setBreakpoint(0x0002);

        const hits: number[] = [];
        engine.onBreakpointHit?.((addr) => hits.push(addr));

        engine.performBulkSteps(100);

        expect(hits).toEqual([0x0002]);
        expect(engine.getRegisters().PC).toBe(0x0002);
    });
});
