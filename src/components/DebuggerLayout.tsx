import React, { useState, useEffect } from 'react';
import DisassemblerPaginated from './DisassemblerPaginated';
import MemoryViewerPaginated from './MemoryViewerPaginated';
import StackViewer from './StackViewer';
import ExecutionControls from './ExecutionControls';
import { IInspectableComponent } from '../core/types';
import { DebugData } from '../apple1/TSTypes';
import { useDebuggerNavigation } from '../contexts/DebuggerNavigationContext';
import AddressLink from './AddressLink';
import { REFRESH_RATES } from '../constants/ui';
import type { WorkerManager } from '../services/WorkerManager';

interface DebuggerLayoutProps {
    root: IInspectableComponent;
    workerManager: WorkerManager;
    initialNavigation?: { address: number; target: 'memory' | 'disassembly' } | null;
    onNavigationHandled?: () => void;
    memoryViewAddress: number;
    setMemoryViewAddress: (address: number) => void;
    disassemblerAddress: number;
    setDisassemblerAddress: (address: number) => void;
}

type DebugView = 'overview' | 'memory' | 'disassembly';

const DebuggerLayout: React.FC<DebuggerLayoutProps> = ({ workerManager, initialNavigation, onNavigationHandled, memoryViewAddress, setMemoryViewAddress, disassemblerAddress, setDisassemblerAddress }) => {
    const [activeView, setActiveView] = useState<DebugView>('overview');
    const [debugInfo, setDebugInfo] = useState<DebugData>({});
    const { subscribeToNavigation } = useDebuggerNavigation();
    
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
    }, [initialNavigation, onNavigationHandled, setDisassemblerAddress, setMemoryViewAddress]);

    // Note: Debug info subscription not yet available in WorkerManager
    // For now, we'll poll for debug info when needed

    // Control debugger visibility state in worker
    useEffect(() => {
        // Notify worker that debugger is active
        workerManager.setDebuggerActive(true);
        
        // Cleanup: notify worker that debugger is inactive
        return () => {
            workerManager.setDebuggerActive(false);
        };
    }, [workerManager]);
    
    // Request debug info periodically - but only when on overview tab
    useEffect(() => {
        if (activeView !== 'overview') return;
        
        const fetchDebugInfo = async () => {
            try {
                const info = await workerManager.getDebugInfo();
                if (info) {
                    setDebugInfo(info);
                }
            } catch (error) {
                console.error('Error fetching debug info:', error);
            }
        };
        
        fetchDebugInfo();
        const interval = setInterval(fetchDebugInfo, REFRESH_RATES.FAST);
        return () => clearInterval(interval);
    }, [workerManager, activeView]);

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
    }, [subscribeToNavigation, setDisassemblerAddress, setMemoryViewAddress]);


    return (
        <div className="flex flex-col h-full">
            {/* View Selector - Styled as subtle tabs */}
            <div className="flex gap-xs mb-md border-b border-border-subtle pb-sm">
                <button
                    className={`px-md py-xs text-xs font-medium transition-all border-b-2 ${
                        activeView === 'overview'
                            ? 'text-text-accent border-text-accent'
                            : 'text-text-secondary border-transparent hover:text-text-primary'
                    }`}
                    onClick={() => setActiveView('overview')}
                >
                    Overview
                </button>
                <button
                    className={`px-md py-xs text-xs font-medium transition-all border-b-2 ${
                        activeView === 'memory'
                            ? 'text-text-accent border-text-accent'
                            : 'text-text-secondary border-transparent hover:text-text-primary'
                    }`}
                    onClick={() => setActiveView('memory')}
                >
                    Memory
                </button>
                <button
                    className={`px-md py-xs text-xs font-medium transition-all border-b-2 ${
                        activeView === 'disassembly'
                            ? 'text-text-accent border-text-accent'
                            : 'text-text-secondary border-transparent hover:text-text-primary'
                    }`}
                    onClick={() => setActiveView('disassembly')}
                >
                    Disassembly
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
                {activeView === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-md h-full overflow-auto">
                        {/* Left Column */}
                        <div className="space-y-md">
                            {/* Execution Controls */}
                            <ExecutionControls workerManager={workerManager} />
                            
                            {/* CPU State */}
                            <div className="bg-surface-primary rounded-lg p-md border border-border-primary">
                                <div className="flex items-center justify-between mb-sm">
                                    <h3 className="text-sm font-medium text-text-accent">CPU State</h3>
                                    <div className="text-xs font-mono text-text-secondary">
                                        PC: {debugInfo.cpu?.REG_PC ? (
                                            <AddressLink 
                                                address={parseInt(String(debugInfo.cpu.REG_PC).replace('$', ''), 16)} 
                                                showContextMenu={true}
                                                workerManager={workerManager}
                                                showRunToCursor={true}
                                            />
                                        ) : (
                                            <span className="text-data-address">$0000</span>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-sm text-sm">
                                    <div>
                                        <span className="text-text-secondary">A:</span>
                                        <div className="font-mono text-data-value">{debugInfo.cpu?.REG_A || '$00'}</div>
                                    </div>
                                    <div>
                                        <span className="text-text-secondary">X:</span>
                                        <div className="font-mono text-data-value">{debugInfo.cpu?.REG_X || '$00'}</div>
                                    </div>
                                    <div>
                                        <span className="text-text-secondary">Y:</span>
                                        <div className="font-mono text-data-value">{debugInfo.cpu?.REG_Y || '$00'}</div>
                                    </div>
                                    <div>
                                        <span className="text-text-secondary">SP:</span>
                                        <div className="font-mono text-data-value">{debugInfo.cpu?.REG_S || '$FF'}</div>
                                    </div>
                                    <div>
                                        <span className="text-text-secondary">Status:</span>
                                        <div className="font-mono text-xs space-x-1">
                                            <span className={debugInfo.cpu?.FLAG_N === 'SET' ? 'text-success' : 'text-text-secondary'}>N</span>
                                            <span className={debugInfo.cpu?.FLAG_V === 'SET' ? 'text-success' : 'text-text-secondary'}>V</span>
                                            <span className="text-text-secondary">-</span>
                                            <span className="text-text-secondary">B</span>
                                            <span className={debugInfo.cpu?.FLAG_D === 'SET' ? 'text-success' : 'text-text-secondary'}>D</span>
                                            <span className={debugInfo.cpu?.FLAG_I === 'SET' ? 'text-success' : 'text-text-secondary'}>I</span>
                                            <span className={debugInfo.cpu?.FLAG_Z === 'SET' ? 'text-success' : 'text-text-secondary'}>Z</span>
                                            <span className={debugInfo.cpu?.FLAG_C === 'SET' ? 'text-success' : 'text-text-secondary'}>C</span>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-text-secondary">Cycles:</span>
                                        <div className="font-mono text-data-status">{debugInfo.cpu?.HW_CYCLES || '0'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Execution State */}
                            <div className="bg-surface-primary rounded-lg p-md border border-border-primary">
                                <h3 className="text-sm font-medium text-text-accent mb-sm">Execution</h3>
                                <div className="space-y-sm text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-text-secondary">Last Opcode:</span>
                                        <span className="font-mono text-data-value">{debugInfo.cpu?.HW_OPCODE || '$00'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-text-secondary">Instructions:</span>
                                        <span className="font-mono text-data-status">{debugInfo.cpu?.PERF_INSTRUCTIONS || '0'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-text-secondary">IRQ Line:</span>
                                        <span className={`font-mono text-sm ${debugInfo.cpu?.IRQ_LINE === 'ACTIVE' ? 'text-warning' : 'text-text-secondary'}`}>
                                            {debugInfo.cpu?.IRQ_LINE || 'INACTIVE'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-text-secondary">NMI Line:</span>
                                        <span className={`font-mono text-sm ${debugInfo.cpu?.NMI_LINE === 'ACTIVE' ? 'text-warning' : 'text-text-secondary'}`}>
                                            {debugInfo.cpu?.NMI_LINE || 'INACTIVE'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Memory Map Quick Reference */}
                            <div className="bg-surface-primary rounded-lg p-md border border-border-primary">
                                <h3 className="text-sm font-medium text-text-accent mb-sm">Memory Map</h3>
                                <div className="space-y-xs text-xs font-mono">
                                    <div className="flex justify-between">
                                        <span className="text-text-secondary">Zero Page:</span>
                                        <span>
                                            <AddressLink address={0x0000} showContextMenu={true} workerManager={workerManager} showRunToCursor={true} /> - 
                                            <AddressLink address={0x00FF} showContextMenu={true} workerManager={workerManager} showRunToCursor={true} />
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-text-secondary">Stack:</span>
                                        <span>
                                            <AddressLink address={0x0100} showContextMenu={true} workerManager={workerManager} showRunToCursor={true} /> - 
                                            <AddressLink address={0x01FF} showContextMenu={true} workerManager={workerManager} showRunToCursor={true} />
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-text-secondary">RAM:</span>
                                        <span className="text-data-address">$0200-$0FFF</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-text-secondary">PIA I/O:</span>
                                        <span>
                                            <AddressLink address={0xD010} showContextMenu={true} workerManager={workerManager} showRunToCursor={true} /> - 
                                            <AddressLink address={0xD013} showContextMenu={true} workerManager={workerManager} showRunToCursor={true} />
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-text-secondary">BASIC:</span>
                                        <span className="text-data-address">$E000-$EFFF</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-text-secondary">WOZ Mon:</span>
                                        <span>
                                            <AddressLink address={0xFF00} showContextMenu={true} workerManager={workerManager} showRunToCursor={true} /> - 
                                            <AddressLink address={0xFFFF} showContextMenu={true} workerManager={workerManager} showRunToCursor={true} />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stack View */}
                        <div className="bg-surface-primary rounded-lg p-md border border-border-primary flex flex-col" style={{ minHeight: '400px' }}>
                            <h3 className="text-sm font-medium text-text-accent mb-sm flex-none">Stack</h3>
                            <div className="flex-1" style={{ minHeight: 0 }}>
                                <StackViewer
                                    workerManager={workerManager}
                                    stackPointer={parseInt(String(debugInfo.cpu?.REG_S || '$FF').replace('$', ''), 16)}
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