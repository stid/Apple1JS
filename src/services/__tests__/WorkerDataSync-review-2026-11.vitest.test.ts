import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorkerDataSync } from '../WorkerDataSync';
import { createMockWorkerManager } from '../../test-support/mocks/WorkerManager.mock';
import type { WorkerManager } from '../WorkerManager';
import type { FilteredDebugData } from '../../apple1/types/worker-messages';

const debugData = (pc: string): FilteredDebugData => ({ cpu: { REG_PC: pc }, pia: {}, Bus: {}, clock: {} });

describe('WorkerDataSync polling (review-2026-11)', () => {
    let wm: WorkerManager;
    let emitStatus: (status: 'running' | 'paused') => void;

    beforeEach(() => {
        vi.useFakeTimers();
        wm = createMockWorkerManager();
        emitStatus = () => {};
        vi.mocked(wm.onEmulationStatus).mockImplementation(async (callback) => {
            emitStatus = callback;
            return () => {};
        });
        vi.mocked(wm.getDebugInfo).mockResolvedValue(debugData('$0300'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('does not poll debug info while no debug view is active', async () => {
        const sync = new WorkerDataSync(wm);
        sync.subscribeToDebugInfo(() => {});

        await vi.advanceTimersByTimeAsync(2000);

        expect(wm.getDebugInfo).not.toHaveBeenCalled();
        sync.dispose();
    });

    it('polls while a debug view is active and stops when it closes', async () => {
        const sync = new WorkerDataSync(wm);
        sync.subscribeToDebugInfo(() => {});

        sync.setDebuggerActive(true);
        await vi.advanceTimersByTimeAsync(1000);
        const whileActive = vi.mocked(wm.getDebugInfo).mock.calls.length;
        expect(whileActive).toBeGreaterThanOrEqual(4);

        sync.setDebuggerActive(false);
        await vi.advanceTimersByTimeAsync(1000);
        expect(vi.mocked(wm.getDebugInfo).mock.calls.length).toBe(whileActive);
        sync.dispose();
    });

    it('stays active while one of two debug views is still open', async () => {
        const sync = new WorkerDataSync(wm);
        sync.subscribeToDebugInfo(() => {});
        sync.setDebuggerActive(true);
        sync.setDebuggerActive(true);
        sync.setDebuggerActive(false);
        vi.mocked(wm.getDebugInfo).mockClear();

        await vi.advanceTimersByTimeAsync(1000);

        expect(vi.mocked(wm.getDebugInfo).mock.calls.length).toBeGreaterThan(0);
        sync.dispose();
    });

    it('does not notify subscribers when the payload has not changed', async () => {
        const sync = new WorkerDataSync(wm);
        const subscriber = vi.fn();
        sync.subscribeToDebugInfo(subscriber);
        sync.setDebuggerActive(true);

        await vi.advanceTimersByTimeAsync(1000);
        expect(subscriber).toHaveBeenCalledTimes(1);

        vi.mocked(wm.getDebugInfo).mockResolvedValue(debugData('$0302'));
        await vi.advanceTimersByTimeAsync(300);
        expect(subscriber).toHaveBeenCalledTimes(2);
        expect(subscriber).toHaveBeenLastCalledWith(debugData('$0302'));
        sync.dispose();
    });

    it('fetches once when the machine pauses, even with no debug view open', async () => {
        // Run-to-cursor and breakpoints end in a pause; the execution bar shows
        // the PC then, so it must be fresh without a poll running.
        const sync = new WorkerDataSync(wm);
        const subscriber = vi.fn();
        sync.subscribeToDebugInfo(subscriber);
        await vi.advanceTimersByTimeAsync(0);

        emitStatus('paused');
        await vi.advanceTimersByTimeAsync(0);

        expect(wm.getDebugInfo).toHaveBeenCalledTimes(1);
        expect(subscriber).toHaveBeenCalledWith(debugData('$0300'));
        sync.dispose();
    });
});
