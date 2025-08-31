import React, { useState, useEffect, useCallback } from 'react';
import type { WorkerManager } from '../services/WorkerManager';
import type { EngineStatusData, EngineComparisonData } from '../apple1/types/worker-messages';
import { loggingService } from '../services/LoggingService';

interface EngineSwitcherProps {
    workerManager: WorkerManager;
}

const EngineSwitcher: React.FC<EngineSwitcherProps> = ({ workerManager }) => {
    const [engineStatus, setEngineStatus] = useState<EngineStatusData | null>(null);
    const [comparison, setComparison] = useState<EngineComparisonData | null>(null);
    const [isSwitching, setIsSwitching] = useState(false);
    const [showMetrics, setShowMetrics] = useState(false);
    const [autoSwitchEnabled, setAutoSwitchEnabled] = useState(false);
    
    // Fetch engine status on mount and periodically
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const status = await workerManager.getEngineStatus();
                setEngineStatus(status);
                setAutoSwitchEnabled(status.autoSwitchEnabled);
            } catch (error) {
                loggingService.error('EngineSwitcher', `Failed to get engine status: ${error}`);
            }
        };
        
        fetchStatus();
        const interval = setInterval(fetchStatus, 2000); // Update every 2 seconds
        
        return () => clearInterval(interval);
    }, [workerManager]);
    
    // Handle engine switching
    const handleEngineSwitch = useCallback(async (targetEngine: 'JS' | 'WASM') => {
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
    }, [workerManager, engineStatus, isSwitching]);
    
    // Compare engines
    const handleCompareEngines = useCallback(async () => {
        try {
            const comparisonData = await workerManager.compareEngines();
            setComparison(comparisonData);
            setShowMetrics(true);
        } catch (error) {
            loggingService.error('EngineSwitcher', `Failed to compare engines: ${error}`);
        }
    }, [workerManager]);
    
    // Toggle auto-switch
    const handleAutoSwitchToggle = useCallback(async () => {
        const newState = !autoSwitchEnabled;
        try {
            await workerManager.setAutoSwitch(newState);
            setAutoSwitchEnabled(newState);
            loggingService.info('EngineSwitcher', `Auto-switch ${newState ? 'enabled' : 'disabled'}`);
        } catch (error) {
            loggingService.error('EngineSwitcher', `Failed to toggle auto-switch: ${error}`);
        }
    }, [workerManager, autoSwitchEnabled]);
    
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
                    <span className="text-xs text-text-secondary">Status:</span>
                    <span className={`text-xs font-medium px-sm py-xxs rounded ${
                        engineStatus.currentEngine === 'WASM'
                            ? 'bg-success/20 text-success'
                            : 'bg-data-value/20 text-data-value'
                    }`}>
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
                    title={isWASMAvailable ? "WASM Engine (5-10x faster)" : "WASM Engine not available"}
                >
                    WASM Engine
                </button>
                
                <button
                    onClick={handleCompareEngines}
                    disabled={!isWASMAvailable}
                    className={`px-md py-xs text-xs font-medium rounded transition-all ${
                        isWASMAvailable
                            ? 'bg-surface-secondary text-text-secondary hover:bg-surface-tertiary border border-border-primary'
                            : 'bg-surface-secondary text-text-disabled cursor-not-allowed border border-border-subtle'
                    }`}
                    title="Compare engine performance"
                >
                    Compare
                </button>
            </div>
            
            {/* Auto-switch Toggle */}
            <div className="flex items-center gap-sm mb-sm">
                <input
                    type="checkbox"
                    id="auto-switch"
                    checked={autoSwitchEnabled}
                    onChange={handleAutoSwitchToggle}
                    disabled={!isWASMAvailable}
                    className="text-text-accent"
                />
                <label 
                    htmlFor="auto-switch" 
                    className={`text-xs ${isWASMAvailable ? 'text-text-secondary' : 'text-text-disabled'}`}
                >
                    Auto-switch based on performance
                </label>
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
            
            {/* Performance Metrics Modal/Popover */}
            {showMetrics && comparison && (
                <div className="mt-md p-sm bg-surface-secondary rounded border border-border-subtle">
                    <div className="flex justify-between items-center mb-sm">
                        <h4 className="text-xs font-medium text-text-accent">Performance Comparison</h4>
                        <button
                            onClick={() => setShowMetrics(false)}
                            className="text-xs text-text-secondary hover:text-text-primary"
                        >
                            ✕
                        </button>
                    </div>
                    
                    <div className="space-y-sm text-xs">
                        {/* JS Engine Metrics */}
                        <div>
                            <div className="font-medium text-data-value mb-xs">JavaScript Engine</div>
                            <div className="grid grid-cols-2 gap-xs text-text-secondary">
                                <span>IPS:</span>
                                <span className="font-mono">{(comparison.js.averageIPS / 1000).toFixed(1)}K</span>
                                <span>Memory:</span>
                                <span className="font-mono">{(comparison.js.memoryUsage / 1024).toFixed(1)}KB</span>
                            </div>
                        </div>
                        
                        {/* WASM Engine Metrics */}
                        <div>
                            <div className="font-medium text-success mb-xs">WASM Engine</div>
                            <div className="grid grid-cols-2 gap-xs text-text-secondary">
                                <span>IPS:</span>
                                <span className="font-mono">{(comparison.wasm.averageIPS / 1000).toFixed(1)}K</span>
                                <span>Memory:</span>
                                <span className="font-mono">{(comparison.wasm.memoryUsage / 1024).toFixed(1)}KB</span>
                            </div>
                        </div>
                        
                        {/* Comparison Summary */}
                        <div className="pt-sm border-t border-border-subtle">
                            <div className="flex justify-between mb-xs">
                                <span className="font-medium">Speedup:</span>
                                <span className={`font-mono ${comparison.speedup > 1 ? 'text-success' : 'text-warning'}`}>
                                    {comparison.speedup.toFixed(1)}x
                                </span>
                            </div>
                            <div className="flex justify-between mb-xs">
                                <span className="font-medium">Memory Ratio:</span>
                                <span className={`font-mono ${comparison.memoryRatio < 1 ? 'text-success' : 'text-warning'}`}>
                                    {(comparison.memoryRatio * 100).toFixed(0)}%
                                </span>
                            </div>
                            <div className="mt-sm p-xs bg-surface-primary rounded">
                                <span className="font-medium">Recommendation: </span>
                                <span className={comparison.recommendation === 'WASM' ? 'text-success' : 'text-data-value'}>
                                    {comparison.recommendation}
                                </span>
                                <div className="text-text-secondary mt-xs">{comparison.reason}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EngineSwitcher;