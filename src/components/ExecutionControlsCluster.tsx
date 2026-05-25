import React, { useCallback, useEffect } from 'react';
import { useEmulation } from '../contexts/EmulationContext';
import type { WorkerManager } from '../services/WorkerManager';
import RunStateBadge from './RunStateBadge';

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

    // The single global keyboard binding for execution control.
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.key === 'F10' || e.key === ' ') && isPaused) {
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

    const btn = 'px-md py-xs text-xs font-medium rounded transition-all min-h-[28px] border';

    return (
        <div className="flex items-center gap-sm flex-wrap justify-end">
            <RunStateBadge executionState={executionState} currentPC={currentPC} />

            <button
                onClick={() => step()}
                disabled={!isPaused}
                className={`${btn} ${
                    isPaused
                        ? 'bg-data-value/10 text-data-value hover:bg-data-value/20 border-data-value/30'
                        : 'bg-surface-secondary text-text-disabled cursor-not-allowed border-border-subtle'
                }`}
                title="Step (F10 or Space)"
            >
                Step
            </button>

            <button
                onClick={handleRunPause}
                className={`${btn} ${
                    isPaused
                        ? 'bg-success/10 text-success hover:bg-success/20 border-success/30'
                        : 'bg-warning/10 text-warning hover:bg-warning/20 border-warning/30'
                }`}
                title="Run/Pause (F5)"
            >
                {isPaused ? 'Run' : 'Pause'}
            </button>

            <button
                onClick={handleReset}
                className={`${btn} bg-error/10 text-error hover:bg-error/20 border-error/30`}
                title="Reset (Tab key)"
            >
                Reset
            </button>

            {/* Engine switch — labelled "Engine", kept distinct from run-state (AC-7/AC-8). */}
            <div className="flex items-center gap-xs ml-sm" role="group" aria-label="CPU engine">
                <span className="text-xs text-text-secondary">Engine:</span>
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
                            className={`${btn} ${
                                active
                                    ? 'bg-toggle-active/20 text-toggle-active border-toggle-active/40'
                                    : 'bg-surface-secondary text-text-secondary hover:bg-surface-secondary/70 border-border-subtle'
                            }`}
                            title={unavailable ? 'WASM engine unavailable' : `Switch to ${engine} engine`}
                        >
                            {engine}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default ExecutionControlsCluster;
