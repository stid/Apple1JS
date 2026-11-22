import React, { useEffect } from 'react';
import DisassemblerPaginated from './DisassemblerPaginated';
import MemoryViewerPaginated from './MemoryViewerPaginated';
import StackViewer from './StackViewer';
import EngineSwitcher from './EngineSwitcher';
import PerformanceMetrics from './PerformanceMetrics';
import CpuStateCard from './CpuStateCard';
import ExecutionCard from './ExecutionCard';
import { useDebuggerNavigation } from '../contexts/DebuggerNavigationContext';
import { useWorkerData } from '../contexts/WorkerDataContext';
import { getNumericDebugValue } from '../utils/debug-helpers';
import { useLocalStorageState } from '../hooks/useLocalStorageState';
import AddressLink from './AddressLink';
import type { WorkerManager } from '../services/WorkerManager';

interface DebuggerLayoutProps {
    workerManager: WorkerManager;
    initialNavigation?: { address: number; target: 'memory' | 'disassembly' } | null;
    onNavigationHandled?: () => void;
    memoryViewAddress: number;
    setMemoryViewAddress: (address: number) => void;
    disassemblerAddress: number;
    setDisassemblerAddress: (address: number) => void;
}

type DebugView = 'overview' | 'memory' | 'disassembly';

const DEBUG_VIEWS: Array<{ id: DebugView; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'memory', label: 'Memory' },
    { id: 'disassembly', label: 'Disassembly' },
];

// Guard for the persisted view pref: reject valid-JSON-but-invalid values from localStorage.
const isDebugView = (v: unknown): v is DebugView => v === 'overview' || v === 'memory' || v === 'disassembly';

