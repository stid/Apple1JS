import React, { useState, useCallback } from 'react';
import type { WorkerManager } from '../services/WorkerManager';
import { loggingService } from '../services/LoggingService';
import Spinner from './Spinner';
import { useEngineStatus } from '../hooks/useEngineStatus';

interface EngineSwitcherProps {
    workerManager: WorkerManager;
}

const EngineSwitcher: React.FC<EngineSwitcherProps> = ({ workerManager }) => {
    const { status: engineStatus, refresh: refreshEngineStatus } = useEngineStatus(workerManager);
    const [isSwitching, setIsSwitching] = useState(false);

    // Handle engine switching
    const handleEngineSwitch = useCallback(
        async (targetEngine: 'JS' | 'WASM') => {
            if (isSwitching || !engineStatus) return;

            setIsSwitching(true);
            try {
                await workerManager.switchEngine(targetEngine);
                // Shared status: the under-CRT toggle updates with this one.
                await refreshEngineStatus();
                loggingService.info('EngineSwitcher', `Switched to ${targetEngine} engine`);
            } catch (error) {
                loggingService.error('EngineSwitcher', `Failed to switch engine: ${error}`);
            } finally {
                setIsSwitching(false);
            }
        },
        [workerManager, engineStatus, isSwitching, refreshEngineStatus],
    );

    if (!engineStatus) {
        return null; // Don't render until we have status
    }

    const isJSActive = engineStatus.currentEngine === 'JS';
    const isWASMAvailable = engineStatus.availableEngines.includes('WASM');

    return (
        <div className="card">
            <div className="flex items-center justify-between mb-sm">
                <h3 className="card-title">CPU engine</h3>
                <div className="flex items-center gap-xs">
                    <span className="text-xs text-text-secondary">Active</span>
                    <span className="badge bg-toggle-active/15 text-toggle-active border-toggle-active/30">
                        {engineStatus.currentEngine}
                    </span>
                </div>
            </div>

            {/* Engine Switch Buttons */}
            <div className="flex items-center gap-sm mb-sm">
                <div className="segmented">
                    <button
                        onClick={() => handleEngineSwitch('JS')}
                        disabled={isSwitching || isJSActive}
                        aria-pressed={isJSActive}
                        className="segment"
                        title="JavaScript Engine (Better debugging)"
                    >
                        JS Engine
                    </button>

                    <button
                        onClick={() => handleEngineSwitch('WASM')}
                        disabled={isSwitching || !isJSActive || !isWASMAvailable}
                        aria-pressed={!isJSActive}
                        className="segment"
                        title={isWASMAvailable ? 'WASM Engine (5-10x faster)' : 'WASM Engine not available'}
                    >
                        WASM Engine
                    </button>
                </div>

                {isSwitching && (
                    <span className="flex items-center gap-xs text-xs text-text-secondary">
                        <Spinner label="Switching engine" />
                        Switching…
                    </span>
                )}
            </div>

            {/* Engine Statistics */}
            <div className="text-xs text-text-secondary space-y-xs">
                <div className="flex justify-between">
                    <span>Switch count</span>
                    <span className="font-mono">{engineStatus.switchCount}</span>
                </div>
                {engineStatus.lastSwitchTime > 0 && (
                    <div className="flex justify-between">
                        <span>Last switch time</span>
                        <span className="font-mono">{engineStatus.lastSwitchTime.toFixed(1)}ms</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EngineSwitcher;
