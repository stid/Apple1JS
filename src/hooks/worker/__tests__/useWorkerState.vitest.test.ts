import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useWorkerState } from '../useWorkerState';
import { WorkerManager } from '../../../services/WorkerManager';
import { loggingService } from '../../../services/LoggingService';

// Mock the logging service
vi.mock('../../../services/LoggingService', () => ({
    loggingService: {
        error: vi.fn()
    }
}));

describe('useWorkerState', () => {
    let mockWorkerManager: WorkerManager;
    let mockFetcher: ReturnType<typeof vi.fn>;
    let mockSubscriber: ReturnType<typeof vi.fn>;
    
    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();
        vi.useFakeTimers();
        
        // Create mock WorkerManager
        mockWorkerManager = {} as WorkerManager;
        
        // Create mock functions
        mockFetcher = vi.fn();
        mockSubscriber = vi.fn();
    });
    
    afterEach(() => {
        vi.useRealTimers();
    });
    
    it('should return initial value and loading state', async () => {
        const initialValue = { test: 'data' };
        mockFetcher.mockResolvedValue(initialValue);
        
        const { result } = renderHook(() => 
            useWorkerState(
                mockWorkerManager,
                mockFetcher,
                undefined,
                { initialValue }
            )
        );
        
        // Initially should have the initial value and not be loading
        expect(result.current.data).toEqual(initialValue);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe(null);
        
        // After setup effect runs, it should start loading
        await waitFor(() => {
            expect(mockFetcher).toHaveBeenCalled();
        });
    });
    
    it('should fetch data on mount', async () => {
        const fetchedData = { test: 'fetched' };
        mockFetcher.mockResolvedValue(fetchedData);
        
        const { result } = renderHook(() => 
            useWorkerState(mockWorkerManager, mockFetcher)
        );
        
        // Should be loading initially
        expect(result.current.loading).toBe(true);
        
        // Wait for fetch to complete
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });
        
        expect(mockFetcher).toHaveBeenCalledWith(mockWorkerManager);
        expect(result.current.data).toEqual(fetchedData);
        expect(result.current.error).toBe(null);
    });
    
    it('should handle fetch errors', async () => {
        const error = new Error('Fetch failed');
        mockFetcher.mockRejectedValue(error);
        
        const { result } = renderHook(() => 
            useWorkerState(mockWorkerManager, mockFetcher)
        );
        
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });
        
        expect(result.current.data).toBeUndefined();
        expect(result.current.error).toEqual(error);
        expect(loggingService.error).toHaveBeenCalledWith(
            'useWorkerState',
            'Failed to fetch data: Fetch failed'
        );
    });
    
    it('should call custom error handler', async () => {
        const error = new Error('Custom error');
        const onError = vi.fn();
        mockFetcher.mockRejectedValue(error);
        
        renderHook(() => 
            useWorkerState(
                mockWorkerManager,
                mockFetcher,
                undefined,
                { onError }
            )
        );
        
        await waitFor(() => {
            expect(onError).toHaveBeenCalledWith(error);
        });
        
        // Should not log when custom handler is provided
        expect(loggingService.error).not.toHaveBeenCalled();
    });
    
    it('should transform data', async () => {
        const rawData = { value: 42 };
        const transform = (data: unknown) => {
            const typedData = data as { value: number };
            return { transformed: typedData.value * 2 };
        };
        mockFetcher.mockResolvedValue(rawData);
        
        const { result } = renderHook(() => 
            useWorkerState(
                mockWorkerManager,
                mockFetcher,
                undefined,
                { transform }
            )
        );
        
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });
        
        expect(result.current.data).toEqual({ transformed: 84 });
    });
    
    it('should set up polling with interval', async () => {
        const fetchedData = { count: 1 };
        mockFetcher.mockResolvedValue(fetchedData);
        
        renderHook(() => 
            useWorkerState(
                mockWorkerManager,
                mockFetcher,
                undefined,
                { pollInterval: 1000 }
            )
        );
        
        // Wait for initial fetch
        await waitFor(() => {
            expect(mockFetcher).toHaveBeenCalledTimes(1);
        });
        
        // Advance timer for polling
        await act(async () => {
            vi.advanceTimersByTime(1000);
        });
        
        await waitFor(() => {
            expect(mockFetcher).toHaveBeenCalledTimes(2);
        });
        
        // Advance again
        await act(async () => {
            vi.advanceTimersByTime(1000);
        });
        
        await waitFor(() => {
            expect(mockFetcher).toHaveBeenCalledTimes(3);
        });
    });
    
    it('should handle manual refresh', async () => {
        const fetchedData = { test: 'refreshed' };
        mockFetcher.mockResolvedValue(fetchedData);
        
        const { result } = renderHook(() => 
            useWorkerState(mockWorkerManager, mockFetcher)
        );
        
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });
        
        expect(mockFetcher).toHaveBeenCalledTimes(1);
        
        // Manual refresh
        await act(async () => {
            await result.current.refresh();
        });
        
        expect(mockFetcher).toHaveBeenCalledTimes(2);
    });
    
    it('should handle optimistic updates', async () => {
        const initialData = { value: 1 };
        mockFetcher.mockResolvedValue(initialData);
        
        const { result } = renderHook(() => 
            useWorkerState(mockWorkerManager, mockFetcher)
        );
        
        await waitFor(() => {
            expect(result.current.data).toEqual(initialData);
        });
        
        // Optimistic update
        act(() => {
            result.current.setOptimistic({ value: 2 });
        });
        
        expect(result.current.data).toEqual({ value: 2 });
    });
    
    it('should set up subscription when provided', async () => {
        const unsubscribe = vi.fn();
        mockSubscriber.mockResolvedValue(unsubscribe);
        mockFetcher.mockResolvedValue({ test: 'data' });
        
        const { unmount } = renderHook(() => 
            useWorkerState(
                mockWorkerManager,
                mockFetcher,
                mockSubscriber
            )
        );
        
        await waitFor(() => {
            expect(mockSubscriber).toHaveBeenCalled();
        });
        
        // Verify callback parameter
        const callback = mockSubscriber.mock.calls[0][1];
        expect(typeof callback).toBe('function');
        
        // Cleanup should call unsubscribe
        unmount();
        await waitFor(() => {
            expect(unsubscribe).toHaveBeenCalled();
        });
    });
    
    it('should update data through subscription callback', async () => {
        const subscriberData = { test: 'from subscriber' };
        let capturedCallback: ((data: { test: string }) => void) | null = null;
        
        mockSubscriber.mockImplementation(async (_manager: unknown, callback: (data: { test: string }) => void) => {
            capturedCallback = callback;
            return vi.fn();
        });
        
        mockFetcher.mockResolvedValue({ test: 'initial' });
        
        const { result } = renderHook(() => 
            useWorkerState(
                mockWorkerManager,
                mockFetcher,
                mockSubscriber
            )
        );
        
        await waitFor(() => {
            expect(capturedCallback).not.toBe(null);
        });
        
        // Simulate subscription update
        act(() => {
            capturedCallback!(subscriberData);
        });
        
        expect(result.current.data).toEqual(subscriberData);
    });
    
    it('should not update state after unmount', async () => {
        const fetchedData = { test: 'data' };
        let resolvePromise: ((value: { test: string }) => void) | null = null;
        
        mockFetcher.mockImplementation(() => new Promise<{ test: string }>(resolve => {
            resolvePromise = resolve;
        }));
        
        const { result, unmount } = renderHook(() => 
            useWorkerState(mockWorkerManager, mockFetcher)
        );
        
        expect(result.current.loading).toBe(true);
        
        // Unmount before fetch completes
        unmount();
        
        // Resolve fetch after unmount
        act(() => {
            resolvePromise!(fetchedData);
        });
        
        // State should not update (would throw if it tried)
        expect(result.current.loading).toBe(true);
    });
    
    it('should handle subscription errors', async () => {
        const error = new Error('Subscription failed');
        const onError = vi.fn();
        mockSubscriber.mockRejectedValue(error);
        mockFetcher.mockResolvedValue({ test: 'data' });
        
        const { result } = renderHook(() => 
            useWorkerState(
                mockWorkerManager,
                mockFetcher,
                mockSubscriber,
                { onError }
            )
        );
        
        await waitFor(() => {
            expect(result.current.error).toEqual(error);
        });
        
        expect(onError).toHaveBeenCalledWith(error);
    });
    
    it('should cleanup polling on unmount', async () => {
        mockFetcher.mockResolvedValue({ test: 'data' });
        
        const { unmount } = renderHook(() => 
            useWorkerState(
                mockWorkerManager,
                mockFetcher,
                undefined,
                { pollInterval: 1000 }
            )
        );
        
        const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
        
        // Wait for initial setup
        await waitFor(() => {
            expect(mockFetcher).toHaveBeenCalled();
        });
        
        unmount();
        
        expect(clearIntervalSpy).toHaveBeenCalled();
    });
    
    it('should re-subscribe when dependencies change', async () => {
        mockFetcher.mockResolvedValue({ test: 'data' });
        
        const { rerender } = renderHook(
            ({ dep }) => useWorkerState(
                mockWorkerManager,
                mockFetcher,
                mockSubscriber,
                { dependencies: [dep] }
            ),
            { initialProps: { dep: 'initial' } }
        );
        
        await waitFor(() => {
            expect(mockSubscriber).toHaveBeenCalledTimes(1);
        });
        
        // Change dependency
        rerender({ dep: 'changed' });
        
        await waitFor(() => {
            expect(mockSubscriber).toHaveBeenCalledTimes(2);
        });
    });
});