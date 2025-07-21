import React, { useEffect, useCallback } from 'react';
import { useEmulation } from '../contexts/EmulationContext';
import type { WorkerManager } from '../services/WorkerManager';

interface CompactExecutionControlsProps {
    workerManager: WorkerManager;
    address: string;
    onAddressChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onAddressSubmit: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}


const CompactExecutionControls: React.FC<CompactExecutionControlsProps> = ({ 
    workerManager, 
    address, 
    onAddressChange, 
    onAddressSubmit 
}) => {
    const { isPaused, executionState, pause, resume, step: contextStep } = useEmulation();

    const handleStep = useCallback(() => {
        contextStep();
    }, [contextStep]);

    const handleRunPause = useCallback(() => {
        if (isPaused) {
            resume();
        } else {
            pause();
        }
    }, [isPaused, pause, resume]);

    const handleReset = useCallback(async () => {
        // Send Tab key to trigger Apple 1 reset, like the main reset button
        await workerManager.keyDown('Tab');
    }, [workerManager]);

    // No longer need to listen for emulation status - handled by EmulationContext

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // F10 or Space for step (but not in input fields)
            if ((e.key === 'F10' || (e.key === ' ' && e.target === document.body)) && isPaused) {
                e.preventDefault();
                handleStep();
            }
            // F5 for run/pause toggle
            else if (e.key === 'F5') {
                e.preventDefault();
                handleRunPause();
            }
            // F8 for jump to PC
            else if (e.key === 'F8') {
                e.preventDefault();
                window.postMessage({ type: 'JUMP_TO_PC' }, '*');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPaused, handleStep, handleRunPause]);

    return (
        <section className="bg-surface-primary rounded-lg p-sm border border-border-primary">
            <div className="flex flex-wrap items-center gap-sm">
                {/* Memory Navigation */}
                <div className="flex items-center gap-xs">
                    <label className="text-xs text-text-secondary">Addr:</label>
                    <input
                        type="text"
                        value={address}
                        onChange={onAddressChange}
                        onKeyDown={onAddressSubmit}
                        className="bg-black/40 border border-border-primary text-data-address px-xs py-xxs w-16 font-mono text-xs rounded transition-colors focus:border-border-accent focus:outline-none"
                        placeholder="0000"
                        maxLength={4}
                    />
                </div>

                <div className="h-4 w-px bg-border-subtle" /> {/* Divider */}

                {/* Execution Controls */}
                <div className="flex items-center gap-xs">
                    <button
                        onClick={handleStep}
                        disabled={!isPaused}
                        className={`px-sm py-xxs text-xs font-medium rounded transition-all ${
                            isPaused
                                ? 'bg-data-value/10 text-data-value hover:bg-data-value/20 border border-data-value/30'
                                : 'bg-surface-secondary text-text-disabled cursor-not-allowed border border-border-subtle'
                        }`}
                        title="Step (F10)"
                    >
                        Step
                    </button>
                    
                    <button
                        onClick={handleRunPause}
                        className={`px-sm py-xxs text-xs font-medium rounded transition-all ${
                            isPaused
                                ? 'bg-success/10 text-success hover:bg-success/20 border border-success/30'
                                : 'bg-warning/10 text-warning hover:bg-warning/20 border border-warning/30'
                        }`}
                        title="Run/Pause (F5)"
                    >
                        {isPaused ? 'Run' : 'Pause'}
                    </button>
                    
                    <button
                        onClick={handleReset}
                        className="px-sm py-xxs text-xs font-medium rounded transition-all bg-error/10 text-error hover:bg-error/20 border border-error/30"
                        title="Reset (Tab)"
                    >
                        Reset
                    </button>
                    
                    <button
                        onClick={() => window.postMessage({ type: 'JUMP_TO_PC' }, '*')}
                        className="px-sm py-xxs text-xs font-medium rounded transition-all bg-data-address/10 text-data-address hover:bg-data-address/20 border border-data-address/30"
                        title="Jump to PC (F8)"
                    >
                        →PC
                    </button>
                </div>

                {/* Status */}
                <div className="flex items-center gap-xs ml-auto">
                    <span className="text-xs text-text-secondary">Status:</span>
                    <span className={`text-xs font-medium px-xs py-xxs rounded ${
                        executionState === 'running' 
                            ? 'bg-success/20 text-success' 
                            : executionState === 'paused'
                            ? 'bg-warning/20 text-warning'
                            : 'bg-data-value/20 text-data-value'
                    }`}>
                        {executionState.toUpperCase()}
                    </span>
                    <span className="text-xs text-text-muted ml-sm hidden sm:inline">F10: Step • F5: Run/Pause • F7: Run to PC • F8: Jump to PC • F9: Breakpoint</span>
                </div>
            </div>
        </section>
    );
};

export default CompactExecutionControls;