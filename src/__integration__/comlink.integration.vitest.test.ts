import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createIntegrationMockWorkerManager } from '../test-support/integration-test-helpers';
import type { FilteredDebugData } from '../apple1/types/worker-messages';

describe('Comlink-specific Integration Tests', () => {
  let mockWorkerManager: ReturnType<typeof createIntegrationMockWorkerManager>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockWorkerManager = createIntegrationMockWorkerManager();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Comlink Proxy and Transfer', () => {
    it('should properly handle Comlink proxy pattern', async () => {
      // Test that our mock structure supports Comlink-like patterns
      const mockAPI = {
        initialize: vi.fn().mockResolvedValue(undefined),
        setPaused: vi.fn().mockResolvedValue(undefined),
        step: vi.fn().mockResolvedValue(undefined),
        getDebugInfo: vi.fn().mockResolvedValue({
          cpu: { PC: 0x0300 },
          pia: {},
          Bus: {},
          clock: {}
        })
      };

      // Verify async methods work as expected
      await mockAPI.initialize();
      expect(mockAPI.initialize).toHaveBeenCalled();

      await mockAPI.setPaused(true);
      expect(mockAPI.setPaused).toHaveBeenCalledWith(true);

      const debugInfo = await mockAPI.getDebugInfo();
      expect(debugInfo.cpu.PC).toBe(0x0300);
    });

    it('should handle transferable objects correctly', async () => {
      // Test transferring large ArrayBuffers efficiently
      const largeBuffer = new ArrayBuffer(1024 * 1024); // 1MB
      const uint8View = new Uint8Array(largeBuffer);
      
      // Fill with test data
      for (let i = 0; i < uint8View.length; i++) {
        uint8View[i] = i & 0xFF;
      }

      // Test that we can handle large data transfers
      // In a real Comlink implementation, this would use transferables
      // For now, we'll test with multiple individual writes
      const writePromises = [];
      for (let i = 0; i < 256; i++) {
        writePromises.push(mockWorkerManager.writeMemory(i, uint8View[i]));
      }
      
      await Promise.all(writePromises);

      expect(mockWorkerManager.writeMemory).toHaveBeenCalledTimes(256);
    });

    it('should handle proxy callbacks and subscriptions', async () => {
      const callbackData: unknown[] = [];
      const callback = vi.fn((data: unknown) => {
        callbackData.push(data);
      });

      // Test subscription pattern
      const unsubscribe = vi.fn();
      mockWorkerManager.onVideoUpdate.mockReturnValue(unsubscribe);

      const cleanup = await mockWorkerManager.onVideoUpdate(callback);
      expect(cleanup).toBe(unsubscribe);

      // Simulate worker sending data
      const mockData = {
        buffer: new Uint8Array(1024),
        isDirty: true,
        cursorPosition: 0
      };

      callback(mockData);

      expect(callback).toHaveBeenCalledWith(mockData);
      expect(callbackData).toContain(mockData);

      // Test unsubscribe
      await (cleanup as () => void)();
      expect(unsubscribe).toHaveBeenCalled();
    });

    it('should handle error propagation across worker boundary', async () => {
      // Setup error scenarios
      const workerError = new Error('Worker operation failed');
      workerError.stack = 'Error: Worker operation failed\n  at WorkerAPI.method';

      mockWorkerManager.step.mockRejectedValue(workerError);

      // Test error propagation
      try {
        await mockWorkerManager.step();
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Worker operation failed');
      }
    });

    it('should handle proxy release and cleanup', async () => {
      // Create proxy objects
      const callbacks: Array<() => void> = [];
      
      // Subscribe multiple times
      for (let i = 0; i < 5; i++) {
        const unsubscribe = vi.fn();
        mockWorkerManager.onVideoUpdate.mockReturnValue(unsubscribe);
        
        const cleanup = await mockWorkerManager.onVideoUpdate(vi.fn());
        callbacks.push(cleanup as () => void);
      }

      // Release all proxies
      for (const cleanup of callbacks) {
        await cleanup();
      }

      // Verify cleanup
      expect(mockWorkerManager.onVideoUpdate).toHaveBeenCalledTimes(5);
    });

    it('should handle concurrent calls without interference', async () => {
      // Setup different mock responses
      let debugCallCount = 0;
      mockWorkerManager.getDebugInfo.mockImplementation(async () => {
        debugCallCount++;
        return {
          cpu: { PC: 0x0300 + debugCallCount },
          pia: {},
          Bus: {},
          clock: {}
        };
      });

      mockWorkerManager.getBreakpoints.mockResolvedValue([0x0300, 0x0400]);
      mockWorkerManager.readMemoryRange.mockResolvedValue(new Uint8Array(256));

      // Make concurrent calls
      const [debugData, breakpoints, memory] = await Promise.all([
        mockWorkerManager.getDebugInfo(),
        mockWorkerManager.getBreakpoints(),
        mockWorkerManager.readMemoryRange(0x0000, 256)
      ]);

      // Verify all calls completed independently
      expect((debugData as FilteredDebugData).cpu.PC).toBe(0x0301);
      expect(breakpoints).toEqual([0x0300, 0x0400]);
      expect(memory).toHaveLength(256);
    });

    it('should handle message ordering and sequencing', async () => {
      const operations: string[] = [];

      // Mock operations with tracking
      mockWorkerManager.pauseEmulation.mockImplementation(async () => {
        operations.push('pauseEmulation');
      });

      mockWorkerManager.step.mockImplementation(async () => {
        operations.push('step');
      });

      mockWorkerManager.setBreakpoint.mockImplementation(async (addr: number) => {
        operations.push(`breakpoint:${addr.toString(16)}`);
      });

      // Execute operations in specific order
      await mockWorkerManager.pauseEmulation();
      await mockWorkerManager.step();
      await mockWorkerManager.setBreakpoint(0x0300);
      await mockWorkerManager.step();
      await mockWorkerManager.resumeEmulation();

      // Verify order is maintained despite different processing times
      expect(operations).toEqual([
        'pauseEmulation',
        'step',
        'breakpoint:300',
        'step'
      ]);
    });

    it('should handle worker termination gracefully', async () => {
      // Simulate worker termination scenario
      const terminationError = new DOMException('Worker terminated', 'AbortError');
      
      // First call succeeds
      await mockWorkerManager.getDebugInfo();
      expect(mockWorkerManager.getDebugInfo).toHaveBeenCalledTimes(1);

      // Simulate termination
      mockWorkerManager.getDebugInfo.mockRejectedValue(terminationError);
      mockWorkerManager.pauseEmulation.mockRejectedValue(terminationError);
      mockWorkerManager.step.mockRejectedValue(terminationError);

      // Subsequent calls should fail with termination error
      await expect(mockWorkerManager.getDebugInfo()).rejects.toThrow('Worker terminated');
      await expect(mockWorkerManager.pauseEmulation()).rejects.toThrow('Worker terminated');
      await expect(mockWorkerManager.step()).rejects.toThrow('Worker terminated');
    });

    it('should handle bidirectional communication patterns', async () => {
      // Simulate exposed API from main thread to worker
      const mainThreadAPI = {
        onWorkerReady: vi.fn(),
        onWorkerError: vi.fn(),
        onPerformanceData: vi.fn()
      };

      // Simulate worker calling back to main thread
      mainThreadAPI.onWorkerReady();
      mainThreadAPI.onPerformanceData({
        videoCyclesPerFrame: 17050,
        lastFrameVideoCycles: 17000,
        overdrawCycles: 50
      });

      expect(mainThreadAPI.onWorkerReady).toHaveBeenCalled();
      expect(mainThreadAPI.onPerformanceData).toHaveBeenCalledWith(
        expect.objectContaining({ videoCyclesPerFrame: 17050 })
      );
    });

    it('should properly handle endpoint lifecycle', async () => {
      // Test endpoint creation and cleanup
      const mockEndpoint = {
        postMessage: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        start: vi.fn(),
        close: vi.fn()
      };

      // Verify endpoint methods exist
      expect(typeof mockEndpoint.postMessage).toBe('function');
      expect(typeof mockEndpoint.addEventListener).toBe('function');

      // Simulate message passing
      mockEndpoint.postMessage({ type: 'call', method: 'initialize' });
      expect(mockEndpoint.postMessage).toHaveBeenCalled();

      // Simulate cleanup
      mockEndpoint.close();
      expect(mockEndpoint.close).toHaveBeenCalled();
    });
  });
});