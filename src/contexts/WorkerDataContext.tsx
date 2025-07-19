import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
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
        };
    }, [workerManager]);
    
    const value: WorkerDataContextType = {
        debugInfo,
        breakpoints,
        
        subscribeToDebugInfo: (callback) => {
            if (!dataSyncRef.current) {
                throw new Error('WorkerDataSync not initialized');
            }
            return dataSyncRef.current.subscribeToDebugInfo(callback);
        },
        
        subscribeToBreakpoints: (callback) => {
            if (!dataSyncRef.current) {
                throw new Error('WorkerDataSync not initialized');
            }
            return dataSyncRef.current.subscribeToBreakpoints(callback);
        },
        
        subscribeToMemoryRange: (start, length, callback) => {
            if (!dataSyncRef.current) {
                throw new Error('WorkerDataSync not initialized');
            }
            return dataSyncRef.current.subscribeToMemoryRange(start, length, callback);
        },
        
        setDebuggerActive: (active) => {
            if (dataSyncRef.current) {
                dataSyncRef.current.setDebuggerActive(active);
            }
        },
        
        refreshDebugInfo: async () => {
            if (dataSyncRef.current) {
                await dataSyncRef.current.refreshDebugInfo();
            }
        },
        
        refreshBreakpoints: async () => {
            if (dataSyncRef.current) {
                await dataSyncRef.current.refreshBreakpoints();
            }
        },
        
        refreshMemoryRange: async (start, length) => {
            if (dataSyncRef.current) {
                await dataSyncRef.current.refreshMemoryRange(start, length);
            }
        },
    };
    
    return (
        <WorkerDataContext.Provider value={value}>
            {children}
        </WorkerDataContext.Provider>
    );
};