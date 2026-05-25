/**
 * WorkerAPI breakpoint engine-routing tests
 *
 * Regression: breakpoints set through the worker never reached the active CPU
 * engine, so the WASM engine (the default) never enforced them — its Rust
 * HashSet stayed empty. These tests pin two contracts:
 *
 *  1. set/clear/clearAll route to the active (dual) engine, so the running
 *     engine (incl. the Rust HashSet) is actually populated.
 *  2. an engine-reported hit drives the unified pause/notify path
 *     (clock.pause + isPaused + status('paused') + breakpoint(pc)).
 */

import { describe, it, expect } from 'vitest';
import { WorkerAPI } from '../WorkerAPI';
import type { WorkerState } from '../WorkerState';

interface EngineCall {
    op: 'set' | 'clear' | 'clearAll';
    address?: number;
}

/** A fake dual engine that records breakpoint routing and captures the hit listener. */
function makeFakeEngine() {
    const calls: EngineCall[] = [];
    let hitListener: ((address: number) => void) | undefined;
    return {
        calls,
        /** Simulate the engine (e.g. WASM/Rust) reporting a breakpoint hit. */
        fireHit(address: number) {
            hitListener?.(address);
        },
        engine: {
            setBreakpoint: (address: number) => calls.push({ op: 'set', address }),
            clearBreakpoint: (address: number) => calls.push({ op: 'clear', address }),
            clearAllBreakpoints: () => calls.push({ op: 'clearAll' }),
            getRegisters: () => ({ PC: 0x1234 }),
            onBreakpointHit: (cb: (address: number) => void) => {
                hitListener = cb;
                return () => {
                    hitListener = undefined;
                };
            },
            toDebug: () => ({}),
        },
    };
}

function makeWorkerAPI(fakeEngine: ReturnType<typeof makeFakeEngine>) {
    const pauseCalls: number[] = [];
    const state = {
        setCallbacks: () => {},
        video: undefined,
        breakpoints: new Set<number>(),
        runToCursorTarget: null as number | null,
        isPaused: false,
        isStepping: false,
        apple1: {
            cpu: { PC: 0x0000, toDebug: () => ({}) },
            clock: {
                pause: () => pauseCalls.push(1),
                resume: () => {},
            },
        },
        getDualEngine: () => fakeEngine.engine,
    };
    const api = new WorkerAPI(state as unknown as WorkerState);
    return { api, state, pauseCalls };
}

describe('WorkerAPI breakpoint routing to the active engine', () => {
    it('setBreakpoint routes to the active engine (populates the running engine)', () => {
        const fake = makeFakeEngine();
        const { api } = makeWorkerAPI(fake);

        api.setBreakpoint(0x1234);

        expect(fake.calls).toContainEqual({ op: 'set', address: 0x1234 });
    });

    it('clearBreakpoint and clearAllBreakpoints route to the active engine', () => {
        const fake = makeFakeEngine();
        const { api } = makeWorkerAPI(fake);

        api.setBreakpoint(0x10);
        api.clearBreakpoint(0x10);
        api.clearAllBreakpoints();

        expect(fake.calls).toEqual([{ op: 'set', address: 0x10 }, { op: 'clear', address: 0x10 }, { op: 'clearAll' }]);
    });

    it('still tracks breakpoints in worker state and returns the list', () => {
        const fake = makeFakeEngine();
        const { api, state } = makeWorkerAPI(fake);

        const after = api.setBreakpoint(0x20);
        expect(after).toEqual([0x20]);
        expect(state.breakpoints.has(0x20)).toBe(true);
    });
});

describe('WorkerAPI unified breakpoint-hit notification', () => {
    it('an engine-reported hit pauses the clock and notifies status + breakpoint callbacks', () => {
        const fake = makeFakeEngine();
        const { api, state, pauseCalls } = makeWorkerAPI(fake);

        const statuses: string[] = [];
        const hits: number[] = [];
        api.onEmulationStatus((s) => statuses.push(s));
        api.onBreakpointHit((addr) => hits.push(addr));

        fake.fireHit(0x300);

        expect(pauseCalls.length).toBe(1);
        expect(state.isPaused).toBe(true);
        expect(statuses).toContain('paused');
        expect(hits).toEqual([0x300]);
    });

    it('ignores a hit while single-stepping (stepping bypasses breakpoints)', () => {
        const fake = makeFakeEngine();
        const { api, state, pauseCalls } = makeWorkerAPI(fake);
        state.isStepping = true;

        const hits: number[] = [];
        api.onBreakpointHit((addr) => hits.push(addr));

        fake.fireHit(0x300);

        expect(pauseCalls.length).toBe(0);
        expect(hits).toEqual([]);
    });
});
