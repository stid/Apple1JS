import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { WORKER_MESSAGES, DebugData } from '../apple1/TSTypes';

type ExecutionState = 'running' | 'paused' | 'stepping';

interface EmulationContextType {
    // State
    isPaused: boolean;
    executionState: ExecutionState;
    currentPC: number;
    debugInfo: DebugData;
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
    worker: Worker;
    onBreakpointHit?: (address: number) => void;
    onRunToCursorSet?: (address: number | null) => void;
}

export const EmulationProvider: React.FC<EmulationProviderProps> = ({ 
    children, 
    worker,
    onBreakpointHit,
    onRunToCursorSet 
}) => {
    const [isPaused, setIsPaused] = useState(false);
    const [executionState, setExecutionState] = useState<ExecutionState>('running');
    const [currentPC, setCurrentPC] = useState(0);
    const [debugInfo, setDebugInfo] = useState<DebugData>({});
    const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set());

    // Handle worker messages
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const { type, data } = event.data;
            
            switch (type) {
                case WORKER_MESSAGES.EMULATION_STATUS:
                    if (data === 'paused') {
                        setIsPaused(true);
                        setExecutionState('paused');
                    } else if (data === 'running') {
                        setIsPaused(false);
                        setExecutionState('running');
                    }
                    break;
                    
                case WORKER_MESSAGES.BREAKPOINT_HIT: {
                    // Data is the PC address
                    const hitAddress = data;
                    setCurrentPC(hitAddress);
                    setIsPaused(true);
                    setExecutionState('paused');
                    onBreakpointHit?.(hitAddress);
                    break;
                }
                    
                case WORKER_MESSAGES.RUN_TO_CURSOR_TARGET:
                    // Data is the target address or null
                    onRunToCursorSet?.(data);
                    break;
                    
                case WORKER_MESSAGES.DEBUG_INFO:
                case WORKER_MESSAGES.DEBUG_DATA:
                    setDebugInfo(data as DebugData);
                    if (data.cpu?.PC !== undefined) {
                        const pc = typeof data.cpu.PC === 'string' 
                            ? parseInt(data.cpu.PC.replace('$', ''), 16)
                            : data.cpu.PC;
                        setCurrentPC(pc);
                    }
                    break;
                    
                case WORKER_MESSAGES.BREAKPOINTS_DATA:
                    setBreakpoints(new Set(data as number[]));
                    break;
                    
                // Stepping state is managed locally when step is called
            }
        };
        
        worker.addEventListener('message', handleMessage);
        
        // Request initial state
        worker.postMessage({ type: WORKER_MESSAGES.GET_EMULATION_STATUS });
        worker.postMessage({ type: WORKER_MESSAGES.GET_BREAKPOINTS });
        
        return () => {
            worker.removeEventListener('message', handleMessage);
        };
    }, [worker, onBreakpointHit, onRunToCursorSet]);

    // Actions
    const pause = useCallback(() => {
        worker.postMessage({ type: WORKER_MESSAGES.PAUSE_EMULATION });
    }, [worker]);

    const resume = useCallback(() => {
        worker.postMessage({ type: WORKER_MESSAGES.RESUME_EMULATION });
    }, [worker]);

    const step = useCallback(() => {
        setExecutionState('stepping');
        worker.postMessage({ type: WORKER_MESSAGES.STEP });
    }, [worker]);

    const stepOver = useCallback(() => {
        // Step over not implemented in worker yet, just do regular step
        setExecutionState('stepping');
        worker.postMessage({ type: WORKER_MESSAGES.STEP });
    }, [worker]);

    const runToAddress = useCallback((address: number) => {
        worker.postMessage({ type: WORKER_MESSAGES.RUN_TO_ADDRESS, data: address });
    }, [worker]);

    const toggleBreakpoint = useCallback((address: number) => {
        // Need to check current state and send appropriate message
        if (breakpoints.has(address)) {
            worker.postMessage({ type: WORKER_MESSAGES.CLEAR_BREAKPOINT, data: address });
        } else {
            worker.postMessage({ type: WORKER_MESSAGES.SET_BREAKPOINT, data: address });
        }
    }, [worker, breakpoints]);

    const clearAllBreakpoints = useCallback(() => {
        worker.postMessage({ type: WORKER_MESSAGES.CLEAR_ALL_BREAKPOINTS });
    }, [worker]);

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
        onBreakpointHit,
        onRunToCursorSet
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