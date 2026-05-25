/**
 * Phase 4 (SDD) failing tests for spec `debugger-exec-bar`.
 * ExecutionControlsCluster: the single execution-control surface (Step / Run-Pause /
 * Reset + engine switch). Covers AC-4, AC-5, AC-6, AC-8.
 */
import React from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createMockWorkerManager } from '../../test-support/mocks/WorkerManager.mock';
import type { WorkerManager } from '../../services/WorkerManager';
import ExecutionControlsCluster from '../ExecutionControlsCluster';

// Controllable useEmulation mock (hoisted so the vi.mock factory can see it).
const emu = vi.hoisted(() => ({
    isPaused: false,
    executionState: 'running' as 'running' | 'paused' | 'stepping',
    currentPC: 0,
    pause: vi.fn(),
    resume: vi.fn(),
    step: vi.fn(),
    stepOver: vi.fn(),
    runToAddress: vi.fn(),
}));

vi.mock('../../contexts/EmulationContext', () => ({
    useEmulation: () => emu,
    EmulationProvider: ({ children }: { children: React.ReactNode }) => children,
}));

function setRunning() {
    emu.isPaused = false;
    emu.executionState = 'running';
}
function setPaused(pc = 0xff29) {
    emu.isPaused = true;
    emu.executionState = 'paused';
    emu.currentPC = pc;
}

describe('ExecutionControlsCluster', () => {
    let workerManager: WorkerManager;
    const onEngineSwitch = vi.fn();

    beforeEach(() => {
        workerManager = createMockWorkerManager();
        vi.clearAllMocks();
        setRunning();
    });

    const renderCluster = () =>
        render(
            <ExecutionControlsCluster
                workerManager={workerManager}
                currentEngine="WASM"
                wasmAvailable={true}
                isSwitchingEngine={false}
                onEngineSwitch={onEngineSwitch}
            />,
        );

    it('AC-5 (RENDER): run/pause label flips on state; step is disabled while running', () => {
        const { rerender } = renderCluster();
        // Running: shows "Pause", step disabled.
        expect(screen.getByRole('button', { name: /^pause$/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^run$/i })).toBeNull();
        expect(screen.getByRole('button', { name: /step/i })).toBeDisabled();

        setPaused();
        rerender(
            <ExecutionControlsCluster
                workerManager={workerManager}
                currentEngine="WASM"
                wasmAvailable={true}
                isSwitchingEngine={false}
                onEngineSwitch={onEngineSwitch}
            />,
        );
        // Paused: shows "Run", step enabled.
        expect(screen.getByRole('button', { name: /^run$/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /step/i })).toBeEnabled();
    });

    it('AC-6 (RENDER): activating controls invokes the matching action once', () => {
        renderCluster();
        fireEvent.click(screen.getByRole('button', { name: /^pause$/i }));
        expect(emu.pause).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: /step/i }));
        // step is disabled while running, so guard by pausing first instead:
        setPaused();
        renderCluster();
        fireEvent.click(screen.getAllByRole('button', { name: /step/i })[0]);
        expect(emu.step).toHaveBeenCalled();

        fireEvent.click(screen.getAllByRole('button', { name: /^run$/i })[0]);
        expect(emu.resume).toHaveBeenCalled();

        fireEvent.click(screen.getAllByRole('button', { name: /reset/i })[0]);
        expect(workerManager.keyDown).toHaveBeenCalledWith('Tab');
    });

    it('AC-8 (RENDER): shows the active engine and offers a switch, separate from run-state', () => {
        renderCluster();
        // Active engine is visible.
        expect(screen.getByText(/WASM/)).toBeInTheDocument();
        // A switch affordance to the other engine exists and is wired.
        const jsControl = screen.getByRole('button', { name: /JS/ });
        fireEvent.click(jsControl);
        expect(onEngineSwitch).toHaveBeenCalled();
    });

    it('AC-4 (RENDER): renders exactly one run/pause/step/reset control set', () => {
        renderCluster();
        expect(screen.getAllByRole('button', { name: /step/i })).toHaveLength(1);
        expect(screen.getAllByRole('button', { name: /reset/i })).toHaveLength(1);
        // exactly one run-or-pause toggle
        const runOrPause = screen.getAllByRole('button', { name: /^(run|pause)$/i });
        expect(runOrPause).toHaveLength(1);
    });
});
