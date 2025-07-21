import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useWorkerDebugInfo } from '../useWorkerDebugInfo';
import { WorkerManager } from '../../../services/WorkerManager';
import { FilteredDebugData } from '../../../apple1/types/worker-messages';
import * as useWorkerStateModule from '../useWorkerState';

// Spy on the module
vi.spyOn(useWorkerStateModule, 'useWorkerState');

describe('useWorkerDebugInfo', () => {
    let mockWorkerManager: WorkerManager;
    
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        
        // Create mock WorkerManager
        mockWorkerManager = {
            getDebugInfo: vi.fn()
        } as unknown as WorkerManager;
        
        // Mock useWorkerState implementation
        vi.mocked(useWorkerStateModule.useWorkerState).mockImplementation((_workerManager, _fetcher, _subscriber, options) => {
            const mockData: FilteredDebugData = (options?.initialValue as FilteredDebugData) || {
                cpu: { PC: 0x1234 },
                pia: {},
                Bus: {},
                clock: {}
            };
            
            return {
                data: mockData,
                loading: false,
                error: null,
                refresh: vi.fn(),
                setOptimistic: vi.fn()
            };
        });
    });
    
    afterEach(() => {
        vi.useRealTimers();
    });
    
    it('should provide initial debug info structure', () => {
        const { result } = renderHook(() => 
            useWorkerDebugInfo(mockWorkerManager)
        );
        
        expect(result.current.data).toHaveProperty('cpu');
        expect(result.current.data).toHaveProperty('pia');
        expect(result.current.data).toHaveProperty('Bus');
        expect(result.current.data).toHaveProperty('clock');
    });
    
    it('should use default polling interval when running', () => {
        renderHook(() => 
            useWorkerDebugInfo(mockWorkerManager, { isPaused: false })
        );
        
        const calls = vi.mocked(useWorkerStateModule.useWorkerState).mock.calls;
        const options = calls[calls.length - 1][3];
        expect(options?.pollInterval).toBe(250);
    });
    
    it('should use faster polling interval when paused', () => {
        renderHook(() => 
            useWorkerDebugInfo(mockWorkerManager, { isPaused: true })
        );
        
        const calls = vi.mocked(useWorkerStateModule.useWorkerState).mock.calls;
        const options = calls[calls.length - 1][3];
        expect(options?.pollInterval).toBe(100);
    });
    
    it('should respect custom polling interval', () => {
        renderHook(() => 
            useWorkerDebugInfo(mockWorkerManager, { 
                isPaused: true,
                pollInterval: 500 
            })
        );
        
        const calls = vi.mocked(useWorkerStateModule.useWorkerState).mock.calls;
        const options = calls[calls.length - 1][3];
        expect(options?.pollInterval).toBe(500);
    });
    
    it('should pass through other options', () => {
        const onError = vi.fn();
        
        renderHook(() => 
            useWorkerDebugInfo(mockWorkerManager, { 
                onError,
                cache: false
            })
        );
        
        const calls = vi.mocked(useWorkerStateModule.useWorkerState).mock.calls;
        const options = calls[calls.length - 1][3];
        expect(options?.onError).toBe(onError);
        expect(options?.cache).toBe(false);
        expect(options?.enablePolling).toBe(true);
    });
    
    it('should create proper fetcher function', async () => {
        const mockDebugInfo: FilteredDebugData = {
            cpu: { PC: 0x5678 },
            pia: {},
            Bus: {},
            clock: {}
        };
        
        mockWorkerManager.getDebugInfo = vi.fn().mockResolvedValue(mockDebugInfo);
        
        renderHook(() => 
            useWorkerDebugInfo(mockWorkerManager)
        );
        
        // Get the fetcher function from the mock call
        const calls = vi.mocked(useWorkerStateModule.useWorkerState).mock.calls;
        const fetcher = calls[calls.length - 1][1];
        
        // Test the fetcher
        const result = await fetcher(mockWorkerManager);
        expect(mockWorkerManager.getDebugInfo).toHaveBeenCalled();
        expect(result).toEqual(mockDebugInfo);
    });
    
    it('should throw error when no debug info received', async () => {
        mockWorkerManager.getDebugInfo = vi.fn().mockResolvedValue(null);
        
        renderHook(() => 
            useWorkerDebugInfo(mockWorkerManager)
        );
        
        // Get the fetcher function from the mock call
        const calls = vi.mocked(useWorkerStateModule.useWorkerState).mock.calls;
        const fetcher = calls[calls.length - 1][1];
        
        // Test the fetcher throws
        await expect(fetcher(mockWorkerManager)).rejects.toThrow('No debug info received from worker');
    });
});