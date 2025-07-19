import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { FilteredDebugData } from '../apple1/types/worker-messages';
import type { WorkerManager } from '../services/WorkerManager';
import { useWorkerData } from './WorkerDataContext';

type ExecutionState = 'running' | 'paused' | 'stepping';

interface EmulationContextType {
    // State
    isPaused: boolean;
    executionState: ExecutionState;
    currentPC: number;
    debugInfo: FilteredDebugData;
    breakpoints: Set<number>;
    
    // Actions
    pause: () => void;
    resume: () => void;
    step: () => void;
    stepOver: () => void;
    runToAddress: (address: number) => void;
    toggleBreakpoint: (address: number) => void;
    clearAllBreakpoints: () => void;
    
    // Events
    onBreakpointHit?: (address: number) => void;
    onRunToCursorSet?: (address: number | null) => void;
}

const EmulationContext = createContext<EmulationContextType | undefined>(undefined);

interface EmulationProviderProps {
    children: ReactNode;
    workerManager: WorkerManager;
    onBreakpointHit?: (address: number) => void;
    onRunToCursorSet?: (address: number | null) => void;
}

export const EmulationProvider: React.FC<EmulationProviderProps> = ({ 
    children, 
    workerManager,
    onBreakpointHit,
    onRunToCursorSet 
}) => {
    const [isPaused, setIsPaused] = useState(false);
    const [executionState, setExecutionState] = useState<ExecutionState>('running');
    const [currentPC, setCurrentPC] = useState(0);
    // Get debug info from WorkerDataContext
    const { debugInfo, subscribeToDebugInfo, setDebuggerActive } = useWorkerData();
    const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set());
    // Note: Debug info subscription not yet implemented in WorkerManager
    // const [lastStepPC, setLastStepPC] = useState<number | null>(null);

    // Handle worker events via WorkerManager
    useEffect(() => {
        let unsubscribeStatus: (() => void) | undefined;
        let unsubscribeBreakpoint: (() => void) | undefined;
        let unsubscribeRunToCursor: (() => void) | undefined;
        
        const setupEventHandlers = async () => {
            // Set up event subscriptions
            const statusResult = await workerManager.onEmulationStatus((status: 'running' | 'paused') => {
                if (status === 'paused') {
                    setIsPaused(true);
                    setExecutionState('paused');
                } else if (status === 'running') {
                    setIsPaused(false);
                    setExecutionState('running');
                }
            });
            if (statusResult) {
                unsubscribeStatus = statusResult;
            }
            
            const breakpointResult = await workerManager.onBreakpointHit((hitAddress: number) => {
                setCurrentPC(hitAddress);
                setIsPaused(true);
                setExecutionState('paused');
                onBreakpointHit?.(hitAddress);
            });
            if (breakpointResult) {
                unsubscribeBreakpoint = breakpointResult;
            }
            
            const runToCursorResult = await workerManager.onRunToCursorTarget((target: number | null) => {
                onRunToCursorSet?.(target);
            });
            if (runToCursorResult) {
                unsubscribeRunToCursor = runToCursorResult;
            }
            
            // Get initial state
            try {
                const breakpoints = await workerManager.getBreakpoints();
                if (breakpoints) {
                    setBreakpoints(new Set(breakpoints));
                }
            } catch (error) {
                console.warn('Failed to get initial breakpoints:', error);
            }
        };
        
        setupEventHandlers();
        
        return () => {
            if (unsubscribeStatus) unsubscribeStatus();
            if (unsubscribeBreakpoint) unsubscribeBreakpoint();
            if (unsubscribeRunToCursor) unsubscribeRunToCursor();
        };
    }, [workerManager, onBreakpointHit, onRunToCursorSet]);

    // Actions
    const pause = useCallback(async () => {
        try {
            await workerManager.pauseEmulation();
            // Get current PC when pausing
            const debugData = await workerManager.getDebugInfo();
            if (debugData?.cpu) {
                const pc = debugData.cpu.REG_PC || debugData.cpu.PC;
                if (pc !== undefined) {
                    const pcValue = typeof pc === 'string' ? parseInt(pc.replace('$', ''), 16) : pc;
                    setCurrentPC(pcValue);
                }
                // Debug info is now managed by WorkerDataContext
            }
        } catch (error) {
            console.error('Failed to pause emulation:', error);
        }
    }, [workerManager]);

    const resume = useCallback(async () => {
        try {
            await workerManager.resumeEmulation();
        } catch (error) {
            console.error('Failed to resume emulation:', error);
        }
    }, [workerManager]);

    const step = useCallback(async () => {
        try {
            const debugData = await workerManager.step();
            if (debugData?.cpu) {
                // Update PC from debug data
                const pc = debugData.cpu.REG_PC || debugData.cpu.PC;
                if (pc !== undefined) {
                    const pcValue = typeof pc === 'string' ? parseInt(pc.replace('$', ''), 16) : pc;
                    setCurrentPC(pcValue);
                }
                // Debug info is now managed by WorkerDataContext
            }
        } catch (error) {
            console.error('Failed to step:', error);
        }
    }, [workerManager]);

    const stepOver = useCallback(async () => {
        // Step over not implemented in worker yet, just do regular step
        setExecutionState('stepping');
        try {
            const debugData = await workerManager.step();
            if (debugData?.cpu) {
                // Update PC from debug data
                const pc = debugData.cpu.REG_PC || debugData.cpu.PC;
                if (pc !== undefined) {
                    const pcValue = typeof pc === 'string' ? parseInt(pc.replace('$', ''), 16) : pc;
                    setCurrentPC(pcValue);
                }
                // Debug info is now managed by WorkerDataContext
            }
        } catch (error) {
            console.error('Failed to step over:', error);
        }
    }, [workerManager]);

    const runToAddress = useCallback(async (address: number) => {
        try {
            await workerManager.runToAddress(address);
        } catch (error) {
            console.error('Failed to run to address:', error);
        }
    }, [workerManager]);

    const toggleBreakpoint = useCallback(async (address: number) => {
        try {
            if (breakpoints.has(address)) {
                const newBreakpoints = await workerManager.clearBreakpoint(address);
                if (newBreakpoints) {
                    setBreakpoints(new Set(newBreakpoints));
                }
            } else {
                const newBreakpoints = await workerManager.setBreakpoint(address);
                if (newBreakpoints) {
                    setBreakpoints(new Set(newBreakpoints));
                }
            }
        } catch (error) {
            console.error('Failed to toggle breakpoint:', error);
        }
    }, [workerManager, breakpoints]);

    // Subscribe to debug info updates from WorkerDataContext
    useEffect(() => {
        const unsubscribe = subscribeToDebugInfo((data) => {
            if (data?.cpu) {
                const pc = data.cpu.REG_PC || data.cpu.PC;
                if (pc !== undefined) {
                    const pcValue = typeof pc === 'string' ? parseInt(pc.replace('$', ''), 16) : pc;
                    setCurrentPC(pcValue);
                }
            }
        });
        
        return unsubscribe;
    }, [subscribeToDebugInfo]);
    
    // Update debugger active state based on context
    useEffect(() => {
        // This context is typically used when debugger UI is visible
        setDebuggerActive(true);
        return () => {
            setDebuggerActive(false);
        };
    }, [setDebuggerActive]);

    const clearAllBreakpoints = useCallback(async () => {
        try {
            await workerManager.clearAllBreakpoints();
            setBreakpoints(new Set());
        } catch (error) {
            console.error('Failed to clear all breakpoints:', error);
        }
    }, [workerManager]);

    const value: EmulationContextType = {
        isPaused,
        executionState,
        currentPC,
        debugInfo,
        breakpoints,
        pause,
        resume,
        step,
        stepOver,
        runToAddress,
        toggleBreakpoint,
        clearAllBreakpoints,
        ...(onBreakpointHit !== undefined && { onBreakpointHit }),
        ...(onRunToCursorSet !== undefined && { onRunToCursorSet })
    };

    return (
        <EmulationContext.Provider value={value}>
            {children}
        </EmulationContext.Provider>
    );
};

export const useEmulation = () => {
    const context = useContext(EmulationContext);
    if (!context) {
        throw new Error('useEmulation must be used within an EmulationProvider');
    }
    return context;
};