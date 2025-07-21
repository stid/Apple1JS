import { vi, type Mock } from 'vitest';
import type { FilteredDebugData } from '../apple1/types/worker-messages';
import type { EmulatorState } from '../apple1/types/emulator-state';

/**
 * Creates a fully mocked WorkerManager for integration tests
 * All methods are vi.fn() mocks with proper typing
 */
export function createIntegrationMockWorkerManager() {
    const mockWorker = {
        postMessage: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        terminate: vi.fn()
    };
    
    const mockManager = {
        // Core methods
        initializeWorker: vi.fn().mockResolvedValue(mockWorker),
        getWorker: vi.fn().mockReturnValue(mockWorker),
        terminate: vi.fn(),
        
        // Emulation control
        pauseEmulation: vi.fn().mockResolvedValue(undefined),
        resumeEmulation: vi.fn().mockResolvedValue(undefined),
        step: vi.fn().mockResolvedValue(undefined),
        
        // State management
        saveState: vi.fn().mockResolvedValue({} as EmulatorState),
        loadState: vi.fn().mockResolvedValue(undefined),
        
        // Breakpoints
        setBreakpoint: vi.fn().mockResolvedValue([]),
        clearBreakpoint: vi.fn().mockResolvedValue([]),
        clearAllBreakpoints: vi.fn().mockResolvedValue(undefined),
        getBreakpoints: vi.fn().mockResolvedValue([]),
        runToAddress: vi.fn().mockResolvedValue(undefined),
        
        // Memory
        readMemoryRange: vi.fn().mockResolvedValue(new Uint8Array(256)),
        writeMemory: vi.fn().mockResolvedValue(undefined),
        
        // Debug info
        getDebugInfo: vi.fn().mockResolvedValue({
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
        } as FilteredDebugData),
        
        // Configuration
        setCrtBsSupport: vi.fn().mockResolvedValue(undefined),
        setDebuggerActive: vi.fn().mockResolvedValue(undefined),
        setCycleAccurateMode: vi.fn().mockResolvedValue(undefined),
        setCpuProfiling: vi.fn().mockResolvedValue(undefined),
        
        // Input
        keyDown: vi.fn().mockResolvedValue(undefined),
        
        // Event subscriptions - these return unsubscribe functions
        onVideoUpdate: vi.fn().mockReturnValue(vi.fn()),
        onBreakpointHit: vi.fn().mockReturnValue(vi.fn()),
        onEmulationStatus: vi.fn().mockReturnValue(vi.fn()),
        onLogMessage: vi.fn().mockReturnValue(vi.fn()),
        onClockData: vi.fn().mockReturnValue(vi.fn()),
        onRunToCursorTarget: vi.fn().mockReturnValue(vi.fn()),
        
        // Message handling
        onMessage: vi.fn(),
        offMessage: vi.fn(),
        
        // Additional method that's missing
        getMemoryMap: vi.fn().mockResolvedValue({
            regions: []
        })
    };
    
    // Cast to any to bypass TypeScript's strict checking - the tests will ensure proper behavior
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return mockManager as any;
}

/**
 * Helper to simulate worker pushing data to subscribers
 */
export function simulateWorkerUpdate<T>(
    mockManager: ReturnType<typeof createIntegrationMockWorkerManager>,
    eventMethod: keyof typeof mockManager,
    data: T
) {
    const method = mockManager[eventMethod];
    if (method && typeof method === 'function' && 'mock' in method) {
        const mockMethod = method as Mock;
        mockMethod.mock.calls.forEach((call: unknown[]) => {
            const callback = call[0];
            if (typeof callback === 'function') {
                callback(data);
            }
        });
    }
}