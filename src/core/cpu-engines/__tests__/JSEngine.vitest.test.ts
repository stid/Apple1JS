/**
 * JSEngine unit tests
 *
 * Covers the two debugger-facing additions that the WASM engine must mirror:
 *  - toDebug(): flat REG_/FLAG_/HW_ snapshot sourced from the live CPU
 *  - host-utilization metric (hostMillisPerSecond) on getMetrics()
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { performance } from 'node:perf_hooks';
import Bus from '../../Bus';
import RAM from '../../RAM';
import { JSEngine } from '../JSEngine';

function makeEngine(): JSEngine {
    const ram = new RAM(0xffff);
    const bus = new Bus([{ component: ram, addr: [0x0000, 0xffff], name: 'RAM' }]);
    return new JSEngine(bus);
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('JSEngine.toDebug', () => {
    it('returns the debugger field shape sourced from the live CPU', () => {
        const engine = makeEngine();
        // LDA #$42  (A9 42)
        engine.writeRange(0x0000, new Uint8Array([0xa9, 0x42]));
        engine.setRegisters({ PC: 0x0000 });
        engine.performSingleStep();

        const dbg = engine.toDebug();

        expect(dbg.REG_A).toBe('$42');
        expect(dbg.REG_PC).toBe('$0002');
        expect(dbg.HW_OPCODE).toBe('$A9');
        expect(dbg.IRQ_LINE).toBe('INACTIVE');
        expect(dbg.NMI_LINE).toBe('INACTIVE');
        // flags are reported as SET/CLR strings
        expect(['SET', 'CLR']).toContain(dbg.FLAG_Z);
    });
});

describe('JSEngine host-utilization metric', () => {
    it('reports host milliseconds spent per emulated second', () => {
        const engine = makeEngine();

        // Mock performance.now() so each performBulkSteps call "costs" 5ms of
        // host time (start=0, end=5). updateIPSMetrics/getMetrics use Date.now,
        // so performance.now is called exactly twice per bulk step.
        const times = [0, 5];
        let i = 0;
        vi.spyOn(performance, 'now').mockImplementation(() => times[i++ % times.length]);

        // 100_000 cycles at 1MHz = 0.1 emulated seconds, costing 5ms host.
        engine.performBulkSteps(100_000);

        const metrics = engine.getMetrics();
        // 5ms host / 0.1 emulated s = 50 ms host per emulated second.
        expect(metrics.hostMillisPerSecond).toBeCloseTo(50, 5);
    });

    it('is 0 before any work has run', () => {
        const engine = makeEngine();
        expect(engine.getMetrics().hostMillisPerSecond).toBe(0);
    });
});
