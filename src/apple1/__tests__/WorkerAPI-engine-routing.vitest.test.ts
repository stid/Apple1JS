/**
 * WorkerAPI engine-routing tests
 *
 * The debugger reads CPU state via getDebugInfo() and memory via
 * readMemoryRange(). Both must follow the *active* engine: when WASM is
 * active they previously read the dormant JS CPU / stale JS Bus, freezing
 * the debugger. These tests pin the routing to the active (dual) engine.
 */

import { describe, it, expect } from 'vitest';
import { WorkerAPI } from '../WorkerAPI';
import type { WorkerState } from '../WorkerState';

/** Build a WorkerAPI over a hand-rolled WorkerState fake. */
function makeWorkerAPI(opts: {
    dualEngine: unknown | null;
    cpuDebug: Record<string, unknown>;
    busByte: number;
}): WorkerAPI {
    const fakeState = {
        setCallbacks: () => {},
        video: undefined,
        apple1: {
            cpu: { toDebug: () => opts.cpuDebug },
            pia: { toDebug: () => ({}) },
            bus: { read: () => opts.busByte, toDebug: () => ({}) },
            clock: { toDebug: () => ({}) },
        },
        getDualEngine: () => opts.dualEngine,
    } as unknown as WorkerState;

    return new WorkerAPI(fakeState);
}

describe('WorkerAPI debug routing', () => {
    it('getDebugInfo reports the active engine state when a dual engine is present', () => {
        const api = makeWorkerAPI({
            dualEngine: { toDebug: () => ({ REG_PC: '$WASM' }) },
            cpuDebug: { REG_PC: '$JSXX' },
            busByte: 0x00,
        });

        const info = api.getDebugInfo();
        expect(info.cpu.REG_PC).toBe('$WASM');
    });

    it('getDebugInfo falls back to the JS CPU when there is no dual engine', () => {
        const api = makeWorkerAPI({
            dualEngine: null,
            cpuDebug: { REG_PC: '$JSXX' },
            busByte: 0x00,
        });

        const info = api.getDebugInfo();
        expect(info.cpu.REG_PC).toBe('$JSXX');
    });
});

describe('WorkerAPI memory routing', () => {
    it('readMemoryRange reads from the active engine when a dual engine is present', () => {
        const readRange = (_start: number, length: number) => new Uint8Array(length).fill(0xab);
        const api = makeWorkerAPI({
            dualEngine: { toDebug: () => ({}), readRange },
            cpuDebug: {},
            busByte: 0x11, // JS bus would return this; active engine must win
        });

        const data = api.readMemoryRange(0x0100, 4);
        expect(data).toEqual([0xab, 0xab, 0xab, 0xab]);
    });

    it('readMemoryRange falls back to the JS bus when there is no dual engine', () => {
        const api = makeWorkerAPI({
            dualEngine: null,
            cpuDebug: {},
            busByte: 0x11,
        });

        const data = api.readMemoryRange(0x0100, 3);
        expect(data).toEqual([0x11, 0x11, 0x11]);
    });
});
