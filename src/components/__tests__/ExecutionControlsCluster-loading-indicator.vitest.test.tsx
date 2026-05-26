import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { createMockWorkerManager } from '../../test-support/mocks/WorkerManager.mock';
import type { WorkerManager } from '../../services/WorkerManager';
import ExecutionControlsCluster from '../ExecutionControlsCluster';

const emu = vi.hoisted(() => ({
    isPaused: false,
    executionState: 'running' as const,
    currentPC: 0,
    pause: vi.fn(),
    resume: vi.fn(),
    step: vi.fn(),
}));
vi.mock('../../contexts/EmulationContext', () => ({
    useEmulation: () => emu,
    EmulationProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('ExecutionControlsCluster loading indicator', () => {
    let wm: WorkerManager;
    beforeEach(() => {
        wm = createMockWorkerManager();
        vi.clearAllMocks();
    });

    const renderCluster = (isSwitchingEngine: boolean) =>
        render(
            <ExecutionControlsCluster
                workerManager={wm}
                currentEngine="WASM"
                wasmAvailable={true}
                isSwitchingEngine={isSwitchingEngine}
                onEngineSwitch={vi.fn()}
            />,
        );

    it('shows a spinner and "Switching" while the engine is switching', () => {
        renderCluster(true);
        expect(screen.getByTestId('spinner')).toBeInTheDocument();
        expect(screen.getByText(/switching/i)).toBeInTheDocument();
    });

    it('shows no spinner when not switching', () => {
        renderCluster(false);
        expect(screen.queryByTestId('spinner')).toBeNull();
    });
});
