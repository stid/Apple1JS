import { useCallback, useMemo } from 'react';
import { WorkerManager } from '../../services/WorkerManager';
import { useWorkerState, UseWorkerStateOptions } from './useWorkerState';

/**
 * Options specific to breakpoints
 */
export interface UseWorkerBreakpointsOptions extends Omit<UseWorkerStateOptions<number[]>, 'initialValue' | 'transform'> {
    /**
     * Polling interval for breakpoints (default: 2000ms)
     */
    pollInterval?: number;
}

/**
 * Result of the useWorkerBreakpoints hook
 */
export interface UseWorkerBreakpointsResult {
    /**
     * Array of breakpoint addresses
     */
    breakpoints: number[];
    
    /**
     * Set of breakpoint addresses for fast lookup
     */
    breakpointSet: Set<number>;
    
    /**
     * Check if an address has a breakpoint
     */
    hasBreakpoint: (address: number) => boolean;
    
    /**
     * Toggle a breakpoint at the given address
     */
    toggleBreakpoint: (address: number) => Promise<void>;
    
    /**
     * Set a breakpoint at the given address
     */
    setBreakpoint: (address: number) => Promise<void>;
    
    /**
     * Clear a breakpoint at the given address
     */
    clearBreakpoint: (address: number) => Promise<void>;
    
    /**
     * Clear all breakpoints
     */
    clearAllBreakpoints: () => Promise<void>;
    
    /**
     * Loading state
     */
    loading: boolean;
    
    /**
     * Error state
     */
    error: Error | null;
    
    /**
     * Manually refresh breakpoints
     */
    refresh: () => Promise<void>;
}

/**
 * Hook for managing worker breakpoints with convenient helper functions
 * 
 * @param workerManager - The worker manager instance
 * @param options - Configuration options
 * @returns The breakpoints state and control functions
 */
export function useWorkerBreakpoints(
    workerManager: WorkerManager,
    options: UseWorkerBreakpointsOptions = {}
): UseWorkerBreakpointsResult {
    const { pollInterval = 2000, ...restOptions } = options;
    
    const { data, loading, error, refresh, setOptimistic } = useWorkerState<number[]>(
        workerManager,
        
        // Fetcher
        async (manager) => {
            const breakpoints = await manager.getBreakpoints();
            if (!breakpoints) {
                return [];
            }
            return breakpoints;
        },
        
        // No subscriber for now
        undefined,
        
        // Options
        {
            ...restOptions,
            initialValue: [],
            pollInterval,
            enablePolling: true
        }
    );
    
    const breakpoints = useMemo(() => data || [], [data]);
    
    // Create a Set for fast lookup
    const breakpointSet = useMemo(() => {
        return new Set(breakpoints);
    }, [breakpoints]);
    
    // Check if address has breakpoint
    const hasBreakpoint = useCallback((address: number) => {
        return breakpointSet.has(address);
    }, [breakpointSet]);
    
    // Toggle breakpoint
    const toggleBreakpoint = useCallback(async (address: number) => {
        const hasBreakpointNow = breakpointSet.has(address);
        
        // Optimistic update
        if (hasBreakpointNow) {
            setOptimistic(breakpoints.filter(bp => bp !== address));
        } else {
            setOptimistic([...breakpoints, address]);
        }
        
        try {
            // Send to worker
            if (hasBreakpointNow) {
                await workerManager.clearBreakpoint(address);
            } else {
                await workerManager.setBreakpoint(address);
            }
            
            // Refresh to get actual state
            await refresh();
        } catch (error) {
            // Revert optimistic update on error
            await refresh();
            throw error;
        }
    }, [workerManager, breakpoints, breakpointSet, setOptimistic, refresh]);
    
    // Set breakpoint
    const setBreakpoint = useCallback(async (address: number) => {
        if (breakpointSet.has(address)) {
            return; // Already set
        }
        
        // Optimistic update
        setOptimistic([...breakpoints, address]);
        
        try {
            // Send to worker
            await workerManager.setBreakpoint(address);
            
            // Refresh to get actual state
            await refresh();
        } catch (error) {
            // Revert optimistic update on error
            await refresh();
            throw error;
        }
    }, [workerManager, breakpoints, breakpointSet, setOptimistic, refresh]);
    
    // Clear breakpoint
    const clearBreakpoint = useCallback(async (address: number) => {
        if (!breakpointSet.has(address)) {
            return; // Not set
        }
        
        // Optimistic update
        setOptimistic(breakpoints.filter(bp => bp !== address));
        
        try {
            // Send to worker
            await workerManager.clearBreakpoint(address);
            
            // Refresh to get actual state
            await refresh();
        } catch (error) {
            // Revert optimistic update on error
            await refresh();
            throw error;
        }
    }, [workerManager, breakpoints, breakpointSet, setOptimistic, refresh]);
    
    // Clear all breakpoints
    const clearAllBreakpoints = useCallback(async () => {
        // Optimistic update
        setOptimistic([]);
        
        try {
            // Send to worker
            await workerManager.clearAllBreakpoints();
            
            // Refresh to get actual state
            await refresh();
        } catch (error) {
            // Revert optimistic update on error
            await refresh();
            throw error;
        }
    }, [workerManager, setOptimistic, refresh]);
    
    return {
        breakpoints,
        breakpointSet,
        hasBreakpoint,
        toggleBreakpoint,
        setBreakpoint,
        clearBreakpoint,
        clearAllBreakpoints,
        loading,
        error,
        refresh
    };
}