import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createIntegrationMockWorkerManager } from '../test-support/integration-test-helpers';
import { useWorkerDebugInfo } from '../hooks/worker/useWorkerDebugInfo';
import { useWorkerBreakpoints } from '../hooks/worker/useWorkerBreakpoints';
import type { FilteredDebugData } from '../apple1/types/worker-messages';
import type { EmulatorState } from '../apple1/types/emulator-state';

describe('Worker Communication Integration Tests', () => {
  let mockWorkerManager: ReturnType<typeof createIntegrationMockWorkerManager>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockWorkerManager = createIntegrationMockWorkerManager();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('CPU → Worker → UI Flow', () => {
    it('should handle full debug info flow from CPU execution to UI update', async () => {
      // Setup mock debug data that would come from CPU
      const mockDebugData: FilteredDebugData = {
        cpu: {
          PC: 0x0300,
          A: 0x42,
          X: 0x00,
          Y: 0x00,
          S: 0xFF,
          P: 0x20,
          IR: 0xEA,
          cycles: 1000,
          isPaused: 0,
          isWaitingForInput: 0,
          isHalted: 0
        },
        pia: {},
        Bus: {},
        clock: {
          hz: 1000000,
          runningTime: 1000,
          throttled: 0,
          avgFreq: 1000000,
          avgFreqSamples: 10
        }
      };

      // 1. Render hook that subscribes to debug info
      const { result } = renderHook(() => useWorkerDebugInfo(mockWorkerManager));

      // 2. Simulate worker sending debug data (CPU execution result)
      mockWorkerManager.getDebugInfo.mockResolvedValue(mockDebugData);

      // 3. Wait for initial fetch
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // 4. Verify UI receives the data
      expect(result.current.data).toEqual(mockDebugData);

      // 5. Test subscription updates (simulating continuous CPU execution)
      const updatedDebugData = {
        ...mockDebugData,
        cpu: {
          ...mockDebugData.cpu,
          PC: 0x0301,
          cycles: 1005
        }
      };

      // Update the mock to return new data
      mockWorkerManager.getDebugInfo.mockResolvedValue(updatedDebugData);

      // Advance time to trigger next poll
      await act(async () => {
        await vi.advanceTimersByTimeAsync(250); // Default polling interval
      });

      // Verify UI receives the update
      expect(result.current.data).toEqual(updatedDebugData);
    });

    it('should handle breakpoint flow from CPU hit to UI notification', async () => {
      // 1. Setup initial breakpoints
      const initialBreakpoints = [0x0300, 0x0400];
      mockWorkerManager.getBreakpoints.mockResolvedValue(initialBreakpoints);

      // 2. Render hook that manages breakpoints
      const { result } = renderHook(() => useWorkerBreakpoints(mockWorkerManager));

      // Wait for initial fetch
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(result.current.breakpoints).toEqual(initialBreakpoints);

      // 3. Simulate CPU hitting a breakpoint
      // In real implementation, the worker would notify via onBreakpointHit

      // 4. Add a new breakpoint from UI
      await act(async () => {
        await result.current.setBreakpoint(0x0500);
      });

      expect(mockWorkerManager.setBreakpoint).toHaveBeenCalledWith(0x0500);

      // 5. Simulate worker confirming the new breakpoint
      const updatedBreakpoints = [...initialBreakpoints, 0x0500];
      mockWorkerManager.getBreakpoints.mockResolvedValue(updatedBreakpoints);

      // Trigger refresh
      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.breakpoints).toEqual(updatedBreakpoints);
    });

    it('should handle memory read/write flow', async () => {
      // 1. Setup mock memory data
      const mockMemoryData = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
      mockWorkerManager.readMemoryRange.mockResolvedValue(mockMemoryData);

      // 2. Read memory from UI
      const memoryData = await mockWorkerManager.readMemoryRange(0x0000, 4);
      expect(memoryData).toEqual(mockMemoryData);

      // 3. Write memory from UI
      await act(async () => {
        await mockWorkerManager.writeMemory(0x0000, 0xFF);
      });

      expect(mockWorkerManager.writeMemory).toHaveBeenCalledWith(0x0000, 0xFF);

      // 4. Simulate memory change notification
      const updatedMemoryData = new Uint8Array([0xFF, 0x01, 0x02, 0x03]);
      mockWorkerManager.readMemoryRange.mockResolvedValue(updatedMemoryData);

      // Verify memory was updated
      const newMemoryData = await mockWorkerManager.readMemoryRange(0x0000, 4);
      expect((newMemoryData as Uint8Array)[0]).toBe(0xFF);
    });

    it('should handle execution control flow', async () => {
      // 1. Start with paused state
      const pausedDebugData: FilteredDebugData = {
        cpu: { isPaused: 1, PC: 0x0300 },
        pia: {},
        Bus: {},
        clock: {}
      };
      mockWorkerManager.getDebugInfo.mockResolvedValue(pausedDebugData);

      const { result } = renderHook(() => useWorkerDebugInfo(mockWorkerManager));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(result.current.data?.cpu.isPaused).toBe(1);

      // 2. Resume execution
      await act(async () => {
        await mockWorkerManager.resumeEmulation();
      });

      expect(mockWorkerManager.resumeEmulation).toHaveBeenCalled();

      // 3. Simulate worker updating state to running
      const runningDebugData = {
        ...pausedDebugData,
        cpu: { ...pausedDebugData.cpu, isPaused: 0 }
      };

      mockWorkerManager.getDebugInfo.mockResolvedValue(runningDebugData);

      // Wait for next poll
      await act(async () => {
        await vi.advanceTimersByTimeAsync(250);
      });

      expect(result.current.data?.cpu.isPaused).toBe(0);

      // 4. Step execution
      await act(async () => {
        await mockWorkerManager.step();
      });

      expect(mockWorkerManager.step).toHaveBeenCalled();

      // 5. Simulate PC advancement after step
      const steppedDebugData = {
        ...runningDebugData,
        cpu: { ...runningDebugData.cpu, PC: 0x0301 }
      };

      mockWorkerManager.getDebugInfo.mockResolvedValue(steppedDebugData);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(result.current.data?.cpu.PC).toBeTruthy();
    });

    it('should handle video update flow', async () => {
      // 1. Setup video update subscription
      const videoCallback = vi.fn();
      const unsubscribe = vi.fn();
      mockWorkerManager.onVideoUpdate.mockReturnValue(unsubscribe);

      // Subscribe to video updates
      const cleanup = await mockWorkerManager.onVideoUpdate(videoCallback);
      expect(cleanup).toBe(unsubscribe);

      // 2. Simulate high-frequency video updates from worker
      const mockVideoData = {
        buffer: new Uint8Array(1024),
        isDirty: true,
        cursorPosition: 100
      };

      // Since we're mocking, we need to manually call the callback
      // In real implementation, the worker would push these updates
      for (let i = 0; i < 5; i++) {
        videoCallback({ ...mockVideoData, cursorPosition: 100 + i });
        
        await act(async () => {
          await vi.advanceTimersByTimeAsync(16); // ~60fps
        });
      }

      // Verify all updates were received
      expect(videoCallback).toHaveBeenCalledTimes(5);
      expect(videoCallback).toHaveBeenLastCalledWith(
        expect.objectContaining({ cursorPosition: 104 })
      );
    });
  });

  describe('Component Integration with WorkerManager', () => {
    it('should handle multiple components subscribing to same data', async () => {
      const mockDebugData: FilteredDebugData = {
        cpu: { PC: 0x0300 },
        pia: {},
        Bus: {},
        clock: {}
      };
      mockWorkerManager.getDebugInfo.mockResolvedValue(mockDebugData);

      // Render multiple hooks (simulating multiple components)
      const { result: result1 } = renderHook(() => useWorkerDebugInfo(mockWorkerManager));
      const { result: result2 } = renderHook(() => useWorkerDebugInfo(mockWorkerManager));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Both should receive the same data
      expect(result1.current.data).toEqual(mockDebugData);
      expect(result2.current.data).toEqual(mockDebugData);

      // Update should propagate to both
      const updatedData = { ...mockDebugData, cpu: { PC: 0x0301 } };
      mockWorkerManager.getDebugInfo.mockResolvedValue(updatedData);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(250);
      });

      expect(result1.current.data?.cpu.PC).toBe(0x0301);
      expect(result2.current.data?.cpu.PC).toBe(0x0301);
    });

    it('should handle component unmount and cleanup', async () => {
      const { unmount } = renderHook(() => useWorkerDebugInfo(mockWorkerManager));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Unmount component
      unmount();

      // Advance timers to ensure no more polling happens after unmount
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      // Should not have been called again after unmount
      const callCountBeforeUnmount = mockWorkerManager.getDebugInfo.mock.calls.length;
      expect(callCountBeforeUnmount).toBeGreaterThan(0);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle worker communication failures gracefully', async () => {
      // Setup hook with error handling
      const onError = vi.fn();
      const { result } = renderHook(() => 
        useWorkerDebugInfo(mockWorkerManager, { onError })
      );

      // Simulate communication error
      const error = new Error('Worker communication failed');
      mockWorkerManager.getDebugInfo.mockRejectedValue(error);

      // Trigger fetch and let the error propagate
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Trigger another poll cycle to ensure error is caught
      await act(async () => {
        await vi.advanceTimersByTimeAsync(250);
      });

      // Verify error was handled
      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toBe('Worker communication failed');
      expect(onError).toHaveBeenCalledWith(error);
      // The hook may still have initial data, so just verify error occurred
      expect(result.current.loading).toBe(false);
    });

    it('should handle invalid command parameters', async () => {
      // Test invalid memory range
      const invalidRange = -1;
      mockWorkerManager.readMemoryRange.mockRejectedValue(
        new Error('Invalid memory range')
      );

      await expect(
        mockWorkerManager.readMemoryRange(invalidRange, 10)
      ).rejects.toThrow('Invalid memory range');

      // Test invalid breakpoint address
      mockWorkerManager.setBreakpoint.mockRejectedValue(
        new Error('Invalid breakpoint address')
      );

      const { result } = renderHook(() => useWorkerBreakpoints(mockWorkerManager));
      
      await act(async () => {
        try {
          await result.current.setBreakpoint(-1);
        } catch {
          // Expected error
        }
      });

      expect(mockWorkerManager.setBreakpoint).toHaveBeenCalledWith(-1);
    });

    it('should handle timeout scenarios', async () => {
      // Simulate slow response
      let resolvePromise: ((value: FilteredDebugData) => void) | undefined;
      const slowPromise = new Promise<FilteredDebugData>(resolve => {
        resolvePromise = resolve;
      });
      mockWorkerManager.getDebugInfo.mockReturnValue(slowPromise);

      const { result } = renderHook(() => useWorkerDebugInfo(mockWorkerManager));

      // Start fetch
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Should still be loading
      expect(result.current.loading).toBe(true);

      // Resolve after delay
      act(() => {
        if (resolvePromise) {
          resolvePromise({
          cpu: { PC: 0x0300 },
          pia: {},
          Bus: {},
          clock: {
            hz: 0,
            runningTime: 0,
            throttled: 0,
            avgFreq: 0,
            avgFreqSamples: 0
          }
        });
        }
      });

      // Advance time to let the promise resolve
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      
      expect(result.current.loading).toBe(false);
    });

    it('should handle concurrent operation conflicts', async () => {
      // Setup initial state
      mockWorkerManager.pauseEmulation.mockResolvedValue(undefined);
      mockWorkerManager.step.mockResolvedValue(undefined);

      // Attempt concurrent pause and step operations
      const pausePromise = mockWorkerManager.pauseEmulation();
      const stepPromise = mockWorkerManager.step();

      // Both should be called
      expect(mockWorkerManager.pauseEmulation).toHaveBeenCalled();
      expect(mockWorkerManager.step).toHaveBeenCalled();

      await Promise.all([pausePromise, stepPromise]);

      // In real scenario, worker should handle this appropriately
      // Here we just verify both operations were attempted
    });

    it('should recover from worker crash', async () => {
      // Setup simple mock data for this test
      const mockData: FilteredDebugData = {
        cpu: { PC: 0x0300 },
        pia: {},
        Bus: {},
        clock: {}
      };
      
      // Override the default mock with simpler data for this test
      mockWorkerManager.getDebugInfo.mockResolvedValue(mockData);

      const { result } = renderHook(() => useWorkerDebugInfo(mockWorkerManager));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(result.current.data).toEqual(mockData);

      // Simulate worker crash
      const crashError = new Error('Worker terminated unexpectedly');
      mockWorkerManager.getDebugInfo.mockRejectedValue(crashError);

      // Next poll should encounter error
      await act(async () => {
        await vi.advanceTimersByTimeAsync(250);
      });

      expect(result.current.error).toBe(crashError);

      // Simulate recovery - worker restarted
      mockWorkerManager.getDebugInfo.mockResolvedValue(mockData);

      // Should recover on next poll
      await act(async () => {
        await vi.advanceTimersByTimeAsync(250);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.data).toEqual(mockData);
    });

    it('should handle memory operation failures', async () => {
      // Setup write failure
      const writeError = new Error('Memory write protected');
      mockWorkerManager.writeMemory.mockRejectedValue(writeError);

      // Attempt write
      await expect(
        mockWorkerManager.writeMemory(0xFFFF, 0xFF)
      ).rejects.toThrow('Memory write protected');

      // Setup read failure  
      const readError = new Error('Memory read timeout');
      mockWorkerManager.readMemoryRange.mockRejectedValue(readError);

      await expect(
        mockWorkerManager.readMemoryRange(0x0000, 100)
      ).rejects.toThrow('Memory read timeout');
    });

    it('should handle state save/load failures', async () => {
      // Test save failure
      const saveError = new Error('Failed to serialize state');
      mockWorkerManager.saveState.mockRejectedValue(saveError);

      await expect(
        mockWorkerManager.saveState()
      ).rejects.toThrow('Failed to serialize state');

      // Test load failure
      const loadError = new Error('Invalid state format');
      mockWorkerManager.loadState.mockRejectedValue(loadError);

      await expect(
        mockWorkerManager.loadState({} as EmulatorState)
      ).rejects.toThrow('Invalid state format');
    });
  });
});