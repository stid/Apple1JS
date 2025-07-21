import { useEffect, useState, useCallback, useRef, DependencyList } from 'react';
import { WorkerManager } from '../../services/WorkerManager';
import { loggingService } from '../../services/LoggingService';

/**
 * Options for configuring the useWorkerState hook
 */
export interface UseWorkerStateOptions<T> {
    /**
     * Initial value for the state
     */
    initialValue?: T;
    
    /**
     * Polling interval in milliseconds (if applicable)
     */
    pollInterval?: number;
    
    /**
     * Whether to enable polling (default: true if pollInterval is provided)
     */
    enablePolling?: boolean;
    
    /**
     * Whether to cache the data
     */
    cache?: boolean;
    
    /**
     * Custom error handler
     */
    onError?: (error: Error) => void;
    
    /**
     * Transform the data before setting state
     */
    transform?: (data: unknown) => T;
    
    /**
     * Dependencies that should trigger re-subscription
     */
    dependencies?: DependencyList;
}

/**
 * Result of the useWorkerState hook
 */
export interface UseWorkerStateResult<T> {
    /**
     * The current state value
     */
    data: T | undefined;
    
    /**
     * Loading state
     */
    loading: boolean;
    
    /**
     * Error state
     */
    error: Error | null;
    
    /**
     * Manually refresh the data
     */
    refresh: () => Promise<void>;
    
    /**
     * Update the local state optimistically
     */
    setOptimistic: (value: T) => void;
}

/**
 * Generic hook for managing worker state with polling and subscription support
 * 
 * @param workerManager - The worker manager instance
 * @param fetcher - Function to fetch data from the worker
 * @param subscriber - Optional function to subscribe to updates
 * @param options - Configuration options
 * @returns The worker state and control functions
 */
export function useWorkerState<T>(
    workerManager: WorkerManager,
    fetcher: (manager: WorkerManager) => Promise<T>,
    subscriber?: (manager: WorkerManager, callback: (data: T) => void) => Promise<(() => void) | void>,
    options: UseWorkerStateOptions<T> = {}
): UseWorkerStateResult<T> {
    const {
        initialValue,
        pollInterval,
        enablePolling = !!pollInterval,
        cache = true,
        onError,
        transform,
        dependencies = []
    } = options;
    
    const [data, setData] = useState<T | undefined>(initialValue);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    
    // Refs for cleanup and state management
    const mountedRef = useRef(true);
    const intervalRef = useRef<number | null>(null);
    const unsubscribeRef = useRef<(() => void) | null>(null);
    const cacheRef = useRef<{ data: T; timestamp: number } | null>(null);
    
    // Store latest values in refs to use in callbacks
    const stateRef = useRef({ workerManager, fetcher, subscriber, transform, onError, cache });
    
    // Update ref on every render
    stateRef.current = { workerManager, fetcher, subscriber, transform, onError, cache };
    
    // Track mount state
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);
    
    // Stable fetch function that uses refs
    const fetchData = useCallback(async () => {
        if (!mountedRef.current) return;
        
        const { workerManager, fetcher, transform, onError, cache } = stateRef.current;
        
        try {
            setLoading(true);
            setError(null);
            
            const rawData = await fetcher(workerManager);
            const processedData = transform ? transform(rawData) : rawData;
            
            if (mountedRef.current) {
                setData(processedData);
                
                // Update cache
                if (cache) {
                    cacheRef.current = {
                        data: processedData,
                        timestamp: Date.now()
                    };
                }
            }
        } catch (err) {
            const error = err as Error;
            if (mountedRef.current) {
                setError(error);
                if (onError) {
                    onError(error);
                } else {
                    loggingService.error('useWorkerState', `Failed to fetch data: ${error.message}`);
                }
            }
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    }, []); // No dependencies - uses refs instead
    
    // Manual refresh function
    const refresh = useCallback(async () => {
        await fetchData();
    }, [fetchData]);
    
    // Optimistic update function
    const setOptimistic = useCallback((value: T) => {
        setData(value);
        const { cache } = stateRef.current;
        if (cache) {
            cacheRef.current = {
                data: value,
                timestamp: Date.now()
            };
        }
    }, []);
    
    // Set up subscription and/or polling
    useEffect(() => {
        let isCancelled = false;
        
        const setup = async () => {
            const { workerManager, subscriber } = stateRef.current;
            
            // Set up subscription if provided
            if (subscriber && !isCancelled) {
                try {
                    const unsubscribe = await subscriber(workerManager, (newData) => {
                        if (!mountedRef.current || isCancelled) return;
                        
                        const { transform, cache } = stateRef.current;
                        const processedData = transform ? transform(newData) : newData;
                        setData(processedData);
                        
                        if (cache) {
                            cacheRef.current = {
                                data: processedData,
                                timestamp: Date.now()
                            };
                        }
                    });
                    
                    if (unsubscribe && typeof unsubscribe === 'function' && !isCancelled) {
                        unsubscribeRef.current = unsubscribe;
                    }
                } catch (err) {
                    const error = err as Error;
                    if (mountedRef.current && !isCancelled) {
                        setError(error);
                        const { onError } = stateRef.current;
                        if (onError) {
                            onError(error);
                        }
                    }
                }
            }
            
            // Initial fetch
            if (!isCancelled) {
                await fetchData();
            }
            
            // Set up polling if enabled
            if (enablePolling && pollInterval && pollInterval > 0 && !isCancelled) {
                intervalRef.current = window.setInterval(() => {
                    if (!isCancelled && mountedRef.current) {
                        fetchData();
                    }
                }, pollInterval);
            }
        };
        
        setup();
        
        // Cleanup
        return () => {
            isCancelled = true;
            
            // Clear interval
            if (intervalRef.current !== null) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            
            // Unsubscribe
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchData, enablePolling, pollInterval, ...dependencies]);
    
    return {
        data,
        loading,
        error,
        refresh,
        setOptimistic
    };
}