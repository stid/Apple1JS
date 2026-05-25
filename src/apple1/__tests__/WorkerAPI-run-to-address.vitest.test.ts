/**
 * WorkerAPI run-to-cursor tests
 *
 * Run-to-cursor previously installed an execution hook on apple1.cpu (the JS
 * CPU only), so it never worked when the WASM engine was active. The unified
 * implementation models it as a *transient* breakpoint on the active engine:
 * set the target as a breakpoint, resume, and clear it once reached.
 */

import { describe, it, expect } from 'vitest';
import { WorkerAPI } from '../WorkerAPI';
import type { WorkerState } from '../WorkerState';

interface EngineCall {
    op: 'set' | 'clear' | 'clearAll';
    address?: number;
}

function makeFakeEngine(currentPC: number) {
    const calls: EngineCall[] = [];
    let hitListener: ((address: number) => void) | undefined;
    return {
        calls,
        fireHit(address: number) {
            hitListener?.(address);
        },
        engine: {
            setBreakpoint: (address: number) => calls.push({ op: 'set', address }),
            clearBreakpoint: (address: number) => calls.push({ op: 'clear', address }),
            clearAllBreakpoints: () => calls.push({ op: 'clearAll' }),
            getRegisters: () => ({ PC: currentPC }),
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

function makeWorkerAPI(fake: ReturnType<typeof makeFakeEngine>, isPaused = true) {
    const resumeCalls: number[] = [];
    const state = {
        setCallbacks: () => {},
        video: undefined,
        breakpoints: new Set<number>(),
        runToCursorTarget: null as number | null,
        isPaused,
        isStepping: false,
        apple1: {
            cpu: { PC: 0x0000, toDebug: () => ({}) },
            clock: {
                pause: () => {},
                resume: () => resumeCalls.push(1),
            },
        },
        getDualEngine: () => fake.engine,
    };
    const api = new WorkerAPI(state as unknown as WorkerState);
    return { api, state, resumeCalls };
}

describe('WorkerAPI.runToAddress', () => {
    it('sets a transient breakpoint on the active engine and resumes', () => {
        const fake = makeFakeEngine(0x0000);
        const { api, state, resumeCalls } = makeWorkerAPI(fake);

        api.runToAddress(0xff00);

        expect(fake.calls).toContainEqual({ op: 'set', address: 0xff00 });
        expect(state.runToCursorTarget).toBe(0xff00);
        expect(resumeCalls.length).toBe(1);
    });

    it('clears the transient breakpoint and reports completion when the target is reached', () => {
        const fake = makeFakeEngine(0x0000);
        const { api, state } = makeWorkerAPI(fake);

        const targets: Array<number | null> = [];
        api.onRunToCursorTarget((t) => targets.push(t));

        api.runToAddress(0xff00);
        fake.fireHit(0xff00);

        expect(fake.calls).toContainEqual({ op: 'clear', address: 0xff00 });
        expect(state.runToCursorTarget).toBeNull();
        expect(targets).toEqual([0xff00, null]);
    });

    it('does not clear a target that is also a real user breakpoint', () => {
        const fake = makeFakeEngine(0x0000);
        const { api, state } = makeWorkerAPI(fake);
        state.breakpoints.add(0xff00); // user breakpoint at the same address

        api.runToAddress(0xff00);
        fake.fireHit(0xff00);

        // The user breakpoint must survive run-to-cursor completion.
        expect(fake.calls).not.toContainEqual({ op: 'clear', address: 0xff00 });
    });

    it('does nothing when already at the target address', () => {
        const fake = makeFakeEngine(0xff00); // active engine PC already at target
        const { api, resumeCalls } = makeWorkerAPI(fake);

        api.runToAddress(0xff00);

        expect(fake.calls).toEqual([]);
        expect(resumeCalls.length).toBe(0);
    });
});
