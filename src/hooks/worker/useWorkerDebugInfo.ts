import { useMemo } from 'react';
import { WorkerManager } from '../../services/WorkerManager';
import { FilteredDebugData } from '../../apple1/types/worker-messages';
import { useWorkerState, UseWorkerStateOptions } from './useWorkerState';

/**
 * Options specific to debug info
 */
export interface UseWorkerDebugInfoOptions extends Omit<UseWorkerStateOptions<FilteredDebugData>, 'initialValue'> {
    /**
     * Whether the emulator is paused (affects polling rate)
     */
    isPaused?: boolean;
}

/**
 * Hook for managing worker debug info with automatic polling rate adjustment
 * 
 * @param workerManager - The worker manager instance
 * @param options - Configuration options
 * @returns The debug info state and control functions
 */
export function useWorkerDebugInfo(
    workerManager: WorkerManager,
    options: UseWorkerDebugInfoOptions = {}
) {
    const { isPaused = false, ...restOptions } = options;
    
    // Adjust polling interval based on pause state
    const pollInterval = useMemo(() => {
        if (restOptions.pollInterval !== undefined) {
            return restOptions.pollInterval;
        }
        // Default intervals: 100ms when paused, 250ms when running
        return isPaused ? 100 : 250;
    }, [isPaused, restOptions.pollInterval]);
    
    const initialValue: FilteredDebugData = {
        cpu: {},
        pia: {},
        Bus: {},
        clock: {}
    };
    
    return useWorkerState<FilteredDebugData>(
        workerManager,
        
        // Fetcher
        async (manager) => {
            const debugInfo = await manager.getDebugInfo();
            if (!debugInfo) {
                throw new Error('No debug info received from worker');
            }
            return debugInfo;
        },
        
        // Subscriber - if WorkerManager supports debug info subscriptions
        undefined, // We'll use polling for now as that's what the current system does
        
        // Options
        {
            ...restOptions,
            initialValue,
            pollInterval,
            enablePolling: true
        }
    );
}