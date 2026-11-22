import { describe, expect, it, beforeEach, afterEach, vi, type Mock } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils/render';
import { createMockWorkerManager } from '../../test-support/mocks/WorkerManager.mock';
import type { WorkerManager } from '../../services/WorkerManager';
import PerformanceView from '../PerformanceView';

let mockDebugInfo: Record<string, unknown> = {};
const setDebuggerActive = vi.fn();
const refreshDebugInfo = vi.fn();
vi.mock('../../contexts/WorkerDataContext', () => ({
    useWorkerData: () => ({ debugInfo: mockDebugInfo, setDebuggerActive, refreshDebugInfo }),
}));

vi.mock('../PerformanceMetrics', () => ({ __esModule: true, default: () => <div data-testid="perf-metrics" /> }));
vi.mock('../EngineSwitcher', () => ({ __esModule: true, default: () => <div data-testid="engine-switcher" /> }));

describe('PerformanceView', () => {
    let workerManager: WorkerManager;

    beforeEach(() => {
        workerManager = createMockWorkerManager();
        (workerManager.setCpuProfiling as Mock).mockResolvedValue(undefined);
        (workerManager.getEngineStatus as Mock).mockResolvedValue({
            currentEngine: 'WASM',
            availableEngines: ['JS', 'WASM'],
            switchCount: 2,
            lastSwitchTime: 12.34,
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
        mockDebugInfo = {};
    });

    const renderView = () => render(<PerformanceView workerManager={workerManager} />);

    it('AC-4 (RENDER): gathers engine status, the switcher, the metrics and profiling', async () => {
        renderView();

        expect(screen.getByTestId('engine-switcher')).toBeInTheDocument();
        expect(screen.getByTestId('perf-metrics')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Instruction profiling' })).toBeInTheDocument();

        expect(await screen.findByRole('heading', { name: 'CPU engine' })).toBeInTheDocument();
        expect(screen.getByText('JS, WASM')).toBeInTheDocument();
        expect(screen.getByText('12.3ms')).toBeInTheDocument();
    });

    it('turns profiling on through the worker and refreshes the debug info', async () => {
        renderView();

        fireEvent.click(screen.getByRole('button', { name: 'Enable profiling' }));

        await waitFor(() => expect(workerManager.setCpuProfiling).toHaveBeenCalledWith(true));
        await waitFor(() => expect(refreshDebugInfo).toHaveBeenCalled());
        expect(await screen.findByRole('button', { name: 'Disable profiling' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    });

    it('reverts the toggle when the worker refuses', async () => {
        (workerManager.setCpuProfiling as Mock).mockRejectedValue(new Error('nope'));
        renderView();

        fireEvent.click(screen.getByRole('button', { name: 'Enable profiling' }));

        await waitFor(() => expect(workerManager.setCpuProfiling).toHaveBeenCalled());
        expect(await screen.findByRole('button', { name: 'Enable profiling' })).toHaveAttribute(
            'aria-pressed',
            'false',
        );
    });

    it('follows the profiling state the worker reports', () => {
        mockDebugInfo = { cpu: { PERF_ENABLED: 'YES' } };
        renderView();

        expect(screen.getByRole('button', { name: 'Disable profiling' })).toBeInTheDocument();
        expect(screen.getByText(/Waiting for profiling data/)).toBeInTheDocument();
    });

    it('shows the profiling results with mnemonics for the top instructions', () => {
        mockDebugInfo = {
            cpu: {
                PERF_ENABLED: 'YES',
                _PERF_DATA: {
                    stats: { instructionCount: 2408621, totalInstructions: 2, profilingEnabled: true },
                    topOpcodes: [
                        { opcode: '$AD', count: 1204311, avgCycles: 4 },
                        { opcode: '$10', count: 1204310, avgCycles: 3 },
                    ],
                },
            },
        };
        renderView();

        expect(screen.getByText((2408621).toLocaleString())).toBeInTheDocument();
        expect(screen.getByText('LDA')).toBeInTheDocument();
        expect(screen.getByText('BPL')).toBeInTheDocument();
        expect(screen.getByText('4c')).toBeInTheDocument();
    });

    it('polls debug info only while it is on screen', () => {
        const { unmount } = renderView();
        expect(setDebuggerActive).toHaveBeenLastCalledWith(true);

        act(() => unmount());
        expect(setDebuggerActive).toHaveBeenLastCalledWith(false);
    });

    // Carried over from the Inspector (work-item wasm-js-parity).
    it('AC-2 (RENDER): profiling toggle enabled in WASM mode', async () => {
        renderView();
        await screen.findByRole('heading', { name: 'CPU engine' });

        const toggle = screen.getByRole('button', { name: /profiling/i });
        expect(toggle).toBeEnabled();
        expect(toggle).not.toHaveTextContent(/No Profiling/i);
    });

    it('AC-5 (RENDER): no degradation banner in WASM mode', async () => {
        renderView();
        await screen.findByRole('heading', { name: 'CPU engine' });

        expect(screen.queryByText(/WASM engine active/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/limited support/i)).not.toBeInTheDocument();
    });
});
