import React, { useCallback, useEffect } from 'react';
import { useEmulation } from '../contexts/EmulationContext';
import type { WorkerManager } from '../services/WorkerManager';
import RunStateBadge from './RunStateBadge';
import Spinner from './Spinner';

interface ExecutionControlsClusterProps {
    workerManager: WorkerManager;
    currentEngine: 'JS' | 'WASM';
    wasmAvailable: boolean;
    isSwitchingEngine: boolean;
    onEngineSwitch: () => void;
}

const ENGINES: Array<'JS' | 'WASM'> = ['JS', 'WASM'];

/**
 * The single execution-control surface: run-state badge + Step / Run-Pause / Reset +
 * engine switch. Mounted once (in the always-visible bar), this is the only place these
 * controls live (AC-4). It owns the global F5/F10 shortcuts so there is exactly one
 * listener. Reads run-state from the single `useEmulation` source (AC-11).
 */
const ExecutionControlsCluster: React.FC<ExecutionControlsClusterProps> = ({
    workerManager,
    currentEngine,
    wasmAvailable,
    isSwitchingEngine,
    onEngineSwitch,
}) => {
    const { isPaused, executionState, currentPC, pause, resume, step } = useEmulation();

    const handleRunPause = useCallback(() => {
        if (isPaused) resume();
        else pause();
    }, [isPaused, pause, resume]);

    const handleReset = useCallback(async () => {
        // Apple 1 hardware reset (the action every legacy Reset button performed).
        await workerManager.keyDown('Tab');
    }, [workerManager]);

    // The single global keyboard binding for execution control. Only the
    // non-printable function keys are bound — Space is intentionally NOT a
    // shortcut here: this bar is always mounted, and Space is a normal character
    // the user types into the emulator (it would otherwise both step and inject
    // a space). Any modifier combo — Meta/Ctrl/Alt/Shift — is left for the
    // browser/OS (e.g. Shift+F5 must not hijack run/pause).
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
            if (e.key === 'F10' && isPaused) {
                e.preventDefault();
                step();
            } else if (e.key === 'F5') {
                e.preventDefault();
                handleRunPause();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isPaused, step, handleRunPause]);

    return (
        <div className="flex items-center gap-sm flex-wrap justify-end">
            <RunStateBadge executionState={executionState} currentPC={currentPC} />

            <button onClick={() => step()} disabled={!isPaused} className="btn btn-secondary" title="Step (F10)">
                Step
            </button>

            <button onClick={handleRunPause} className="btn btn-secondary" title="Run/Pause (F5)">
                {isPaused ? 'Run' : 'Pause'}
            </button>

            <button onClick={handleReset} className="btn btn-danger" title="Reset (Tab key)">
                Reset
            </button>

            {/* Engine switch — labelled "Engine", kept distinct from run-state (AC-7/AC-8). */}
            <div className="flex items-center gap-sm ml-sm" role="group" aria-label="CPU engine">
                <span className="eyebrow">Engine</span>
                {isSwitchingEngine && (
                    <span className="flex items-center gap-xs text-xs text-text-secondary">
                        <Spinner label="Switching engine" />
                        Switching…
                    </span>
                )}
                <div className="segmented">
                    {ENGINES.map((engine) => {
                        const active = engine === currentEngine;
                        const unavailable = engine === 'WASM' && !wasmAvailable;
                        return (
                            <button
                                key={engine}
                                onClick={() => {
                                    if (!active && !unavailable) onEngineSwitch();
                                }}
                                disabled={active || unavailable || isSwitchingEngine}
                                aria-pressed={active}
                                className="segment font-mono"
                                title={unavailable ? 'WASM engine unavailable' : `Switch to ${engine} engine`}
                            >
                                {engine}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ExecutionControlsCluster;
