import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useWorkerBreakpoints } from '../useWorkerBreakpoints';
import { WorkerManager } from '../../../services/WorkerManager';
import { useWorkerState } from '../useWorkerState';

// Mock useWorkerState
let mockData: number[] = [];
let mockSetOptimistic: ReturnType<typeof vi.fn>;
let mockRefresh: ReturnType<typeof vi.fn>;

vi.mock('../useWorkerState', () => ({
    useWorkerState: vi.fn(() => {
        mockSetOptimistic = vi.fn((newData) => {
            mockData = newData;
        });
        mockRefresh = vi.fn();
        
        return {
            data: mockData,
            loading: false,
            error: null,
            refresh: mockRefresh,
            setOptimistic: mockSetOptimistic
        };
    })
}));

describe('useWorkerBreakpoints', () => {
    let mockWorkerManager: WorkerManager;
    
    beforeEach(() => {
        vi.clearAllMocks();
        mockData = [];
        
        // Create mock WorkerManager
        mockWorkerManager = {
            getBreakpoints: vi.fn().mockResolvedValue([]),
            setBreakpoint: vi.fn().mockResolvedValue(undefined),
            clearBreakpoint: vi.fn().mockResolvedValue(undefined),
            clearAllBreakpoints: vi.fn().mockResolvedValue(undefined)
        } as unknown as WorkerManager;
    });
    
    it('should provide empty breakpoints initially', () => {
        const { result } = renderHook(() => 
            useWorkerBreakpoints(mockWorkerManager)
        );
        
        expect(result.current.breakpoints).toEqual([]);
        expect(result.current.breakpointSet.size).toBe(0);
        expect(result.current.hasBreakpoint(0x1000)).toBe(false);
    });
    
    it('should provide breakpoints as array and set', () => {
        mockData = [0x1000, 0x2000, 0x3000];
        
        const { result } = renderHook(() => 
            useWorkerBreakpoints(mockWorkerManager)
        );
        
        expect(result.current.breakpoints).toEqual([0x1000, 0x2000, 0x3000]);
        expect(result.current.breakpointSet.size).toBe(3);
        expect(result.current.hasBreakpoint(0x1000)).toBe(true);
        expect(result.current.hasBreakpoint(0x2000)).toBe(true);
        expect(result.current.hasBreakpoint(0x4000)).toBe(false);
    });
    
    it('should toggle breakpoint on', async () => {
        mockData = [0x1000];
        
        const { result } = renderHook(() => 
            useWorkerBreakpoints(mockWorkerManager)
        );
        
        await act(async () => {
            await result.current.toggleBreakpoint(0x2000);
        });
        
        // Should optimistically update
        expect(mockSetOptimistic).toHaveBeenCalledWith([0x1000, 0x2000]);
        
        // Should call worker manager
        expect(mockWorkerManager.setBreakpoint).toHaveBeenCalledWith(0x2000);
        
        // Should refresh
        expect(mockRefresh).toHaveBeenCalled();
    });
    
    it('should toggle breakpoint off', async () => {
        mockData = [0x1000, 0x2000];
        
        const { result } = renderHook(() => 
            useWorkerBreakpoints(mockWorkerManager)
        );
        
        await act(async () => {
            await result.current.toggleBreakpoint(0x1000);
        });
        
        // Should optimistically update
        expect(mockSetOptimistic).toHaveBeenCalledWith([0x2000]);
        
        // Should call worker manager
        expect(mockWorkerManager.clearBreakpoint).toHaveBeenCalledWith(0x1000);
        
        // Should refresh
        expect(mockRefresh).toHaveBeenCalled();
    });
    
    it('should set breakpoint', async () => {
        mockData = [0x1000];
        
        const { result } = renderHook(() => 
            useWorkerBreakpoints(mockWorkerManager)
        );
        
        await act(async () => {
            await result.current.setBreakpoint(0x2000);
        });
        
        // Should optimistically update
        expect(mockSetOptimistic).toHaveBeenCalledWith([0x1000, 0x2000]);
        
        // Should call worker manager
        expect(mockWorkerManager.setBreakpoint).toHaveBeenCalledWith(0x2000);
        
        // Should refresh
        expect(mockRefresh).toHaveBeenCalled();
    });
    
    it('should not set breakpoint if already exists', async () => {
        mockData = [0x1000, 0x2000];
        
        const { result } = renderHook(() => 
            useWorkerBreakpoints(mockWorkerManager)
        );
        
        await act(async () => {
            await result.current.setBreakpoint(0x1000);
        });
        
        // Should not update or call worker
        expect(mockSetOptimistic).not.toHaveBeenCalled();
        expect(mockWorkerManager.setBreakpoint).not.toHaveBeenCalled();
        expect(mockRefresh).not.toHaveBeenCalled();
    });
    
    it('should clear breakpoint', async () => {
        mockData = [0x1000, 0x2000];
        
        const { result } = renderHook(() => 
            useWorkerBreakpoints(mockWorkerManager)
        );
        
        await act(async () => {
            await result.current.clearBreakpoint(0x1000);
        });
        
        // Should optimistically update
        expect(mockSetOptimistic).toHaveBeenCalledWith([0x2000]);
        
        // Should call worker manager
        expect(mockWorkerManager.clearBreakpoint).toHaveBeenCalledWith(0x1000);
        
        // Should refresh
        expect(mockRefresh).toHaveBeenCalled();
    });
    
    it('should not clear breakpoint if not exists', async () => {
        mockData = [0x1000];
        
        const { result } = renderHook(() => 
            useWorkerBreakpoints(mockWorkerManager)
        );
        
        await act(async () => {
            await result.current.clearBreakpoint(0x2000);
        });
        
        // Should not update or call worker
        expect(mockSetOptimistic).not.toHaveBeenCalled();
        expect(mockWorkerManager.clearBreakpoint).not.toHaveBeenCalled();
        expect(mockRefresh).not.toHaveBeenCalled();
    });
    
    it('should clear all breakpoints', async () => {
        mockData = [0x1000, 0x2000, 0x3000];
        
        const { result } = renderHook(() => 
            useWorkerBreakpoints(mockWorkerManager)
        );
        
        await act(async () => {
            await result.current.clearAllBreakpoints();
        });
        
        // Should optimistically update
        expect(mockSetOptimistic).toHaveBeenCalledWith([]);
        
        // Should call worker manager
        expect(mockWorkerManager.clearAllBreakpoints).toHaveBeenCalled();
        
        // Should refresh
        expect(mockRefresh).toHaveBeenCalled();
    });
    
    it('should handle toggle error and refresh', async () => {
        mockData = [0x1000];
        const error = new Error('Set failed');
        mockWorkerManager.setBreakpoint = vi.fn().mockRejectedValue(error);
        
        const { result } = renderHook(() => 
            useWorkerBreakpoints(mockWorkerManager)
        );
        
        await expect(act(async () => {
            await result.current.toggleBreakpoint(0x2000);
        })).rejects.toThrow('Set failed');
        
        // Should still refresh to revert optimistic update
        expect(mockRefresh).toHaveBeenCalled();
    });
    
    it('should handle set error and refresh', async () => {
        mockData = [];
        const error = new Error('Set failed');
        mockWorkerManager.setBreakpoint = vi.fn().mockRejectedValue(error);
        
        const { result } = renderHook(() => 
            useWorkerBreakpoints(mockWorkerManager)
        );
        
        await expect(act(async () => {
            await result.current.setBreakpoint(0x1000);
        })).rejects.toThrow('Set failed');
        
        // Should still refresh to revert optimistic update
        expect(mockRefresh).toHaveBeenCalled();
    });
    
    it('should handle clear error and refresh', async () => {
        mockData = [0x1000];
        const error = new Error('Clear failed');
        mockWorkerManager.clearBreakpoint = vi.fn().mockRejectedValue(error);
        
        const { result } = renderHook(() => 
            useWorkerBreakpoints(mockWorkerManager)
        );
        
        await expect(act(async () => {
            await result.current.clearBreakpoint(0x1000);
        })).rejects.toThrow('Clear failed');
        
        // Should still refresh to revert optimistic update
        expect(mockRefresh).toHaveBeenCalled();
    });
    
    it('should use default polling interval', () => {
        const mockUseWorkerState = vi.mocked(useWorkerState);
        
        renderHook(() => 
            useWorkerBreakpoints(mockWorkerManager)
        );
        
        const options = mockUseWorkerState.mock.calls[0][3];
        expect(options?.pollInterval).toBe(2000);
    });
    
    it('should respect custom polling interval', () => {
        const mockUseWorkerState = vi.mocked(useWorkerState);
        
        renderHook(() => 
            useWorkerBreakpoints(mockWorkerManager, { pollInterval: 5000 })
        );
        
        const options = mockUseWorkerState.mock.calls[0][3];
        expect(options?.pollInterval).toBe(5000);
    });
});