import { describe, it, expect, vi, afterEach } from 'vitest';
import Clock from '../Clock';
import type { ClockState } from '../Clock';

describe('Clock loop lifecycle (review-2026-11)', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    /** Count subscriber notifications over 200ms of fake time. */
    async function ticksAfter(start: (clock: Clock) => void): Promise<number> {
        vi.useFakeTimers();
        const clock = new Clock();
        const subscriber = vi.fn();
        clock.subscribe(subscriber);
        subscriber.mockClear();

        start(clock);
        await vi.advanceTimersByTimeAsync(200);
        clock.stopLoop();
        await vi.advanceTimersByTimeAsync(50);
        vi.useRealTimers();

        return subscriber.mock.calls.length;
    }

    it('starting an already running clock does not add a second loop', async () => {
        const single = await ticksAfter((clock) => {
            void clock.startLoop();
        });
        const double = await ticksAfter((clock) => {
            void clock.startLoop();
            void clock.startLoop();
        });

        expect(single).toBeGreaterThan(2);
        expect(double).toBe(single);
    });

    it('stop followed by start in the same tick leaves exactly one loop', async () => {
        const single = await ticksAfter((clock) => {
            void clock.startLoop();
        });
        const restarted = await ticksAfter((clock) => {
            void clock.startLoop();
            clock.stopLoop();
            void clock.startLoop();
        });

        // The replaced loop gets its one synchronous first tick before it sees
        // that it was superseded; two live loops would give about twice `single`.
        expect(restarted - single).toBeLessThanOrEqual(1);
    });

    it('a throwing subscriber pauses the clock, reports once, and keeps the loop alive', async () => {
        vi.useFakeTimers();
        const clock = new Clock();
        let shouldThrow = false;
        const subscriber = vi.fn(() => {
            if (shouldThrow) throw new Error('boom');
        });
        clock.subscribe(subscriber);
        const onError = vi.fn();
        clock.onTickError(onError);

        const loop = clock.startLoop();
        await vi.advanceTimersByTimeAsync(50);
        shouldThrow = true;
        await vi.advanceTimersByTimeAsync(50);

        expect(onError).toHaveBeenCalledTimes(1);
        expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
        expect(clock.toDebug().paused).toBe(true);
        expect(clock.toDebug().running).toBe(true);

        // Recoverable: once the cause is gone, resume ticks again.
        shouldThrow = false;
        subscriber.mockClear();
        clock.resume();
        await vi.advanceTimersByTimeAsync(50);
        expect(subscriber.mock.calls.length).toBeGreaterThan(0);

        clock.stopLoop();
        await vi.advanceTimersByTimeAsync(50);
        await expect(loop).resolves.toBeUndefined();
    });
});

describe('Versioned state loading (review-2026-11)', () => {
    it('migrates an old state before validating it', () => {
        const clock = new Clock();
        // A v1.0 Clock state: no frameTimeSamples / driftCompensation /
        // dynamicWaitTime. Validating it against the v2.0 schema first rejected
        // it, so the migration that adds those fields could never run.
        const v1 = {
            version: '1.0',
            mhz: 2,
            stepChunk: 30,
            running: false,
            paused: false,
            provisionedCycles: 0,
            maxedCycles: 0,
            totalElapsedCycles: 0,
            pausedAt: 0,
            totalPausedTime: 0,
        } as unknown as ClockState;

        expect(() => clock.loadState(v1)).not.toThrow();
        expect(clock.toDebug().mhz).toBe(2);
    });

    it('still rejects a state that is invalid after migration', () => {
        const clock = new Clock();
        const bad = { version: '1.0', mhz: -5, stepChunk: 30 } as unknown as ClockState;

        expect(() => clock.loadState(bad)).toThrow(/Invalid Clock state/);
    });
});
