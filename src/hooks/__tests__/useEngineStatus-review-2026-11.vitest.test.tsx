import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, act } from '@testing-library/react';
import { useEngineStatus } from '../useEngineStatus';
import { createMockWorkerManager } from '../../test-support/mocks/WorkerManager.mock';
import type { WorkerManager } from '../../services/WorkerManager';
import type { EngineStatusData } from '../../apple1/types/worker-messages';

const status = (currentEngine: 'JS' | 'WASM'): EngineStatusData => ({
    currentEngine,
    availableEngines: ['JS', 'WASM'],
    switchCount: 0,
    lastSwitchTime: 0,
});

const Consumer = ({ wm, id }: { wm: WorkerManager; id: string }) => {
    const { status: s, refresh } = useEngineStatus(wm);
    return (
        <button data-testid={id} onClick={() => void refresh()}>
            {s ? s.currentEngine : 'none'}
        </button>
    );
};

describe('useEngineStatus (review-2026-11)', () => {
    let wm: WorkerManager;

    beforeEach(() => {
        vi.useFakeTimers();
        wm = createMockWorkerManager();
        vi.mocked(wm.getEngineStatus).mockResolvedValue(status('JS'));
    });
    afterEach(() => vi.useRealTimers());

    it('several consumers share one poll', async () => {
        render(
            <>
                <Consumer wm={wm} id="a" />
                <Consumer wm={wm} id="b" />
                <Consumer wm={wm} id="c" />
            </>,
        );
        await act(async () => {
            await vi.advanceTimersByTimeAsync(0);
        });
        expect(wm.getEngineStatus).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('a')).toHaveTextContent('JS');
        expect(screen.getByTestId('c')).toHaveTextContent('JS');

        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });
        expect(wm.getEngineStatus).toHaveBeenCalledTimes(2);
    });

    it('a refresh from one consumer updates the others at once', async () => {
        render(
            <>
                <Consumer wm={wm} id="a" />
                <Consumer wm={wm} id="b" />
            </>,
        );
        await act(async () => {
            await vi.advanceTimersByTimeAsync(0);
        });

        vi.mocked(wm.getEngineStatus).mockResolvedValue(status('WASM'));
        await act(async () => {
            screen.getByTestId('a').click();
            await vi.advanceTimersByTimeAsync(0);
        });

        expect(screen.getByTestId('b')).toHaveTextContent('WASM');
    });

    it('stops polling when the last consumer unmounts', async () => {
        const { unmount } = render(<Consumer wm={wm} id="a" />);
        await act(async () => {
            await vi.advanceTimersByTimeAsync(0);
        });
        unmount();
        vi.mocked(wm.getEngineStatus).mockClear();

        await vi.advanceTimersByTimeAsync(6000);

        expect(wm.getEngineStatus).not.toHaveBeenCalled();
    });
});
