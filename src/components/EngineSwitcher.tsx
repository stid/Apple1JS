import React, { useState, useEffect, useCallback } from 'react';
import type { WorkerManager } from '../services/WorkerManager';
import type { EngineStatusData } from '../apple1/types/worker-messages';
import { loggingService } from '../services/LoggingService';

interface EngineSwitcherProps {
    workerManager: WorkerManager;
}

const EngineSwitcher: React.FC<EngineSwitcherProps> = ({ workerManager }) => {
    const [engineStatus, setEngineStatus] = useState<EngineStatusData | null>(null);
    const [isSwitching, setIsSwitching] = useState(false);

    // Fetch engine status on mount and periodically
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const status = await workerManager.getEngineStatus();
                setEngineStatus(status);
            } catch (error) {
                loggingService.error('EngineSwitcher', `Failed to get engine status: ${error}`);
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 2000); // Update every 2 seconds

        return () => clearInterval(interval);
    }, [workerManager]);

    // Handle engine switching
    const handleEngineSwitch = useCallback(
        async (targetEngine: 'JS' | 'WASM') => {
            if (isSwitching || !engineStatus) return;

            setIsSwitching(true);
            try {
                await workerManager.switchEngine(targetEngine);
                // Fetch updated status
                const status = await workerManager.getEngineStatus();
                setEngineStatus(status);
                loggingService.info('EngineSwitcher', `Switched to ${targetEngine} engine`);
            } catch (error) {
                loggingService.error('EngineSwitcher', `Failed to switch engine: ${error}`);
            } finally {
                setIsSwitching(false);
            }
        },
        [workerManager, engineStatus, isSwitching],
    );

    if (!engineStatus) {
        return null; // Don't render until we have status
    }

    const isJSActive = engineStatus.currentEngine === 'JS';
    const isWASMAvailable = engineStatus.availableEngines.includes('WASM');

    return (
        <div className="bg-surface-primary rounded-lg p-md border border-border-primary">
            <div className="flex items-center justify-between mb-sm">
                <h3 className="text-sm font-medium text-text-accent">CPU Engine</h3>
                <div className="flex items-center gap-xs">
                    <span className="text-xs text-text-secondary">Active:</span>
                    <span
                        className={`text-xs font-medium px-sm py-xxs rounded ${
                            engineStatus.currentEngine === 'WASM'
                                ? 'bg-success/20 text-success'
                                : 'bg-data-value/20 text-data-value'
                        }`}
                    >
                        {engineStatus.currentEngine}
                    </span>
                </div>
            </div>

            {/* Engine Switch Buttons */}
            <div className="flex gap-sm mb-sm">
                <button
                    onClick={() => handleEngineSwitch('JS')}
                    disabled={isSwitching || isJSActive}
                    className={`px-md py-xs text-xs font-medium rounded transition-all ${
                        isJSActive
                            ? 'bg-data-value/20 text-data-value border border-data-value/30 cursor-default'
                            : isSwitching
                              ? 'bg-surface-secondary text-text-disabled cursor-not-allowed border border-border-subtle'
                              : 'bg-surface-secondary text-text-secondary hover:bg-surface-tertiary border border-border-primary'
                    }`}
                    title="JavaScript Engine (Better debugging)"
                >
                    JS Engine
                </button>

                <button
                    onClick={() => handleEngineSwitch('WASM')}
                    disabled={isSwitching || !isJSActive || !isWASMAvailable}
                    className={`px-md py-xs text-xs font-medium rounded transition-all ${
                        !isJSActive
                            ? 'bg-success/20 text-success border border-success/30 cursor-default'
                            : isSwitching || !isWASMAvailable
                              ? 'bg-surface-secondary text-text-disabled cursor-not-allowed border border-border-subtle'
                              : 'bg-surface-secondary text-text-secondary hover:bg-surface-tertiary border border-border-primary'
                    }`}
                    title={isWASMAvailable ? 'WASM Engine (5-10x faster)' : 'WASM Engine not available'}
                >
                    WASM Engine
                </button>
            </div>

            {/* Engine Statistics */}
            <div className="text-xs text-text-secondary space-y-xs">
                <div className="flex justify-between">
                    <span>Switch Count:</span>
                    <span className="font-mono">{engineStatus.switchCount}</span>
                </div>
                {engineStatus.lastSwitchTime > 0 && (
                    <div className="flex justify-between">
                        <span>Last Switch Time:</span>
                        <span className="font-mono">{engineStatus.lastSwitchTime.toFixed(1)}ms</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EngineSwitcher;
