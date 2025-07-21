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
    
    // Initialize state
    const [data, setData] = useState<T | undefined>(initialValue);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    
    // Track mounted state to prevent state updates after unmount
    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);
    
    // Cache storage
    const cacheRef = useRef<{ data: T; timestamp: number } | null>(
        cache && initialValue !== undefined 
            ? { data: initialValue, timestamp: Date.now() } 
            : null
    );
    
    // Store functions in refs for stable references
    const fetcherRef = useRef(fetcher);
    const transformRef = useRef(transform);
    const onErrorRef = useRef(onError);
    
    // Update refs when props change
    useEffect(() => {
        fetcherRef.current = fetcher;
        transformRef.current = transform;
        onErrorRef.current = onError;
    });
    
    // Create a ref to hold the refresh function
    const refreshRef = useRef<(() => Promise<void>) | null>(null);
    
    // Stable refresh function
    const refresh = useCallback(async () => {
        if (!mountedRef.current) return;
        
        try {
            setLoading(true);
            setError(null);
            
            const rawData = await fetcherRef.current(workerManager);
            const processedData = transformRef.current ? transformRef.current(rawData) : rawData;
            
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
                if (onErrorRef.current) {
                    onErrorRef.current(error);
                } else {
                    loggingService.error('useWorkerState', `Failed to fetch data: ${error.message}`);
                }
            }
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    }, [workerManager, cache]);
    
    // Update the refresh ref
    refreshRef.current = refresh;
    
    // Optimistic update function
    const setOptimistic = useCallback((value: T) => {
        setData(value);
        if (cache) {
            cacheRef.current = {
                data: value,
                timestamp: Date.now()
            };
        }
    }, [cache]);
    
    // Effect for subscriptions, initial fetch, and polling
    useEffect(() => {
        let active = true;
        let intervalId: ReturnType<typeof setInterval> | undefined;
        let unsubscribe: (() => void) | undefined;
        
        const setupAsync = async () => {
            // Set up subscription if provided
            if (subscriber && active && mountedRef.current) {
                try {
                    const cleanup = await subscriber(workerManager, (newData) => {
                        if (!active || !mountedRef.current) return;
                        
                        const processedData = transformRef.current ? transformRef.current(newData) : newData;
                        setData(processedData);
                        
                        if (cache) {
                            cacheRef.current = {
                                data: processedData,
                                timestamp: Date.now()
                            };
                        }
                    });
                    
                    if (cleanup && typeof cleanup === 'function') {
                        unsubscribe = cleanup;
                    }
                } catch (err) {
                    if (active && mountedRef.current) {
                        const error = err as Error;
                        setError(error);
                        if (onErrorRef.current) {
                            onErrorRef.current(error);
                        }
                    }
                }
            }
            
            // Perform initial fetch
            if (active && mountedRef.current && refreshRef.current) {
                await refreshRef.current();
            }
            
            // Set up polling if enabled
            if (enablePolling && pollInterval && active && mountedRef.current) {
                intervalId = setInterval(() => {
                    if (active && mountedRef.current && refreshRef.current) {
                        refreshRef.current();
                    }
                }, pollInterval);
            }
        };
        
        // Run the async setup
        setupAsync();
        
        // Cleanup function
        return () => {
            active = false;
            if (intervalId !== undefined) {
                clearInterval(intervalId);
            }
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [
        workerManager,
        subscriber,
        enablePolling,
        pollInterval,
        cache,
        // eslint-disable-next-line react-hooks/exhaustive-deps
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