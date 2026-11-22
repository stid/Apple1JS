import React, { useEffect, useState } from 'react';
import { OPCODES } from '../constants/opcodes';
import EngineSwitcher from './EngineSwitcher';
import PerformanceMetrics from './PerformanceMetrics';
import { MetricCard } from './MetricCard';
import { RegisterRow } from './RegisterRow';
import { useWorkerData } from '../contexts/WorkerDataContext';
import { useEngineStatus } from '../hooks/useEngineStatus';
import { loggingService } from '../services/LoggingService';
import type { WorkerManager } from '../services/WorkerManager';

interface PerformanceViewProps {
    workerManager: WorkerManager;
}

/** "$AD" → "LDA"; falls back to the hex when the opcode is unknown. */
const mnemonicOf = (opcodeHex: string): string => {
    const opcode = OPCODES[parseInt(opcodeHex.replace('$', ''), 16)];
    return opcode ? opcode.name : opcodeHex;
};

/**
 * Everything about how fast the emulator runs, in one place: which engine is
 * active, what it costs the host, and what the CPU spends its time on.
 */
const PerformanceView: React.FC<PerformanceViewProps> = ({ workerManager }) => {
    const { debugInfo, setDebuggerActive, refreshDebugInfo } = useWorkerData();
    const { status: engineStatus } = useEngineStatus(workerManager);
    const [profilingEnabled, setProfilingEnabled] = useState<boolean>(false);
    const [profilingPending, setProfilingPending] = useState<boolean>(false);

    // Profiling results arrive with the debug info, polled only while a view that shows it is on screen.
    useEffect(() => {
        setDebuggerActive(true);
        return () => setDebuggerActive(false);
    }, [setDebuggerActive]);

    const cpuDebugData = debugInfo.cpu || {};
    const perfData = cpuDebugData._PERF_DATA;

    // The worker is the authority on whether profiling is on.
    useEffect(() => {
        if (cpuDebugData.PERF_ENABLED !== undefined && !profilingPending) {
            const actual = cpuDebugData.PERF_ENABLED === 'YES';
            if (actual !== profilingEnabled) {
                setProfilingEnabled(actual);
            }
        }
    }, [cpuDebugData.PERF_ENABLED, profilingEnabled, profilingPending]);

    const handleProfilingToggle = async () => {
        if (profilingPending) return;

        const next = !profilingEnabled;
        setProfilingPending(true);
        try {
            await workerManager.setCpuProfiling(next);
            setProfilingEnabled(next);
            // Pull the new state into the shared debug info now rather than waiting for the next poll.
            await refreshDebugInfo();
        } catch (error) {
            loggingService.error('PerformanceView', `Failed to toggle CPU profiling: ${error}`);
            setProfilingEnabled(!next);
        } finally {
            setProfilingPending(false);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-auto space-y-md">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
                <EngineSwitcher workerManager={workerManager} />

                {engineStatus && (
                    <section className="card">
                        <h3 className="card-title mb-md">CPU engine</h3>
                        <div className="grid grid-cols-2 gap-x-lg gap-y-sm">
                            <RegisterRow label="Active Engine" value={engineStatus.currentEngine} type="status" />
                            <RegisterRow
                                label="Available"
                                value={engineStatus.availableEngines.join(', ')}
                                type="status"
                            />
                            <RegisterRow label="Switch Count" value={String(engineStatus.switchCount)} type="value" />
                            {engineStatus.lastSwitchTime > 0 && (
                                <RegisterRow
                                    label="Last Switch"
                                    value={`${engineStatus.lastSwitchTime.toFixed(1)}ms`}
                                    type="status"
                                />
                            )}
                        </div>
                    </section>
                )}
            </div>

            <PerformanceMetrics workerManager={workerManager} />

            <section className="card">
                <div className="flex items-center justify-between mb-md">
                    <h3 className="card-title">Instruction profiling</h3>
                    <button
                        onClick={handleProfilingToggle}
                        disabled={profilingPending}
                        aria-pressed={profilingEnabled}
                        className={`btn ${profilingEnabled ? 'btn-primary' : 'btn-secondary'} ${
                            profilingPending ? 'cursor-wait' : ''
                        }`}
                    >
                        {profilingPending ? 'Updating…' : profilingEnabled ? 'Disable profiling' : 'Enable profiling'}
                    </button>
                </div>

                {profilingEnabled && !perfData && (
                    <div className="bg-surface-secondary rounded-md p-md border border-border-subtle text-sm text-text-secondary text-center">
                        {profilingPending
                            ? 'Initializing profiler...'
                            : 'Waiting for profiling data... Run some code to see statistics.'}
                    </div>
                )}

                {profilingEnabled && perfData && (
                    <div className="space-y-md">
                        <div className="grid grid-cols-3 gap-md">
                            <MetricCard
                                label="Instructions"
                                value={perfData.stats?.instructionCount.toLocaleString() || '0'}
                                status="info"
                            />
                            <MetricCard
                                label="Unique Opcodes"
                                value={perfData.stats?.totalInstructions || '0'}
                                status="info"
                            />
                            <MetricCard label="Status" value="ACTIVE" status="success" />
                        </div>

                        {perfData.topOpcodes && perfData.topOpcodes.length > 0 && (
                            <div className="bg-surface-secondary rounded-md p-md border border-border-subtle">
                                <div className="text-sm font-medium text-text-secondary mb-sm">Top Instructions</div>
                                <div className="space-y-sm">
                                    {perfData.topOpcodes.slice(0, 3).map((opcode) => (
                                        <div
                                            key={opcode.opcode}
                                            className="flex justify-between items-center text-sm font-mono"
                                        >
                                            <span className="text-data-status font-medium">
                                                {mnemonicOf(opcode.opcode)}
                                            </span>
                                            <span className="text-data-value">{opcode.count.toLocaleString()}</span>
                                            <span className="text-data-flag">{opcode.avgCycles}c</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
};

export default PerformanceView;
