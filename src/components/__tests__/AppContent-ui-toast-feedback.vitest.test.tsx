import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppContent } from '../AppContent';
// These imports do not exist yet — that is what makes these tests red (Phase 4).
import { ToastProvider } from '../../contexts/ToastContext';
import ToastContainer from '../ToastContainer';
import { createMockWorkerManager } from '../../test-support/mocks/WorkerManager.mock';
import type { WorkerManager } from '../../services/WorkerManager';

// Stub heavy / irrelevant children; keep Actions real so SAVE/LOAD controls exist.
vi.mock('../CRTWorker', () => ({ __esModule: true, default: () => <div data-testid="crt-worker" /> }));
vi.mock('../Info', () => ({ __esModule: true, default: () => <div /> }));
vi.mock('../InspectorView', () => ({ __esModule: true, default: () => <div /> }));
vi.mock('../DebuggerLayout', () => ({ __esModule: true, default: () => <div /> }));

// Expose the engine-switch handler through a simple button.
vi.mock('../ExecutionControlsCluster', () => ({
    __esModule: true,
    default: ({ onEngineSwitch }: { onEngineSwitch: () => void }) => (
        <button data-testid="engine-switch-btn" onClick={onEngineSwitch}>
            switch-engine
        </button>
    ),
}));

vi.mock('../../contexts/DebuggerNavigationContext', () => ({
    useDebuggerNavigation: () => ({ subscribeToNavigation: vi.fn(() => () => {}) }),
}));
vi.mock('../../contexts/EmulationContext', () => ({
    EmulationProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('../../contexts/WorkerDataContext', () => ({
    WorkerDataProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const renderApp = (wm: WorkerManager) =>
    render(
        <ToastProvider>
            <AppContent workerManager={wm} />
            <ToastContainer />
        </ToastProvider>,
    );

describe('AppContent toast feedback', () => {
    let wm: WorkerManager;
    let alertSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        wm = createMockWorkerManager();
        // Make the file-download path work under jsdom.
        globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
        globalThis.URL.revokeObjectURL = vi.fn();
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
        alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
        vi.mocked(wm.getEngineStatus).mockResolvedValue({
            currentEngine: 'JS',
            availableEngines: ['JS', 'WASM'],
            switchCount: 0,
            lastSwitchTime: 0,
        });
    });
    afterEach(() => vi.restoreAllMocks());

    // AC-1 (RENDER): a successful save surfaces a confirmation message.
    it('AC-1 (RENDER): save success shows a confirmation toast', async () => {
        renderApp(wm);
        fireEvent.click(screen.getByText('SAVE STATE'));
        expect(await screen.findByText(/saved/i)).toBeInTheDocument();
    });

    // AC-2 (RENDER): a failed save surfaces an error message instead of a blocking alert.
    it('AC-2 (RENDER): save failure shows an error toast and no window.alert', async () => {
        vi.mocked(wm.saveState).mockRejectedValueOnce(new Error('disk full'));
        renderApp(wm);
        fireEvent.click(screen.getByText('SAVE STATE'));
        expect(await screen.findByText(/failed to save/i)).toBeInTheDocument();
        expect(alertSpy).not.toHaveBeenCalled();
    });

    // AC-3 (RENDER): a successful load surfaces a confirmation message.
    it('AC-3 (RENDER): load success shows a confirmation toast', async () => {
        renderApp(wm);
        const input = document.querySelector('input[aria-label="Load state from file"]') as HTMLInputElement;
        const file = new File(['{"valid":true}'], 'state.json', { type: 'application/json' });
        fireEvent.change(input, { target: { files: [file] } });
        expect(await screen.findByText(/loaded/i)).toBeInTheDocument();
    });

    // AC-4 (RENDER): an invalid load file surfaces an error message, not a blocking alert.
    it('AC-4 (RENDER): invalid load file shows an error toast and no window.alert', async () => {
        renderApp(wm);
        const input = document.querySelector('input[aria-label="Load state from file"]') as HTMLInputElement;
        const file = new File(['this is not json'], 'state.json', { type: 'application/json' });
        fireEvent.change(input, { target: { files: [file] } });
        expect(await screen.findByText(/invalid/i)).toBeInTheDocument();
        expect(alertSpy).not.toHaveBeenCalled();
    });

    // AC-5 (RENDER): a successful engine switch surfaces a confirmation naming the engine.
    it('AC-5 (RENDER): engine switch success shows a toast naming the engine', async () => {
        renderApp(wm);
        await waitFor(() => expect(wm.getEngineStatus).toHaveBeenCalled());
        fireEvent.click(screen.getByTestId('engine-switch-btn'));
        expect(await screen.findByText(/WASM/)).toBeInTheDocument();
    });

    // AC-6 (RENDER): a failed engine switch surfaces an error message.
    it('AC-6 (RENDER): engine switch failure shows an error toast', async () => {
        vi.mocked(wm.switchEngine).mockRejectedValueOnce(new Error('no wasm'));
        renderApp(wm);
        await waitFor(() => expect(wm.getEngineStatus).toHaveBeenCalled());
        fireEvent.click(screen.getByTestId('engine-switch-btn'));
        expect(await screen.findByText(/failed.*engine|engine.*fail|switch.*fail/i)).toBeInTheDocument();
    });
});
