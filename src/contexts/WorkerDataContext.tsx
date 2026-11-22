import React, { createContext, useContext, useEffect, useState, ReactNode, useRef, useMemo, useCallback } from 'react';
import { WorkerDataSync } from '../services/WorkerDataSync';
import { FilteredDebugData } from '../apple1/types/worker-messages';
import type { WorkerManager } from '../services/WorkerManager';

interface WorkerDataContextType {
    /** Latest debug info from the worker (CPU, PIA, bus, clock). */
    debugInfo: FilteredDebugData;
    subscribeToDebugInfo: (callback: (data: FilteredDebugData) => void) => () => void;

    /** Tell the sync a debug view is on screen (true) or gone (false). */
    setDebuggerActive: (active: boolean) => void;
    /** Fetch debug info now instead of waiting for the next poll. */
    refreshDebugInfo: () => Promise<void>;
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
    const [debugInfo, setDebugInfo] = useState<FilteredDebugData>({
        cpu: {},
        pia: {},
        Bus: {},
        clock: {},
    });
    const dataSyncRef = useRef<WorkerDataSync | null>(null);

    // Created during render so children can subscribe in their first effect.
    if (!dataSyncRef.current) {
        dataSyncRef.current = new WorkerDataSync(workerManager);
    }

    useEffect(() => {
        const dataSync = dataSyncRef.current!;
        const unsubscribeDebug = dataSync.subscribeToDebugInfo(setDebugInfo);

        return () => {
            unsubscribeDebug();
            dataSync.dispose();
            dataSyncRef.current = null;
        };
    }, [workerManager]);

    const subscribeToDebugInfo = useCallback((callback: (data: FilteredDebugData) => void) => {
        return dataSyncRef.current ? dataSyncRef.current.subscribeToDebugInfo(callback) : () => {};
    }, []);

    const setDebuggerActive = useCallback((active: boolean) => {
        dataSyncRef.current?.setDebuggerActive(active);
    }, []);

    const refreshDebugInfo = useCallback(async () => {
        await dataSyncRef.current?.refreshDebugInfo();
    }, []);

    const value: WorkerDataContextType = useMemo(
        () => ({ debugInfo, subscribeToDebugInfo, setDebuggerActive, refreshDebugInfo }),
        [debugInfo, subscribeToDebugInfo, setDebuggerActive, refreshDebugInfo],
    );

    return <WorkerDataContext.Provider value={value}>{children}</WorkerDataContext.Provider>;
};