const DebuggerLayout: React.FC<DebuggerLayoutProps> = ({
    workerManager,
    initialNavigation,
    onNavigationHandled,
    memoryViewAddress,
    setMemoryViewAddress,
    disassemblerAddress,
    setDisassemblerAddress,
}) => {
    const [activeView, setActiveView] = useLocalStorageState<DebugView>(
        'apple1js_ui_debugView',
        'overview',
        isDebugView,
    );
    const { subscribeToNavigation } = useDebuggerNavigation();
    const { debugInfo, setDebuggerActive } = useWorkerData();

    // Handle initial navigation from parent
    useEffect(() => {
        if (initialNavigation) {
            if (initialNavigation.target === 'disassembly') {
                setActiveView('disassembly');
                setDisassemblerAddress(initialNavigation.address);
            } else if (initialNavigation.target === 'memory') {
                setActiveView('memory');
                setMemoryViewAddress(initialNavigation.address);
            }
            onNavigationHandled?.();
        }
    }, [initialNavigation, onNavigationHandled, setActiveView, setDisassemblerAddress, setMemoryViewAddress]);

    // Control debugger visibility state using WorkerDataContext
    useEffect(() => {
        // Notify that debugger is active
        setDebuggerActive(true);

        // Cleanup: notify that debugger is inactive
        return () => {
            setDebuggerActive(false);
        };
    }, [setDebuggerActive]);

    // Debug info is now provided by WorkerDataContext, no need to poll

    // Subscribe to navigation events
    useEffect(() => {
        const unsubscribe = subscribeToNavigation((event) => {
            if (event.target === 'disassembly') {
                setActiveView('disassembly');
                setDisassemblerAddress(event.address);
            } else if (event.target === 'memory') {
                setActiveView('memory');
                setMemoryViewAddress(event.address);
            }
        });

        return unsubscribe;
    }, [subscribeToNavigation, setActiveView, setDisassemblerAddress, setMemoryViewAddress]);

    return (
        <div className="flex flex-col h-full">
            {/* View selector: a segmented control, one level below the primary tabs.
                Plain pressed buttons in a group: Tab reaches each one, no arrow-key contract. */}
            <div className="flex-none mb-md">
                <div className="segmented" role="group" aria-label="Debugger views">
                    {DEBUG_VIEWS.map((view) => (
                        <button
                            key={view.id}
                            aria-pressed={activeView === view.id}
                            className="segment"
                            onClick={() => setActiveView(view.id)}
                        >
                            {view.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
                {activeView === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-md h-full overflow-auto">
                        {/* Left Column */}
                        <div className="space-y-md">
                            {/* Execution controls now live in the always-visible bar
                                (ExecutionControlsCluster) — not duplicated here. */}

                            {/* Engine Switcher */}
                            <EngineSwitcher workerManager={workerManager} />

                            {/* CPU State */}
                            <CpuStateCard debugInfo={debugInfo} workerManager={workerManager} />

                            {/* Execution State */}
                            <ExecutionCard debugInfo={debugInfo} />

                            {/* Memory Map Quick Reference */}
                            <div className="card">
                                <h3 className="card-title mb-sm">Memory map</h3>
                                <div className="space-y-xs text-xs font-mono">
                                    <div className="flex justify-between">
                                        <span className="text-text-secondary">Zero Page:</span>
                                        <span>
                                            <AddressLink
                                                address={0x0000}
                                                showContextMenu={true}
                                                workerManager={workerManager}
                                                showRunToCursor={true}
                                            />{' '}
                                            -
                                            <AddressLink
                                                address={0x00ff}
                                                showContextMenu={true}
                                                workerManager={workerManager}
                                                showRunToCursor={true}
                                            />
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-text-secondary">Stack:</span>
                                        <span>
                                            <AddressLink
                                                address={0x0100}
                                                showContextMenu={true}
                                                workerManager={workerManager}
                                                showRunToCursor={true}
                                            />{' '}
                                            -
                                            <AddressLink
                                                address={0x01ff}
                                                showContextMenu={true}
                                                workerManager={workerManager}
                                                showRunToCursor={true}
                                            />
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-text-secondary">RAM:</span>
                                        <span className="text-data-address">$0200-$0FFF</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-text-secondary">PIA I/O:</span>
                                        <span>
                                            <AddressLink
                                                address={0xd010}
                                                showContextMenu={true}
                                                workerManager={workerManager}
                                                showRunToCursor={true}
                                            />{' '}
                                            -
                                            <AddressLink
                                                address={0xd013}
                                                showContextMenu={true}
                                                workerManager={workerManager}
                                                showRunToCursor={true}
                                            />
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-text-secondary">BASIC:</span>
                                        <span className="text-data-address">$E000-$EFFF</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-text-secondary">WOZ Mon:</span>
                                        <span>
                                            <AddressLink
                                                address={0xff00}
                                                showContextMenu={true}
                                                workerManager={workerManager}
                                                showRunToCursor={true}
                                            />{' '}
                                            -
                                            <AddressLink
                                                address={0xffff}
                                                showContextMenu={true}
                                                workerManager={workerManager}
                                                showRunToCursor={true}
                                            />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-md">
                            {/* Performance Metrics */}
                            <PerformanceMetrics workerManager={workerManager} />

                            {/* Stack View */}
                            <div className="card">
                                <h3 className="card-title mb-sm">Stack</h3>
                                <StackViewer
                                    workerManager={workerManager}
                                    stackPointer={getNumericDebugValue(debugInfo.cpu?.REG_S, 0xff)}
                                    stackBase={
                                        debugInfo.cpu?.STACK_BASE === undefined
                                            ? undefined
                                            : getNumericDebugValue(debugInfo.cpu.STACK_BASE, 0xff)
                                    }
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeView === 'memory' && (
                    <div className="h-full">
                        <MemoryViewerPaginated
                            workerManager={workerManager}
                            currentAddress={memoryViewAddress}
                            onAddressChange={setMemoryViewAddress}
                        />
                    </div>
                )}

                {activeView === 'disassembly' && (
                    <div className="h-full">
                        <DisassemblerPaginated
                            workerManager={workerManager}
                            currentAddress={disassemblerAddress}
                            onAddressChange={setDisassemblerAddress}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default DebuggerLayout;
