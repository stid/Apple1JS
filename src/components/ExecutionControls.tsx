import React, { useState, useEffect, useCallback } from 'react';
import { WORKER_MESSAGES } from '../apple1/TSTypes';

interface ExecutionControlsProps {
    worker: Worker;
}

type ExecutionState = 'running' | 'paused' | 'stepping';

const ExecutionControls: React.FC<ExecutionControlsProps> = ({ worker }) => {
    const [executionState, setExecutionState] = useState<ExecutionState>('running');
    const [isPaused, setIsPaused] = useState(false);

    const handleStep = useCallback(() => {
        setExecutionState('stepping');
        worker.postMessage({ type: WORKER_MESSAGES.STEP });
        // Reset state after a brief delay to show stepping occurred
        setTimeout(() => {
            setExecutionState('paused');
        }, 100);
    }, [worker]);

    const handleRunPause = useCallback(() => {
        if (isPaused) {
            worker.postMessage({ type: WORKER_MESSAGES.RESUME_EMULATION });
            setIsPaused(false);
            setExecutionState('running');
        } else {
            worker.postMessage({ type: WORKER_MESSAGES.PAUSE_EMULATION });
            setIsPaused(true);
            setExecutionState('paused');
        }
    }, [isPaused, worker]);

    // Listen for emulation status updates
    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            if (e.data.type === WORKER_MESSAGES.EMULATION_STATUS) {
                const status = e.data.data;
                if (status === 'paused') {
                    setIsPaused(true);
                    setExecutionState('paused');
                } else {
                    setIsPaused(false);
                    setExecutionState('running');
                }
            }
        };

        worker.addEventListener('message', handleMessage);
        
        // Query current status on mount
        worker.postMessage({ type: WORKER_MESSAGES.GET_EMULATION_STATUS });
        
        return () => worker.removeEventListener('message', handleMessage);
    }, [worker]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // F10 or Space for step
            if ((e.key === 'F10' || e.key === ' ') && isPaused) {
                e.preventDefault();
                handleStep();
            }
            // F5 for run/pause toggle
            else if (e.key === 'F5') {
                e.preventDefault();
                handleRunPause();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPaused, handleStep, handleRunPause]);

    const handleReset = () => {
        // Send Tab key to trigger Apple 1 reset
        worker.postMessage({ data: 'Tab', type: WORKER_MESSAGES.KEY_DOWN });
    };

    return (
        <div className="bg-surface-primary rounded-lg p-md border border-border-primary">
            <div className="flex items-center justify-between mb-sm">
                <h3 className="text-sm font-medium text-text-accent">Execution Control</h3>
                <div className="flex items-center gap-xs">
                    <span className="text-xs text-text-secondary">Status:</span>
                    <span className={`text-xs font-medium px-sm py-xxs rounded ${
                        executionState === 'running' 
                            ? 'bg-success/20 text-success' 
                            : executionState === 'paused'
                            ? 'bg-warning/20 text-warning'
                            : 'bg-data-value/20 text-data-value'
                    }`}>
                        {executionState.toUpperCase()}
                    </span>
                </div>
            </div>
            
            <div className="flex gap-sm">
                <button
                    onClick={handleStep}
                    disabled={!isPaused}
                    className={`px-md py-xs text-xs font-medium rounded transition-all ${
                        isPaused
                            ? 'bg-data-value/10 text-data-value hover:bg-data-value/20 border border-data-value/30'
                            : 'bg-surface-secondary text-text-disabled cursor-not-allowed border border-border-subtle'
                    }`}
                    title="Step (F10 or Space)"
                >
                    Step
                </button>
                
                <button
                    onClick={handleRunPause}
                    className={`px-md py-xs text-xs font-medium rounded transition-all ${
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
                    className="px-md py-xs text-xs font-medium rounded transition-all bg-error/10 text-error hover:bg-error/20 border border-error/30"
                    title="Reset (Tab key)"
                >
                    Reset
                </button>
            </div>
            
            <div className="mt-sm text-xs text-text-secondary">
                <div>F10/Space: Step • F5: Run/Pause</div>
            </div>
        </div>
    );
};

export default ExecutionControls;