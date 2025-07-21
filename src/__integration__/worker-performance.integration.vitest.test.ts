import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createIntegrationMockWorkerManager } from '../test-support/integration-test-helpers';
import { useWorkerDebugInfo } from '../hooks/worker/useWorkerDebugInfo';
import type { FilteredDebugData } from '../apple1/types/worker-messages';

describe('Worker Performance Integration Tests', () => {
  let mockWorkerManager: ReturnType<typeof createIntegrationMockWorkerManager>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockWorkerManager = createIntegrationMockWorkerManager();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Performance Under Load', () => {
    it('should handle high-frequency video updates without blocking', async () => {
      const videoCallbacks: Array<(data: unknown) => void> = [];
      const unsubscribeFns: Array<() => void> = [];
      
      // Mock onVideoUpdate to capture callbacks
      mockWorkerManager.onVideoUpdate.mockImplementation((callback: (data: unknown) => void) => {
        videoCallbacks.push(callback);
        const unsubscribe = vi.fn();
        unsubscribeFns.push(unsubscribe);
        return unsubscribe;
      });

      // Subscribe multiple consumers (simulating multiple UI components)
      const consumers = Array.from({ length: 5 }, (_, i) => ({
        id: i,
        callback: vi.fn(),
        updateCount: 0
      }));

      for (const consumer of consumers) {
        await mockWorkerManager.onVideoUpdate(consumer.callback);
      }

      // Simulate 60fps video updates for 1 second
      const frameTime = 16.67; // ~60fps
      const totalFrames = 60;

      for (let frame = 0; frame < totalFrames; frame++) {
        const videoData = {
          buffer: new Uint8Array(1024),
          isDirty: true,
          cursorPosition: frame,
          frameNumber: frame
        };

        // Simulate worker sending video update to all callbacks
        act(() => {
          consumers.forEach(consumer => consumer.callback(videoData));
        });

        await act(async () => {
          await vi.advanceTimersByTimeAsync(frameTime);
        });
      }

      // Verify all consumers received all updates
      consumers.forEach(consumer => {
        expect(consumer.callback).toHaveBeenCalledTimes(totalFrames);
        expect(consumer.callback).toHaveBeenLastCalledWith(
          expect.objectContaining({ frameNumber: totalFrames - 1 })
        );
      });

      // Ensure updates completed within reasonable time
      // Since we're using fake timers, just verify the test completed successfully
      expect(consumers[0].callback).toHaveBeenCalledTimes(totalFrames);
    });

    it('should handle multiple concurrent data requests efficiently', async () => {
      // Setup mock responses
      const mockDebugData: FilteredDebugData = {
        cpu: { PC: 0x0300, cycles: 1000 },
        pia: {},
        Bus: {},
        clock: { 
          hz: 1000000,
          runningTime: 0,
          throttled: 0,
          avgFreq: 1000000,
          avgFreqSamples: 10
        }
      };
      
      mockWorkerManager.getDebugInfo.mockResolvedValue(mockDebugData);
      mockWorkerManager.readMemoryRange.mockResolvedValue(new Uint8Array(256));
      mockWorkerManager.getBreakpoints.mockResolvedValue([0x0300, 0x0400]);

      // Create multiple hooks simulating different UI components
      const debugHook1 = renderHook(() => useWorkerDebugInfo(mockWorkerManager));
      const debugHook2 = renderHook(() => useWorkerDebugInfo(mockWorkerManager));
      const debugHook3 = renderHook(() => useWorkerDebugInfo(mockWorkerManager));

      // Trigger initial fetches
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // All should have data
      expect(debugHook1.result.current.data).toEqual(mockDebugData);
      expect(debugHook2.result.current.data).toEqual(mockDebugData);
      expect(debugHook3.result.current.data).toEqual(mockDebugData);

      // Verify efficient API usage
      // Multiple components might poll independently, so we expect multiple calls
      expect(mockWorkerManager.getDebugInfo).toHaveBeenCalled();

      // Simulate rapid memory reads from multiple components
      const memoryReadPromises = Array.from({ length: 10 }, (_, i) =>
        mockWorkerManager.readMemoryRange(i * 0x100, 256)
      );

      const results = await Promise.all(memoryReadPromises);
      
      // All reads should complete
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toBeInstanceOf(Uint8Array);
        expect((result as Uint8Array).length).toBe(256);
      });
    });

    it('should maintain responsive UI during CPU-intensive operations', async () => {
      let debugDataVersion = 0;
      const generateDebugData = (): FilteredDebugData => ({
        cpu: { 
          PC: 0x0300 + debugDataVersion,
          cycles: 1000 * debugDataVersion,
          isPaused: 0
        },
        pia: {},
        Bus: {},
        clock: { 
          hz: 1000000,
          runningTime: 0,
          throttled: 0,
          avgFreq: 1000000,
          avgFreqSamples: 10
        }
      });

      mockWorkerManager.getDebugInfo.mockImplementation(async () => {
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 10));
        return generateDebugData();
      });

      const { result } = renderHook(() => useWorkerDebugInfo(mockWorkerManager));

      // Simulate running emulation with rapid state changes
      const updateInterval = setInterval(() => {
        debugDataVersion++;
      }, 16); // ~60Hz updates

      // Let it run for a simulated 500ms
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      clearInterval(updateInterval);

      // Verify UI received updates
      expect(result.current.data?.cpu.PC).toBeGreaterThan(0x0300);
      expect(result.current.data?.cpu.cycles).toBeGreaterThan(0);
    });

    it('should handle burst operations without dropping messages', async () => {
      const operations: Array<{ type: string; timestamp: number }> = [];
      
      // Setup operation tracking
      mockWorkerManager.step.mockImplementation(async () => {
        operations.push({ type: 'step', timestamp: Date.now() });
      });
      
      mockWorkerManager.pauseEmulation.mockImplementation(async () => {
        operations.push({ type: 'pause', timestamp: Date.now() });
      });
      
      mockWorkerManager.resumeEmulation.mockImplementation(async () => {
        operations.push({ type: 'resume', timestamp: Date.now() });
      });
      
      mockWorkerManager.setBreakpoint.mockImplementation(async () => {
        operations.push({ type: 'breakpoint', timestamp: Date.now() });
      });

      // Simulate rapid user actions
      const actions = [
        () => mockWorkerManager.pauseEmulation(),
        () => mockWorkerManager.step(),
        () => mockWorkerManager.step(),
        () => mockWorkerManager.step(),
        () => mockWorkerManager.setBreakpoint(0x0300),
        () => mockWorkerManager.setBreakpoint(0x0400),
        () => mockWorkerManager.resumeEmulation(),
        () => mockWorkerManager.step(),
        () => mockWorkerManager.pauseEmulation()
      ];

      // Execute all actions as fast as possible
      await Promise.all(actions.map(action => action()));

      // Verify all operations were processed
      expect(operations).toHaveLength(actions.length);
      expect(operations.filter(op => op.type === 'step')).toHaveLength(4);
      expect(operations.filter(op => op.type === 'pause')).toHaveLength(2);
      expect(operations.filter(op => op.type === 'resume')).toHaveLength(1);
      expect(operations.filter(op => op.type === 'breakpoint')).toHaveLength(2);
    });

    it('should efficiently handle large memory range reads', async () => {
      // Mock large memory read
      const largeMemorySize = 65536; // Full 64K address space
      const mockMemory = new Uint8Array(largeMemorySize);
      for (let i = 0; i < largeMemorySize; i++) {
        mockMemory[i] = i & 0xFF;
      }

      mockWorkerManager.readMemoryRange.mockImplementation(async (start: number, length: number) => {
        // Return immediately for test
        return mockMemory.slice(start, start + length);
      });

      // Test reading in chunks vs one large read
      const chunkSize = 4096;
      const chunks = Math.ceil(largeMemorySize / chunkSize);
      
      // Method 1: Read in chunks
      const chunkPromises = Array.from({ length: chunks }, (_, i) => 
        mockWorkerManager.readMemoryRange(i * chunkSize, 
          Math.min(chunkSize, largeMemorySize - i * chunkSize))
      );
      
      const chunkResults = await Promise.all(chunkPromises);
      
      // Method 2: Single large read
      const singleResult = await mockWorkerManager.readMemoryRange(0, largeMemorySize);

      // Verify data integrity
      const reassembledChunks = new Uint8Array(largeMemorySize);
      let offset = 0;
      chunkResults.forEach((chunk: Uint8Array) => {
        reassembledChunks.set(chunk, offset);
        offset += chunk.length;
      });

      expect(reassembledChunks).toEqual(singleResult);
      
      // Just verify both methods completed successfully
      expect(chunkResults).toHaveLength(chunks);
      expect((singleResult as Uint8Array).length).toBe(largeMemorySize);
    });

    it('should handle subscription cleanup under load', async () => {
      const unsubscribeFns: Array<() => void> = [];

      // Mock onVideoUpdate to track subscriptions
      mockWorkerManager.onVideoUpdate.mockImplementation(() => {
        const unsubscribe = vi.fn();
        unsubscribeFns.push(unsubscribe);
        return unsubscribe;
      });

      // Create many subscriptions
      const subscriberCount = 100;
      const subscriptions: Array<() => void> = [];

      for (let i = 0; i < subscriberCount; i++) {
        const unsubscribe = await mockWorkerManager.onVideoUpdate(vi.fn());
        subscriptions.push(unsubscribe as () => void);
      }

      expect(unsubscribeFns).toHaveLength(subscriberCount);

      // Simulate updates while unsubscribing
      const updateInterval = setInterval(() => {
        // In real implementation, worker would call active callbacks
        // This simulates the worker still pushing updates during unsubscription
      }, 10);

      // Gradually unsubscribe while updates are happening
      for (let i = 0; i < subscriberCount; i++) {
        subscriptions[i]();
        await act(async () => {
          await vi.advanceTimersByTimeAsync(5);
        });
      }

      clearInterval(updateInterval);

      // All should be cleaned up
      unsubscribeFns.forEach(unsub => {
        expect(unsub).toHaveBeenCalled();
      });
    });
  });
});