import { vi, type Mock } from 'vitest';
import type { WorkerMessage } from '../apple1/types/worker-messages';
import type { IWorkerAPI } from '../apple1/types/worker-api';
import type { DebugData, MemoryMapData } from '../apple1/types/worker-messages';
import type { EmulatorState } from '../apple1/types/emulator-state';

/**
 * Creates a mock worker that simulates the postMessage interface
 * for backward compatibility with components that use raw workers.
 */
export function createMockWorker() {
    const messageHandlers = new Map<string, Set<(e: MessageEvent) => void>>();
    
    const mockWorker = {
        postMessage: vi.fn(),
        addEventListener: vi.fn((event: string, handler: (e: MessageEvent) => void) => {
            if (!messageHandlers.has(event)) {
                messageHandlers.set(event, new Set());
            }
            messageHandlers.get(event)!.add(handler);
        }),
        removeEventListener: vi.fn((event: string, handler: (e: MessageEvent) => void) => {
            messageHandlers.get(event)?.delete(handler);
        }),
        terminate: vi.fn(),
        
        // Helper method for tests to simulate worker responses
        simulateMessage: (message: WorkerMessage) => {
            const handlers = messageHandlers.get('message');
            if (handlers) {
                const event = new MessageEvent('message', { data: message });
                handlers.forEach(handler => handler(event));
            }
        }
    };
    
    return mockWorker;
}

/**
 * Creates a mock Comlink Worker API for testing components
 * that will use the new Comlink-based API.
 */
export function createMockWorkerAPI(): IWorkerAPI & { __mocks: Record<string, Mock> } {
    const mocks = {
        pauseEmulation: vi.fn(),
        resumeEmulation: vi.fn(),
        step: vi.fn().mockResolvedValue({
            cpu: { PC: 0, A: 0, X: 0, Y: 0, S: 0 },
            pia: {},
            Bus: {},
            clock: {}
        } as DebugData),
        saveState: vi.fn().mockResolvedValue({} as unknown as EmulatorState),
        loadState: vi.fn().mockResolvedValue(undefined),
        getEmulationStatus: vi.fn().mockResolvedValue('paused' as const),
        setBreakpoint: vi.fn().mockResolvedValue([]),
        clearBreakpoint: vi.fn().mockResolvedValue([]),
        clearAllBreakpoints: vi.fn().mockResolvedValue(undefined),
        getBreakpoints: vi.fn().mockResolvedValue([]),
        runToAddress: vi.fn().mockResolvedValue(undefined),
        readMemoryRange: vi.fn().mockResolvedValue([]),
        writeMemory: vi.fn().mockResolvedValue(undefined),
        getMemoryMap: vi.fn().mockResolvedValue({ regions: [] } as MemoryMapData),
        setCrtBsSupport: vi.fn().mockResolvedValue(undefined),
        setCpuProfiling: vi.fn().mockResolvedValue(undefined),
        setCycleAccurateMode: vi.fn().mockResolvedValue(undefined),
        setDebuggerActive: vi.fn().mockResolvedValue(undefined),
        keyDown: vi.fn().mockResolvedValue(undefined),
        getDebugInfo: vi.fn().mockResolvedValue({
            cpu: { PC: 0, A: 0, X: 0, Y: 0, S: 0 },
            pia: {},
            Bus: {},
            clock: {}
        } as DebugData),
        onVideoUpdate: vi.fn().mockReturnValue(() => {}),
        onBreakpointHit: vi.fn().mockReturnValue(() => {}),
        onEmulationStatus: vi.fn().mockReturnValue(() => {}),
        onLogMessage: vi.fn().mockReturnValue(() => {}),
        onClockData: vi.fn().mockReturnValue(() => {}),
        onRunToCursorTarget: vi.fn().mockReturnValue(() => {})
    };
    
    return {
        ...mocks,
        __mocks: mocks
    };
}

/**
 * Creates a mock WorkerManager for testing.
 */
export function createMockWorkerManager() {
    const mockWorker = createMockWorker();
    const mockAPI = createMockWorkerAPI();
    
    return {
        initializeWorker: vi.fn().mockResolvedValue(mockWorker),
        getWorker: vi.fn().mockReturnValue(mockWorker),
        onMessage: vi.fn(),
        offMessage: vi.fn(),
        terminate: vi.fn(),
        
        // Comlink API methods
        pauseEmulation: mockAPI.pauseEmulation,
        resumeEmulation: mockAPI.resumeEmulation,
        step: mockAPI.step,
        saveState: mockAPI.saveState,
        loadState: mockAPI.loadState,
        setBreakpoint: mockAPI.setBreakpoint,
        clearBreakpoint: mockAPI.clearBreakpoint,
        clearAllBreakpoints: mockAPI.clearAllBreakpoints,
        getBreakpoints: mockAPI.getBreakpoints,
        readMemoryRange: mockAPI.readMemoryRange,
        writeMemory: mockAPI.writeMemory,
        setCrtBsSupport: mockAPI.setCrtBsSupport,
        setDebuggerActive: mockAPI.setDebuggerActive,
        keyDown: mockAPI.keyDown,
        
        // Event subscriptions
        onVideoUpdate: mockAPI.onVideoUpdate,
        onBreakpointHit: mockAPI.onBreakpointHit,
        onEmulationStatus: mockAPI.onEmulationStatus,
        onLogMessage: mockAPI.onLogMessage,
        
        // Access to mocks for assertions
        __mockWorker: mockWorker,
        __mockAPI: mockAPI
    };
}