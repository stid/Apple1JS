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
    
    // Store all mutable values in refs to avoid stale closures
    const refs = useRef({
        mounted: true,
        cache: cache ? { data: initialValue, timestamp: Date.now() } : null,
        intervalId: null as number | null,
        unsubscribe: null as (() => void) | null
    });
    
    // Track mount state
    useEffect(() => {
        refs.current.mounted = true;
        return () => {
            refs.current.mounted = false;
        };
    }, []);
    
    // Fetch data function
    const fetchData = useCallback(async () => {
        if (!refs.current.mounted) return;
        
        try {
            setLoading(true);
            setError(null);
            
            const rawData = await fetcher(workerManager);
            const processedData = transform ? transform(rawData) : rawData;
            
            if (refs.current.mounted) {
                setData(processedData);
                
                // Update cache
                if (cache && refs.current.cache) {
                    refs.current.cache = {
                        data: processedData,
                        timestamp: Date.now()
                    };
                }
            }
        } catch (err) {
            const error = err as Error;
            if (refs.current.mounted) {
                setError(error);
                if (onError) {
                    onError(error);
                } else {
                    loggingService.error('useWorkerState', `Failed to fetch data: ${error.message}`);
                }
            }
        } finally {
            if (refs.current.mounted) {
                setLoading(false);
            }
        }
    }, [workerManager, fetcher, transform, cache, onError]);
    
    // Manual refresh
    const refresh = useCallback(async () => {
        await fetchData();
    }, [fetchData]);
    
    // Optimistic update
    const setOptimistic = useCallback((value: T) => {
        setData(value);
        if (cache && refs.current.cache) {
            refs.current.cache = {
                data: value,
                timestamp: Date.now()
            };
        }
    }, [cache]);
    
    // Main effect for fetching and subscriptions
    useEffect(() => {
        let cancelled = false;
        
        // Async setup function
        (async () => {
            // Set up subscription if provided
            if (subscriber && !cancelled) {
                try {
                    const cleanup = await subscriber(workerManager, (newData) => {
                        if (cancelled || !refs.current.mounted) return;
                        
                        const processedData = transform ? transform(newData) : newData;
                        setData(processedData);
                        
                        if (cache && refs.current.cache) {
                            refs.current.cache = {
                                data: processedData,
                                timestamp: Date.now()
                            };
                        }
                    });
                    
                    if (cleanup && typeof cleanup === 'function' && !cancelled) {
                        refs.current.unsubscribe = cleanup;
                    }
                } catch (err) {
                    if (!cancelled && refs.current.mounted) {
                        const error = err as Error;
                        setError(error);
                        if (onError) {
                            onError(error);
                        }
                    }
                }
            }
            
            // Initial fetch
            if (!cancelled && refs.current.mounted) {
                await fetchData();
            }
            
            // Set up polling
            if (enablePolling && pollInterval && pollInterval > 0 && !cancelled) {
                refs.current.intervalId = window.setInterval(() => {
                    if (refs.current.mounted) {
                        fetchData();
                    }
                }, pollInterval);
            }
        })();
        
        // Cleanup
        return () => {
            cancelled = true;
            
            // Clear interval
            if (refs.current.intervalId) {
                clearInterval(refs.current.intervalId);
                refs.current.intervalId = null;
            }
            
            // Unsubscribe
            if (refs.current.unsubscribe) {
                refs.current.unsubscribe();
                refs.current.unsubscribe = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        workerManager,
        fetcher,
        subscriber,
        enablePolling,
        pollInterval,
        transform,
        cache,
        onError,
        ...dependencies
    ]);
    
    return {
        data,
        loading,
        error,
        refresh,
        setOptimistic
    };
}