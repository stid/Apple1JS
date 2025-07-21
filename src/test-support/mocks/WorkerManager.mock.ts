import { vi } from 'vitest';
import type { WorkerManager } from '../../services/WorkerManager';
import type { EmulatorState } from '../../apple1/types/emulator-state';
import type { DebugData, MemoryMapData } from '../../apple1/types/worker-messages';
import { WORKER_MESSAGES } from '../../apple1/types/worker-messages';

/**
 * Creates a mock WorkerManager instance for testing
 * This provides all the methods that components expect from WorkerManager
 */
export function createMockWorkerManager(): WorkerManager {
    const mockWorker = {
        postMessage: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        terminate: vi.fn(),
        onmessage: null,
        onerror: null,
        onmessageerror: null,
        dispatchEvent: vi.fn(),
    } as unknown as Worker;
    
    const mockWorkerManager = {
        // Private fields
        worker: mockWorker,
        comlinkAPI: null,
        messageHandlers: new Map(),
        
        // Initialization
        initializeWorker: vi.fn().mockResolvedValue(mockWorker),
        getWorker: vi.fn().mockReturnValue(mockWorker),
        
        // Message handling
        onMessage: vi.fn(),
        offMessage: vi.fn(),
        
        // Emulation Control
        pauseEmulation: vi.fn().mockResolvedValue(undefined),
        resumeEmulation: vi.fn().mockResolvedValue(undefined),
        step: vi.fn().mockResolvedValue({ 
            CPU: {
                pc: 0x0000, 
                sp: 0xFF, 
                a: 0x00, 
                x: 0x00, 
                y: 0x00, 
                status: 0x00,
                cycles: 0
            }
        } as DebugData),
        saveState: vi.fn().mockResolvedValue({} as EmulatorState),
        loadState: vi.fn().mockResolvedValue(undefined),
        
        // Breakpoint Management
        setBreakpoint: vi.fn().mockResolvedValue([]),
        clearBreakpoint: vi.fn().mockResolvedValue([]),
        clearAllBreakpoints: vi.fn().mockResolvedValue(undefined),
        runToAddress: vi.fn().mockResolvedValue(undefined),
        getBreakpoints: vi.fn().mockResolvedValue([]),
        
        // Memory Operations
        readMemoryRange: vi.fn().mockResolvedValue(new Array(256).fill(0)),
        writeMemory: vi.fn().mockResolvedValue(undefined),
        getDebugInfo: vi.fn().mockResolvedValue({ 
            CPU: {
                pc: 0x0000, 
                sp: 0xFF, 
                a: 0x00, 
                x: 0x00, 
                y: 0x00, 
                status: 0x00,
                cycles: 0
            }
        } as DebugData),
        getMemoryMap: vi.fn().mockResolvedValue({
            regions: [
                { start: 0x0000, end: 0x0FFF, type: 'RAM', writable: true },
                { start: 0xFF00, end: 0xFFFF, type: 'ROM', writable: false }
            ]
        } as MemoryMapData),
        
        // Configuration
        setCrtBsSupport: vi.fn().mockResolvedValue(undefined),
        setDebuggerActive: vi.fn().mockResolvedValue(undefined),
        setCycleAccurateMode: vi.fn().mockResolvedValue(undefined),
        setCpuProfiling: vi.fn().mockResolvedValue(undefined),
        
        // Input
        keyDown: vi.fn().mockResolvedValue(undefined),
        
        // Event Subscriptions
        onVideoUpdate: vi.fn().mockResolvedValue(() => {}),
        onBreakpointHit: vi.fn().mockResolvedValue(() => {}),
        onEmulationStatus: vi.fn().mockResolvedValue(() => {}),
        onLogMessage: vi.fn().mockResolvedValue(() => {}),
        onClockData: vi.fn().mockResolvedValue(() => {}),
        onRunToCursorTarget: vi.fn().mockResolvedValue(() => {}),
        
        // Cleanup
        terminate: vi.fn()
    } as unknown as WorkerManager;
    
    return mockWorkerManager;
}

/**
 * Creates a minimal mock WorkerManager for simple tests
 */
export function createMinimalMockWorkerManager(): Partial<WorkerManager> {
    const mockWorker = {
        postMessage: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        terminate: vi.fn()
    } as unknown as Worker;
    
    return {
        initializeWorker: vi.fn().mockResolvedValue(mockWorker),
        pauseEmulation: vi.fn().mockResolvedValue(undefined),
        resumeEmulation: vi.fn().mockResolvedValue(undefined),
        setBreakpoint: vi.fn().mockResolvedValue([]),
        clearBreakpoint: vi.fn().mockResolvedValue([]),
        readMemoryRange: vi.fn().mockResolvedValue([]),
        writeMemory: vi.fn().mockResolvedValue(undefined),
        keyDown: vi.fn().mockResolvedValue(undefined),
        onVideoUpdate: vi.fn().mockResolvedValue(() => {}),
        terminate: vi.fn()
    };
}

/**
 * Helper to simulate worker messages in tests
 */
export function simulateWorkerMessage(
    workerManager: WorkerManager,
    type: WORKER_MESSAGES,
    data: unknown
): void {
    const handlers = (workerManager as unknown as { messageHandlers: Map<WORKER_MESSAGES, (data: unknown) => void> }).messageHandlers;
    const handler = handlers.get(type);
    if (handler) {
        handler(data);
    }
}