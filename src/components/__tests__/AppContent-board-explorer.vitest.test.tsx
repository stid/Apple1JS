import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppContent } from '../AppContent';
import DebuggerLayout from '../DebuggerLayout';
import { ToastProvider } from '../../contexts/ToastContext';
import { DebuggerNavigationProvider } from '../../contexts/DebuggerNavigationContext';
import { createMockWorkerManager } from '../../test-support/mocks/WorkerManager.mock';
import type { WorkerManager } from '../../services/WorkerManager';

vi.mock('../CRTWorker', () => ({ __esModule: true, default: () => <div data-testid="crt-worker" /> }));
vi.mock('../Info', () => ({ __esModule: true, default: () => <div data-testid="info-view" /> }));
vi.mock('../BoardView', () => ({
    __esModule: true,
    default: ({ root }: { root: { id: string } }) => <div data-testid="board-view">{root.id}</div>,
}));
vi.mock('../PerformanceView', () => ({ __esModule: true, default: () => <div data-testid="performance-view" /> }));
vi.mock('../ExecutionControlsCluster', () => ({ __esModule: true, default: () => <div /> }));
vi.mock('../DisassemblerPaginated', () => ({ __esModule: true, default: () => <div /> }));
vi.mock('../MemoryViewerPaginated', () => ({ __esModule: true, default: () => <div /> }));
vi.mock('../StackViewer', () => ({ __esModule: true, default: () => <div data-testid="stack" /> }));
vi.mock('../PerformanceMetrics', () => ({ __esModule: true, default: () => <div data-testid="perf-metrics" /> }));
vi.mock('../EngineSwitcher', () => ({ __esModule: true, default: () => <div data-testid="engine-switcher" /> }));

vi.mock('../../contexts/EmulationContext', () => ({
    EmulationProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('../../contexts/WorkerDataContext', () => ({
    WorkerDataProvider: ({ children }: { children: React.ReactNode }) => children,
    useWorkerData: () => ({ debugInfo: {}, setDebuggerActive: vi.fn(), refreshDebugInfo: vi.fn() }),
}));

describe('Board and Performance tabs', () => {
    let wm: WorkerManager;

    beforeEach(() => {
        window.localStorage.clear();
        wm = createMockWorkerManager();
    });

    const renderApp = () =>
        render(
            <ToastProvider>
                <DebuggerNavigationProvider>
                    <AppContent workerManager={wm} />
                </DebuggerNavigationProvider>
            </ToastProvider>,
        );

    it('AC-1 (RENDER): the views are Info, Board, Debugger, Performance, with no Inspector', () => {
        renderApp();

        expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
            'Info',
            'Board',
            'Debugger',
            'Performance',
        ]);
        expect(screen.queryByRole('tab', { name: 'Inspector' })).not.toBeInTheDocument();
    });

    it('AC-1 (RENDER): the Board tab shows the board for the machine running in the worker', async () => {
        renderApp();

        fireEvent.click(screen.getByRole('tab', { name: 'Board' }));

        expect(await screen.findByTestId('board-view')).toHaveTextContent('apple1');
        expect(wm.getInspectableTree).toHaveBeenCalled();
    });

    it('AC-4 (RENDER): the Performance tab shows the performance view', () => {
        renderApp();

        fireEvent.click(screen.getByRole('tab', { name: 'Performance' }));

        expect(screen.getByTestId('performance-view')).toBeInTheDocument();
        expect(screen.queryByTestId('board-view')).not.toBeInTheDocument();
    });

    it('falls back to Info when the saved tab is the removed Inspector', () => {
        window.localStorage.setItem('apple1js_ui_rightTab', JSON.stringify('inspector'));
        renderApp();

        expect(screen.getByRole('tab', { name: 'Info' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByTestId('info-view')).toBeInTheDocument();
    });

    it('AC-4 (RENDER): the Debugger overview no longer shows the engine switcher or the performance card', () => {
        render(
            <DebuggerNavigationProvider>
                <DebuggerLayout
                    workerManager={wm}
                    memoryViewAddress={0x0000}
                    setMemoryViewAddress={vi.fn()}
                    disassemblerAddress={0x0000}
                    setDisassemblerAddress={vi.fn()}
                />
            </DebuggerNavigationProvider>,
        );

        // The overview itself is on screen...
        expect(screen.getByTestId('stack')).toBeInTheDocument();
        // ...without the two cards that moved to Performance.
        expect(screen.queryByTestId('engine-switcher')).not.toBeInTheDocument();
        expect(screen.queryByTestId('perf-metrics')).not.toBeInTheDocument();
    });
});
