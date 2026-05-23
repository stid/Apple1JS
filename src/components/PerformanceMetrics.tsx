import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { WorkerManager } from '../services/WorkerManager';
import type { EngineStatusData } from '../apple1/types/worker-messages';
import { loggingService } from '../services/LoggingService';

interface PerformanceMetricsProps {
    workerManager: WorkerManager;
    updateInterval?: number; // Update interval in ms (default: 1000)
}

interface MetricHistory {
    timestamp: number;
    ips?: number | undefined;
    memory?: number | undefined;
    engine?: 'JS' | 'WASM';
}

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ workerManager, updateInterval = 1000 }) => {
    const [engineStatus, setEngineStatus] = useState<EngineStatusData | null>(null);
    const [history, setHistory] = useState<MetricHistory[]>([]);
    const [maxIPS, setMaxIPS] = useState(0);
    const [avgIPS, setAvgIPS] = useState(0);
    const [showDetails, setShowDetails] = useState(false);
    const historyLimit = 60; // Keep last 60 data points
    const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Fetch and update metrics
    const updateMetrics = useCallback(async () => {
        try {
            const status = await workerManager.getEngineStatus();
            setEngineStatus(status);

            // Get metrics from active engine only
            const activeMetrics = status.currentEngine === 'WASM' ? status.wasmMetrics : status.jsMetrics;
            const currentIPS = activeMetrics?.lastIPS || 0;
            const currentMemory = activeMetrics?.memoryUsage || 0;

            // Add to history
            const newPoint: MetricHistory = {
                timestamp: Date.now(),
                ips: currentIPS,
                memory: currentMemory,
                engine: status.currentEngine,
            };

            setHistory((prev) => {
                const updated = [...prev, newPoint];
                // Keep only last N points
                if (updated.length > historyLimit) {
                    return updated.slice(-historyLimit);
                }
                return updated;
            });

            // Update max IPS using functional setState to avoid stale closure
            setMaxIPS((prevMax) => Math.max(currentIPS, prevMax));
        } catch (error) {
            loggingService.error('PerformanceMetrics', `Failed to update metrics: ${error}`);
        }
    }, [workerManager]); // Only depend on workerManager which doesn't change

    // Calculate averages when history changes
    useEffect(() => {
        if (history.length > 0) {
            const validPoints = history.filter((h) => h.ips && h.ips > 0);
            if (validPoints.length > 0) {
                const avg = validPoints.reduce((sum, h) => sum + (h.ips || 0), 0) / validPoints.length;
                setAvgIPS(avg);
            }
        }
    }, [history]);

    // Set up periodic updates
    useEffect(() => {
        updateMetrics(); // Initial update

        updateIntervalRef.current = setInterval(updateMetrics, updateInterval);

        return () => {
            if (updateIntervalRef.current) {
                clearInterval(updateIntervalRef.current);
            }
        };
    }, [updateMetrics, updateInterval]);

    // Format numbers for display
    const formatIPS = (ips: number | undefined): string => {
        if (!ips) return '0';
        if (ips >= 1_000_000) return `${(ips / 1_000_000).toFixed(2)}M`;
        if (ips >= 1_000) return `${(ips / 1_000).toFixed(1)}K`;
        return ips.toFixed(0);
    };

    const formatMemory = (bytes: number | undefined): string => {
        if (!bytes) return '0 KB';
        if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(2)} MB`;
        return `${(bytes / 1024).toFixed(1)} KB`;
    };

    const formatPercent = (value: number, max: number): string => {
        if (max === 0) return '0';
        return ((value / max) * 100).toFixed(0);
    };

    // Host execution cost: ms of host wall-clock spent per emulated second
    // (at the ~1MHz target). This is where the real JS-vs-WASM difference shows,
    // because the clock throttles both engines to the same IPS. Lower is better.
    //   load%   = fraction of real time the host spends executing
    //   headroom = how many times faster than 1MHz the engine could run unthrottled
    const formatHostCost = (hostMsPerSec: number | undefined): string => {
        if (!hostMsPerSec || hostMsPerSec <= 0) return '—';
        const loadPercent = (hostMsPerSec / 1000) * 100;
        const headroom = 1000 / hostMsPerSec;
        const loadStr = loadPercent < 1 ? loadPercent.toFixed(2) : loadPercent.toFixed(1);
        return `${loadStr}% · ${headroom.toFixed(1)}× headroom`;
    };

    // Render performance bar
    const renderPerformanceBar = (value: number | undefined, max: number, color: string): React.ReactElement => {
        const percentage = value && max > 0 ? (value / max) * 100 : 0;
        return (
            <div className="w-full bg-surface-secondary rounded-sm h-2 overflow-hidden">
                <div className={`h-full transition-all duration-300 ${color}`} style={{ width: `${percentage}%` }} />
            </div>
        );
    };

    // Render mini sparkline chart
    const renderSparkline = (data: number[], color: string, height: number = 30): React.ReactElement => {
        if (data.length < 2) return <div style={{ height }} />;

        const max = Math.max(...data, 1);
        const width = 150;
        const points = data
            .map((val, i) => {
                const x = (i / (data.length - 1)) * width;
                const y = height - (val / max) * height;
                return `${x},${y}`;
            })
            .join(' ');

        return (
            <svg width={width} height={height} className="block">
                <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" opacity="0.8" />
            </svg>
        );
    };

    if (!engineStatus) {
        return null;
    }

    const currentEngine = engineStatus.currentEngine;
    const activeMetrics = currentEngine === 'WASM' ? engineStatus.wasmMetrics : engineStatus.jsMetrics;
    const currentIPS = activeMetrics?.lastIPS || 0;
    const currentMemory = activeMetrics?.memoryUsage || 0;

    return (
        <div className="bg-surface-primary rounded-lg p-md border border-border-primary">
            <div className="flex items-center justify-between mb-sm">
                <h3 className="text-sm font-medium text-text-accent">Performance Metrics</h3>
                <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-xs text-text-secondary hover:text-text-primary"
                >
                    {showDetails ? 'Hide Details' : 'Show Details'}
                </button>
            </div>

            {/* Current Performance Summary */}
            <div className="space-y-sm">
                {/* Active Engine Performance */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-xs">
                        <span className="text-xs text-text-secondary">Active Engine:</span>
                        <span
                            className={`text-xs font-medium px-sm py-xxs rounded ${
                                currentEngine === 'WASM'
                                    ? 'bg-success/20 text-success'
                                    : 'bg-data-value/20 text-data-value'
                            }`}
                        >
                            {currentEngine}
                        </span>
                    </div>
                    <span className="text-xs font-mono text-text-primary">{formatIPS(currentIPS)} IPS</span>
                </div>

                {/* Performance Bar */}
                <div>
                    <div className="flex justify-between items-center mb-xs">
                        <span className={`text-xs ${currentEngine === 'WASM' ? 'text-success' : 'text-data-value'}`}>
                            Current Performance
                        </span>
                        <span className="text-xs font-mono text-text-secondary">
                            {formatIPS(currentIPS)} ({formatPercent(currentIPS, maxIPS)}%)
                        </span>
                    </div>
                    {renderPerformanceBar(
                        currentIPS,
                        maxIPS,
                        currentEngine === 'WASM' ? 'bg-success' : 'bg-data-value',
                    )}
                </div>

                {/* Host CPU cost — the real engine difference the throttled IPS hides */}
                <div
                    className="flex justify-between items-center"
                    title="Host wall-clock time spent per emulated second at the 1MHz target. Lower is better; headroom is how much faster than 1MHz this engine could run unthrottled."
                >
                    <span className="text-xs text-text-secondary">Host CPU</span>
                    <span
                        className={`text-xs font-mono ${currentEngine === 'WASM' ? 'text-success' : 'text-data-value'}`}
                    >
                        {formatHostCost(activeMetrics?.hostMillisPerSecond)}
                    </span>
                </div>
            </div>

            {/* Detailed Metrics (collapsible) */}
            {showDetails && (
                <div className="mt-md pt-md border-t border-border-subtle space-y-md">
                    {/* Performance History Sparklines */}
                    {history.length > 1 && (
                        <div>
                            <h4 className="text-xs font-medium text-text-accent mb-sm">Performance History</h4>
                            <div>
                                <div
                                    className={`text-xs mb-xs ${currentEngine === 'WASM' ? 'text-success' : 'text-data-value'}`}
                                >
                                    {currentEngine} Engine
                                </div>
                                {renderSparkline(
                                    history.map((h) => h.ips || 0),
                                    currentEngine === 'WASM' ? '#34d399' : '#60a5fa',
                                )}
                            </div>
                        </div>
                    )}

                    {/* Detailed Statistics */}
                    <div>
                        <h4 className="text-xs font-medium text-text-accent mb-sm">Statistics</h4>
                        <div className="grid grid-cols-2 gap-sm text-xs">
                            {/* Instructions Executed */}
                            <span className="text-text-secondary">Instructions:</span>
                            <span className="font-mono text-text-primary">
                                {((activeMetrics?.instructionsExecuted || 0) / 1_000_000).toFixed(2)}M
                            </span>

                            {/* Average IPS */}
                            <span className="text-text-secondary">Average IPS:</span>
                            <span className="font-mono text-text-primary">{formatIPS(avgIPS)}</span>

                            {/* Current IPS */}
                            <span className="text-text-secondary">Current IPS:</span>
                            <span className="font-mono text-text-primary">{formatIPS(currentIPS)}</span>

                            {/* Memory Usage */}
                            <span className="text-text-secondary">Memory:</span>
                            <span className="font-mono text-text-primary">{formatMemory(currentMemory)}</span>

                            {/* Switch Statistics */}
                            <span className="text-text-secondary">Engine Switches:</span>
                            <span className="font-mono text-text-primary">{engineStatus.switchCount}</span>

                            {engineStatus.lastSwitchTime > 0 && (
                                <>
                                    <span className="text-text-secondary">Last Switch:</span>
                                    <span className="font-mono text-text-primary">
                                        {engineStatus.lastSwitchTime.toFixed(1)}ms
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Peak Performance */}
                    <div className="pt-sm border-t border-border-subtle">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-text-secondary">Peak IPS:</span>
                            <span className="text-xs font-mono text-text-accent">{formatIPS(maxIPS)}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PerformanceMetrics;
