import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { WORKER_MESSAGES, DebugData, sendWorkerMessage, isWorkerMessage } from '../apple1/types/worker-messages';

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
    const [lastStepPC, setLastStepPC] = useState<number | null>(null);

    // Handle worker messages
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            if (!isWorkerMessage(message)) {
                return;
            }
            
            const { type } = message;
            const data = 'data' in message ? message.data : undefined;
            
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
                    if (typeof data === 'number') {
                        const hitAddress = data;
                        setCurrentPC(hitAddress);
                        setIsPaused(true);
                        setExecutionState('paused');
                        onBreakpointHit?.(hitAddress);
                    }
                    break;
                }
                    
                case WORKER_MESSAGES.RUN_TO_CURSOR_TARGET:
                    // Data is the target address or null
                    if (typeof data === 'number' || data === null) {
                        onRunToCursorSet?.(data);
                    }
                    break;
                    
                case WORKER_MESSAGES.DEBUG_INFO:
                case WORKER_MESSAGES.DEBUG_DATA: {
                    if (data && typeof data === 'object' && 'cpu' in data) {
                        const debugData = data as DebugData;
                        setDebugInfo(debugData);
                        // Check for REG_PC first (from toDebug()), then fall back to PC
                        const pcValue = debugData.cpu?.REG_PC || debugData.cpu?.PC;
                        if (pcValue !== undefined) {
                            const pc = typeof pcValue === 'string' 
                                ? parseInt(pcValue.replace('$', ''), 16)
                                : pcValue;
                            setCurrentPC(pc);
                            
                            // If we just stepped and PC changed, mark that we need to follow
                            if (lastStepPC !== null && pc !== lastStepPC) {
                                setLastStepPC(null); // Clear the flag
                            }
                        }
                    }
                    break;
                }
                    
                case WORKER_MESSAGES.BREAKPOINTS_DATA:
                    if (Array.isArray(data) && data.every(item => typeof item === 'number')) {
                        setBreakpoints(new Set(data));
                    }
                    break;
                    
                // Stepping state is managed locally when step is called
            }
        };
        
        worker.addEventListener('message', handleMessage);
        
        // Request initial state
        sendWorkerMessage(worker, WORKER_MESSAGES.GET_EMULATION_STATUS);
        sendWorkerMessage(worker, WORKER_MESSAGES.GET_BREAKPOINTS);
        
        return () => {
            worker.removeEventListener('message', handleMessage);
        };
    }, [worker, onBreakpointHit, onRunToCursorSet, lastStepPC]);

    // Actions
    const pause = useCallback(() => {
        sendWorkerMessage(worker, WORKER_MESSAGES.PAUSE_EMULATION);
    }, [worker]);

    const resume = useCallback(() => {
        sendWorkerMessage(worker, WORKER_MESSAGES.RESUME_EMULATION);
    }, [worker]);

    const step = useCallback(() => {
        setLastStepPC(currentPC); // Remember where we were before stepping
        sendWorkerMessage(worker, WORKER_MESSAGES.STEP);
    }, [worker, currentPC]);

    const stepOver = useCallback(() => {
        // Step over not implemented in worker yet, just do regular step
        setExecutionState('stepping');
        sendWorkerMessage(worker, WORKER_MESSAGES.STEP);
    }, [worker]);

    const runToAddress = useCallback((address: number) => {
        sendWorkerMessage(worker, WORKER_MESSAGES.RUN_TO_ADDRESS, address);
    }, [worker]);

    const toggleBreakpoint = useCallback((address: number) => {
        // Need to check current state and send appropriate message
        if (breakpoints.has(address)) {
            sendWorkerMessage(worker, WORKER_MESSAGES.CLEAR_BREAKPOINT, address);
        } else {
            sendWorkerMessage(worker, WORKER_MESSAGES.SET_BREAKPOINT, address);
        }
    }, [worker, breakpoints]);

    const clearAllBreakpoints = useCallback(() => {
        sendWorkerMessage(worker, WORKER_MESSAGES.CLEAR_ALL_BREAKPOINTS);
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