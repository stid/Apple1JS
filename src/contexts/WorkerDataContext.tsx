import React, { createContext, useContext, useEffect, useState, ReactNode, useRef, useMemo, useCallback } from 'react';
import { WorkerDataSync } from '../services/WorkerDataSync';
import { FilteredDebugData } from '../apple1/types/worker-messages';
import type { WorkerManager } from '../services/WorkerManager';

interface WorkerDataContextType {
    // Debug info
    debugInfo: FilteredDebugData;
    subscribeToDebugInfo: (callback: (data: FilteredDebugData) => void) => () => void;
    
    // Breakpoints
    breakpoints: number[];
    subscribeToBreakpoints: (callback: (data: number[]) => void) => () => void;
    
    // Memory ranges
    subscribeToMemoryRange: (start: number, length: number, callback: (data: number[]) => void) => () => void;
    
    // Control methods
    setDebuggerActive: (active: boolean) => void;
    refreshDebugInfo: () => Promise<void>;
    refreshBreakpoints: () => Promise<void>;
    refreshMemoryRange: (start: number, length: number) => Promise<void>;
}

const WorkerDataContext = createContext<WorkerDataContextType | undefined>(undefined);

export const useWorkerData = () => {
    const context = useContext(WorkerDataContext);
    if (!context) {
        throw new Error('useWorkerData must be used within a WorkerDataProvider');
    }
    return context;
};

interface WorkerDataProviderProps {
    workerManager: WorkerManager;
    children: ReactNode;
}

export const WorkerDataProvider: React.FC<WorkerDataProviderProps> = ({ workerManager, children }) => {
    const [debugInfo, setDebugInfo] = useState<FilteredDebugData>({});
    const [breakpoints, setBreakpoints] = useState<number[]>([]);
    const dataSyncRef = useRef<WorkerDataSync | null>(null);
    
    useEffect(() => {
        // Create WorkerDataSync instance
        const dataSync = new WorkerDataSync(workerManager);
        dataSyncRef.current = dataSync;
        
        // Subscribe to debug info updates
        const unsubscribeDebug = dataSync.subscribeToDebugInfo((data) => {
            setDebugInfo(data);
        });
        
        // Subscribe to breakpoints updates
        const unsubscribeBreakpoints = dataSync.subscribeToBreakpoints((data) => {
            setBreakpoints(data);
        });
        
        // Cleanup
        return () => {
            unsubscribeDebug();
            unsubscribeBreakpoints();
            dataSync.dispose();
            dataSyncRef.current = null;
        };
    }, [workerManager]);
    
    const subscribeToDebugInfo = useCallback((callback: (data: FilteredDebugData) => void) => {
        if (!dataSyncRef.current) {
            // Return a no-op unsubscribe function if not initialized yet
            console.warn('WorkerDataSync not initialized yet, deferring subscription');
            return () => {};
        }
        return dataSyncRef.current.subscribeToDebugInfo(callback);
    }, []);
    
    const subscribeToBreakpoints = useCallback((callback: (data: number[]) => void) => {
        if (!dataSyncRef.current) {
            // Return a no-op unsubscribe function if not initialized yet
            console.warn('WorkerDataSync not initialized yet, deferring subscription');
            return () => {};
        }
        return dataSyncRef.current.subscribeToBreakpoints(callback);
    }, []);
    
    const subscribeToMemoryRange = useCallback((start: number, length: number, callback: (data: number[]) => void) => {
        if (!dataSyncRef.current) {
            // Return a no-op unsubscribe function if not initialized yet
            console.warn('WorkerDataSync not initialized yet, deferring subscription');
            return () => {};
        }
        return dataSyncRef.current.subscribeToMemoryRange(start, length, callback);
    }, []);
    
    const setDebuggerActive = useCallback((active: boolean) => {
        if (dataSyncRef.current) {
            dataSyncRef.current.setDebuggerActive(active);
        }
    }, []);
    
    const refreshDebugInfo = useCallback(async () => {
        if (dataSyncRef.current) {
            await dataSyncRef.current.refreshDebugInfo();
        }
    }, []);
    
    const refreshBreakpoints = useCallback(async () => {
        if (dataSyncRef.current) {
            await dataSyncRef.current.refreshBreakpoints();
        }
    }, []);
    
    const refreshMemoryRange = useCallback(async (start: number, length: number) => {
        if (dataSyncRef.current) {
            await dataSyncRef.current.refreshMemoryRange(start, length);
        }
    }, []);
    
    const value: WorkerDataContextType = useMemo(() => ({
        debugInfo,
        breakpoints,
        subscribeToDebugInfo,
        subscribeToBreakpoints,
        subscribeToMemoryRange,
        setDebuggerActive,
        refreshDebugInfo,
        refreshBreakpoints,
        refreshMemoryRange,
    }), [debugInfo, breakpoints, subscribeToDebugInfo, subscribeToBreakpoints, 
        subscribeToMemoryRange, setDebuggerActive, refreshDebugInfo, 
        refreshBreakpoints, refreshMemoryRange]);
    
    return (
        <WorkerDataContext.Provider value={value}>
            {children}
        </WorkerDataContext.Provider>
    );
};