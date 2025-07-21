import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useWorkerState } from '../useWorkerState';
import { WorkerManager } from '../../../services/WorkerManager';

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
        
        // Create mock functions that resolve immediately
        mockFetcher = vi.fn().mockResolvedValue({ default: 'data' });
        mockSubscriber = vi.fn();
    });
    
    afterEach(() => {
        vi.useRealTimers();
    });
    
    it('should return initial value and loading state', async () => {
        const initialValue = { test: 'data' };
        const fetchedValue = { test: 'fetched' };
        mockFetcher.mockResolvedValue(fetchedValue);
        
        const { result } = renderHook(() => 
            useWorkerState(
                mockWorkerManager,
                mockFetcher,
                undefined,
                { initialValue }
            )
        );
        
        // Initially should have the initial value
        expect(result.current.data).toEqual(initialValue);
        expect(result.current.error).toBe(null);
        
        // Wait for all async operations to complete
        await act(async () => {
            await vi.runAllTimersAsync();
        });
        
        // After fetch completes, should have new data
        expect(result.current.data).toEqual(fetchedValue);
        expect(result.current.loading).toBe(false);
        expect(mockFetcher).toHaveBeenCalled();
    });
    
    it('should fetch data on mount', async () => {
        const fetchedData = { test: 'fetched' };
        mockFetcher.mockResolvedValue(fetchedData);
        
        const { result } = renderHook(() => 
            useWorkerState(mockWorkerManager, mockFetcher)
        );
        
        // Initially no data
        expect(result.current.data).toBeUndefined();
        
        // Wait for all async operations
        await act(async () => {
            await vi.runAllTimersAsync();
        });
        
        // After fetch completes
        expect(result.current.loading).toBe(false);
        expect(result.current.data).toEqual(fetchedData);
        expect(result.current.error).toBe(null);
        expect(mockFetcher).toHaveBeenCalledWith(mockWorkerManager);
    });
    
    it('should handle fetch errors', async () => {
        const error = new Error('Fetch failed');
        mockFetcher.mockRejectedValue(error);
        
        const { result } = renderHook(() => 
            useWorkerState(mockWorkerManager, mockFetcher)
        );
        
        // Wait for all async operations
        await act(async () => {
            await vi.runAllTimersAsync();
        });
        
        // Should have error state
        expect(result.current.error).toEqual(error);
        expect(result.current.loading).toBe(false);
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
        
        // Wait for all async operations
        await act(async () => {
            await vi.runAllTimersAsync();
        });
        
        // Error handler should be called
        expect(onError).toHaveBeenCalledWith(error);
    });
    
    it('should transform data', async () => {
        const rawData = { value: 42 };
        const transform = (data: unknown) => {
            const typed = data as { value: number };
            return { transformed: typed.value * 2 };
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
        
        // Wait for all async operations
        await act(async () => {
            await vi.runAllTimersAsync();
        });
        
        // Should have transformed data
        expect(result.current.data).toEqual({ transformed: 84 });
    });
    
    it('should set up polling with interval', async () => {
        const fetchedData = { count: 1 };
        let callCount = 0;
        mockFetcher.mockImplementation(async () => {
            callCount++;
            return fetchedData;
        });
        
        renderHook(() => 
            useWorkerState(
                mockWorkerManager,
                mockFetcher,
                undefined,
                { pollInterval: 1000, enablePolling: true }
            )
        );
        
        // Wait for initial fetch
        await act(async () => {
            await vi.runOnlyPendingTimersAsync();
        });
        
        // Store initial call count
        const initialCount = callCount;
        expect(initialCount).toBeGreaterThan(0);
        
        // Advance time by polling interval multiple times
        for (let i = 0; i < 3; i++) {
            act(() => {
                vi.advanceTimersByTime(1000);
            });
            
            // Wait for the polling fetch to complete
            await act(async () => {
                await vi.runOnlyPendingTimersAsync();
            });
        }
        
        // Should have made additional calls due to polling
        expect(callCount).toBeGreaterThan(initialCount);
        expect(callCount).toBeGreaterThanOrEqual(initialCount + 3);
    });
    
    it('should handle manual refresh', async () => {
        const fetchedData = { test: 'refreshed' };
        mockFetcher.mockResolvedValue(fetchedData);
        
        const { result } = renderHook(() => 
            useWorkerState(mockWorkerManager, mockFetcher)
        );
        
        // Wait for initial fetch
        await act(async () => {
            await vi.runAllTimersAsync();
        });
        
        expect(mockFetcher).toHaveBeenCalledTimes(1);
        
        // Call refresh
        await act(async () => {
            await result.current.refresh();
        });
        
        expect(mockFetcher).toHaveBeenCalledTimes(2);
        expect(result.current.data).toEqual(fetchedData);
    });
    
    it('should handle optimistic updates', async () => {
        const initialData = { value: 1 };
        mockFetcher.mockResolvedValue(initialData);
        
        const { result } = renderHook(() => 
            useWorkerState(mockWorkerManager, mockFetcher)
        );
        
        // Wait for initial fetch
        await act(async () => {
            await vi.runAllTimersAsync();
        });
        
        expect(result.current.data).toEqual(initialData);
        
        // Optimistic update
        const optimisticData = { value: 2 };
        act(() => {
            result.current.setOptimistic(optimisticData);
        });
        
        expect(result.current.data).toEqual(optimisticData);
    });
    
    it('should set up subscription when provided', async () => {
        const initialData = { test: 'initial' };
        mockFetcher.mockResolvedValue(initialData);
        
        const unsubscribe = vi.fn();
        mockSubscriber.mockResolvedValue(unsubscribe);
        
        renderHook(() => 
            useWorkerState(
                mockWorkerManager,
                mockFetcher,
                mockSubscriber
            )
        );
        
        // Wait for all async operations
        await act(async () => {
            await vi.runAllTimersAsync();
        });
        
        // Subscription should be set up
        expect(mockSubscriber).toHaveBeenCalledWith(
            mockWorkerManager,
            expect.any(Function)
        );
    });
    
    it('should update data through subscription callback', async () => {
        const initialData = { test: 'initial' };
        const subscribedData = { test: 'subscribed' };
        mockFetcher.mockResolvedValue(initialData);
        
        let capturedCallback: ((data: unknown) => void) | null = null;
        mockSubscriber.mockImplementation(async (_manager, callback) => {
            capturedCallback = callback;
            return () => {};
        });
        
        const { result } = renderHook(() => 
            useWorkerState(
                mockWorkerManager,
                mockFetcher,
                mockSubscriber
            )
        );
        
        // Wait for initial setup
        await act(async () => {
            await vi.runAllTimersAsync();
        });
        
        expect(result.current.data).toEqual(initialData);
        expect(capturedCallback).not.toBeNull();
        
        // Update through subscription
        act(() => {
            capturedCallback?.(subscribedData);
        });
        
        expect(result.current.data).toEqual(subscribedData);
    });
    
    it('should not update state after unmount', async () => {
        const initialData = { test: 'initial' };
        const newData = { test: 'new' };
        mockFetcher.mockResolvedValue(initialData);
        
        let capturedCallback: ((data: unknown) => void) | null = null;
        mockSubscriber.mockImplementation(async (_manager, callback) => {
            capturedCallback = callback;
            return () => {};
        });
        
        const { result, unmount } = renderHook(() => 
            useWorkerState(
                mockWorkerManager,
                mockFetcher,
                mockSubscriber
            )
        );
        
        // Wait for initial setup
        await act(async () => {
            await vi.runAllTimersAsync();
        });
        
        expect(result.current.data).toEqual(initialData);
        expect(capturedCallback).not.toBeNull();
        
        // Unmount the component
        unmount();
        
        // Try to update after unmount - should not throw
        act(() => {
            capturedCallback?.(newData);
        });
        
        // Data should still be the initial data (not updated)
        expect(result.current.data).toEqual(initialData);
    });
    
    it('should handle subscription errors', async () => {
        const error = new Error('Subscription failed');
        const onError = vi.fn();
        mockFetcher.mockResolvedValue({ test: 'data' });
        mockSubscriber.mockRejectedValue(error);
        
        renderHook(() => 
            useWorkerState(
                mockWorkerManager,
                mockFetcher,
                mockSubscriber,
                { onError }
            )
        );
        
        // Wait for all async operations
        await act(async () => {
            await vi.runAllTimersAsync();
        });
        
        // Error handler should be called
        expect(onError).toHaveBeenCalledWith(error);
    });
    
    it('should cleanup polling on unmount', async () => {
        mockFetcher.mockResolvedValue({ test: 'data' });
        
        const { unmount } = renderHook(() => 
            useWorkerState(
                mockWorkerManager,
                mockFetcher,
                undefined,
                { pollInterval: 1000, enablePolling: true }
            )
        );
        
        // Wait for initial fetch only
        await act(async () => {
            await vi.runOnlyPendingTimersAsync();
        });
        
        // Get the initial call count (might be 1 or 2 due to React StrictMode)
        const initialCallCount = mockFetcher.mock.calls.length;
        expect(initialCallCount).toBeGreaterThan(0);
        
        // Unmount before next poll
        unmount();
        
        // Advance timer - should not fetch again
        act(() => {
            vi.advanceTimersByTime(2000);
        });
        
        // Run any pending timers - there shouldn't be any
        await act(async () => {
            await vi.runOnlyPendingTimersAsync();
        });
        
        // Should still have the same number of calls
        expect(mockFetcher).toHaveBeenCalledTimes(initialCallCount);
    });
    
    it('should re-subscribe when dependencies change', async () => {
        mockFetcher.mockResolvedValue({ test: 'data' });
        
        const unsubscribe1 = vi.fn();
        const unsubscribe2 = vi.fn();
        let callCount = 0;
        
        mockSubscriber.mockImplementation(async () => {
            callCount++;
            return callCount === 1 ? unsubscribe1 : unsubscribe2;
        });
        
        const { rerender } = renderHook(
            ({ dep }) => useWorkerState(
                mockWorkerManager,
                mockFetcher,
                mockSubscriber,
                { dependencies: [dep] }
            ),
            { initialProps: { dep: 'initial' } }
        );
        
        // Wait for initial subscription
        await act(async () => {
            await vi.runAllTimersAsync();
        });
        
        expect(mockSubscriber).toHaveBeenCalledTimes(1);
        
        // Change dependency
        rerender({ dep: 'changed' });
        
        // Wait for re-subscription
        await act(async () => {
            await vi.runAllTimersAsync();
        });
        
        expect(unsubscribe1).toHaveBeenCalled();
        expect(mockSubscriber).toHaveBeenCalledTimes(2);
    });
});