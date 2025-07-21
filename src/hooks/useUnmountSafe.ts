import { useRef, useCallback, useEffect } from 'react';

/**
 * Hook that provides unmount-safe utilities for async operations
 */
export function useUnmountSafe() {
    const mountedRef = useRef(true);
    const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

    useEffect(() => {
        mountedRef.current = true;
        // Capture the current timeouts set to avoid the ref warning
        const timeouts = timeoutsRef.current;
        return () => {
            mountedRef.current = false;
            // Clear all pending timeouts on unmount
            timeouts.forEach(timeout => clearTimeout(timeout));
            timeouts.clear();
        };
    }, []);

    const isMounted = useCallback(() => mountedRef.current, []);

    const safeSetTimeout = useCallback((callback: () => void, delay: number) => {
        if (!mountedRef.current) return;

        const timeout = setTimeout(() => {
            timeoutsRef.current.delete(timeout);
            if (mountedRef.current) {
                callback();
            }
        }, delay);

        timeoutsRef.current.add(timeout);
        return timeout;
    }, []);

    const clearSafeTimeout = useCallback((timeout: ReturnType<typeof setTimeout> | undefined) => {
        if (timeout) {
            clearTimeout(timeout);
            timeoutsRef.current.delete(timeout);
        }
    }, []);

    return {
        isMounted,
        safeSetTimeout,
        clearSafeTimeout
    };
}