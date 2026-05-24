/**
 * WorkerAPI write-routing parity tests (SDD: wasm-js-parity, AC-6).
 *
 * The read path (readMemoryRange / getDebugInfo) already routes through the
 * active dual engine — see WorkerAPI-engine-routing.vitest.test.ts. The write
 * path historically did NOT: writeMemory wrote straight to the JS Bus, so a
 * hex-editor edit never reached the WASM engine's own RAM. These tests pin the
 * write path to the dual engine (which fans the write to both engines).
 */

import { describe, it, expect, vi } from 'vitest';
import { WorkerAPI } from '../WorkerAPI';
import type { WorkerState } from '../WorkerState';

function makeWorkerAPI(opts: {
    dualEngine: { write: ReturnType<typeof vi.fn> } | null;
    busWrite: ReturnType<typeof vi.fn>;
}): WorkerAPI {
    const fakeState = {
        setCallbacks: () => {},
        video: undefined,
        apple1: {
            cpu: { toDebug: () => ({}) },
            pia: { toDebug: () => ({}) },
            bus: { read: () => 0x00, write: opts.busWrite, toDebug: () => ({}) },
            clock: { toDebug: () => ({}) },
        },
        getDualEngine: () => opts.dualEngine,
    } as unknown as WorkerState;

    return new WorkerAPI(fakeState);
}

describe('WorkerAPI write routing', () => {
    it('AC-6: hex-editor write reaches both engines', () => {
        const dualWrite = vi.fn();
        const busWrite = vi.fn();
        const api = makeWorkerAPI({ dualEngine: { write: dualWrite }, busWrite });

        api.writeMemory(0x0200, 0x42);

        // The write must go through the dual engine (which writes BOTH the JS
        // and WASM engines), not the bare JS bus that only the JS engine reads.
        expect(dualWrite).toHaveBeenCalledWith(0x0200, 0x42);
    });

    it('writeMemory falls back to the JS bus when there is no dual engine', () => {
        const busWrite = vi.fn();
        const api = makeWorkerAPI({ dualEngine: null, busWrite });

        api.writeMemory(0x0200, 0x42);

        expect(busWrite).toHaveBeenCalledWith(0x0200, 0x42);
    });
});
