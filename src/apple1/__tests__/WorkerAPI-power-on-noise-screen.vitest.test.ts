/**
 * SDD Phase 4 — power-on-noise-screen (AC-4)
 *
 * The regression: a display observer that subscribes after power-on must receive
 * the current on-screen frame immediately, otherwise the cold-start noise screen
 * (emitted before any React subscriber registered) is never shown.
 * RENDER surface, WorkerAPI. See plan.md cross-path matrix.
 */
import { describe, test, expect } from 'vitest';
import { WorkerAPI } from '../WorkerAPI';
import type { WorkerState } from '../WorkerState';
import WebCRTVideo from '../WebCRTVideo';
import type { VideoData } from '../TSTypes';

/** Build a WorkerAPI over a hand-rolled WorkerState fake with a real video. */
function makeWorkerAPI(video: WebCRTVideo): WorkerAPI {
    const fakeState = {
        setCallbacks: () => {},
        video,
        apple1: {
            cpu: { toDebug: () => ({}) },
            pia: { toDebug: () => ({}) },
            bus: { read: () => 0, toDebug: () => ({}) },
            clock: { toDebug: () => ({}) },
        },
        getDualEngine: () => null,
    } as unknown as WorkerState;

    return new WorkerAPI(fakeState);
}

describe('power-on-noise-screen — WorkerAPI', () => {
    test('AC-4 (RENDER): late subscriber gets current frame', () => {
        const video = new WebCRTVideo();
        const api = makeWorkerAPI(video);

        // Subscribe AFTER construction — like React mounting after the worker booted.
        let received: VideoData | undefined;
        api.onVideoUpdate((data) => {
            received = data;
        });

        // The current power-on frame must be delivered immediately on subscribe.
        expect(received).toBeDefined();
        expect(received!.buffer.length).toBe(24);
        expect(received!.buffer[0][1].length).toBe(40);
    });
});
