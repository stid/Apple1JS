import * as Comlink from 'comlink';
import { WorkerState } from './WorkerState';
import { WorkerAPI } from './WorkerAPI';
import type { VideoData } from './types/video';
import { WORKER_MESSAGES } from './types/worker-messages';
import type { LogMessageData, WorkerMessage } from './types/worker-messages';
import type { IWorkerAPI } from './types/worker-api';
import type { EmulatorState } from './types/emulator-state';

// Declare postMessage for worker context - eslint-disable-next-line is needed because 
// it's only used as a type but eslint doesn't understand that
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare function postMessage(message: unknown, transfer?: Transferable[]): void;

/**
 * Comlink-based worker implementation for Apple1JS.
 * This is a parallel implementation that will eventually replace the 
 * postMessage-based worker.
 * 
 * Phase 1: Hybrid approach
 * - Command operations use Comlink
 * - High-frequency video updates remain on postMessage for performance
 */

// Create the worker state instance
const workerState = new WorkerState();

// Create the worker API instance
const workerAPI = new WorkerAPI(workerState);

// Export for backwards compatibility during migration
export const video = workerState.video;
export const keyboard = workerState.keyboard;

// Clean up on worker termination
globalThis.addEventListener('beforeunload', () => {
    workerState.cleanup();
});

/**
 * Enhanced WorkerAPI with Comlink event handling
 * This wraps the existing WorkerAPI and adds event subscription support
 */
class ComlinkWorkerAPI implements IWorkerAPI {
    private videoCallbacks = new Set<(data: VideoData) => void>();
    private breakpointCallbacks = new Set<(address: number) => void>();
    private statusCallbacks = new Set<(status: 'running' | 'paused') => void>();
    private logCallbacks = new Set<(data: LogMessageData) => void>();
    private clockCallbacks = new Set<(data: { cycles: number; frequency: number; totalCycles: number }) => void>();
    private runToCursorCallbacks = new Set<(target: number | null) => void>();

    constructor(private api: WorkerAPI) {
        // Set up internal event handlers that will notify callbacks
        this.setupEventHandlers();
    }

    private setupEventHandlers() {
        // Override postMessage calls in WorkerState to trigger callbacks
        // This is temporary until we fully migrate to event-based system
        
        // Store original postMessage
        const originalPostMessage = globalThis.postMessage;
        
        // Override postMessage to intercept events
        (globalThis as { postMessage: (message: unknown, transfer?: Transferable[]) => void }).postMessage = (message: unknown) => {
            // Still send via postMessage for hybrid mode
            originalPostMessage(message);
            
            // Type guard to check if message is WorkerMessage
            if (typeof message === 'object' && message !== null && 'type' in message) {
                const workerMessage = message as WorkerMessage;
                
                // Also trigger Comlink callbacks based on message type
                if (workerMessage.type === WORKER_MESSAGES.BREAKPOINT_HIT && 'data' in workerMessage) {
                    this.breakpointCallbacks.forEach(cb => cb(workerMessage.data as number));
                } else if (workerMessage.type === WORKER_MESSAGES.EMULATION_STATUS && 'data' in workerMessage) {
                    const data = workerMessage.data as { paused: boolean };
                    const status = data.paused ? 'paused' : 'running';
                    this.statusCallbacks.forEach(cb => cb(status));
                } else if (workerMessage.type === WORKER_MESSAGES.LOG_MESSAGE && 'data' in workerMessage) {
                    this.logCallbacks.forEach(cb => cb(workerMessage.data as LogMessageData));
                } else if (workerMessage.type === WORKER_MESSAGES.UPDATE_VIDEO_BUFFER && 'data' in workerMessage) {
                    // For now, video updates still go through postMessage only
                    // We'll handle callbacks in Phase 2
                }
            }
        };
    }

    // Delegate all core methods to the underlying WorkerAPI
    pauseEmulation = () => this.api.pauseEmulation();
    resumeEmulation = () => this.api.resumeEmulation();
    step = () => this.api.step();
    saveState = () => this.api.saveState();
    loadState = (state: EmulatorState) => this.api.loadState(state);
    getEmulationStatus = () => this.api.getEmulationStatus();
    setBreakpoint = (address: number) => this.api.setBreakpoint(address);
    clearBreakpoint = (address: number) => this.api.clearBreakpoint(address);
    clearAllBreakpoints = () => this.api.clearAllBreakpoints();
    getBreakpoints = () => this.api.getBreakpoints();
    runToAddress = (address: number) => this.api.runToAddress(address);
    readMemoryRange = (start: number, length: number) => this.api.readMemoryRange(start, length);
    writeMemory = (address: number, value: number) => this.api.writeMemory(address, value);
    getMemoryMap = () => this.api.getMemoryMap();
    setCrtBsSupport = (enabled: boolean) => this.api.setCrtBsSupport(enabled);
    setCpuProfiling = (enabled: boolean) => this.api.setCpuProfiling(enabled);
    setCycleAccurateMode = (enabled: boolean) => this.api.setCycleAccurateMode(enabled);
    setDebuggerActive = (active: boolean) => this.api.setDebuggerActive(active);
    keyDown = (key: string) => this.api.keyDown(key);
    getDebugInfo = () => this.api.getDebugInfo();

    // Event subscription methods
    onVideoUpdate(callback: (data: VideoData) => void): () => void {
        const proxiedCallback = Comlink.proxy(callback);
        this.videoCallbacks.add(proxiedCallback);
        return () => {
            this.videoCallbacks.delete(proxiedCallback);
        };
    }

    onBreakpointHit(callback: (address: number) => void): () => void {
        const proxiedCallback = Comlink.proxy(callback);
        this.breakpointCallbacks.add(proxiedCallback);
        return () => {
            this.breakpointCallbacks.delete(proxiedCallback);
        };
    }

    onEmulationStatus(callback: (status: 'running' | 'paused') => void): () => void {
        const proxiedCallback = Comlink.proxy(callback);
        this.statusCallbacks.add(proxiedCallback);
        return () => {
            this.statusCallbacks.delete(proxiedCallback);
        };
    }

    onLogMessage(callback: (data: LogMessageData) => void): () => void {
        const proxiedCallback = Comlink.proxy(callback);
        this.logCallbacks.add(proxiedCallback);
        return () => {
            this.logCallbacks.delete(proxiedCallback);
        };
    }

    onClockData(callback: (data: { cycles: number; frequency: number; totalCycles: number }) => void): () => void {
        const proxiedCallback = Comlink.proxy(callback);
        this.clockCallbacks.add(proxiedCallback);
        return () => {
            this.clockCallbacks.delete(proxiedCallback);
        };
    }

    onRunToCursorTarget(callback: (target: number | null) => void): () => void {
        const proxiedCallback = Comlink.proxy(callback);
        this.runToCursorCallbacks.add(proxiedCallback);
        return () => {
            this.runToCursorCallbacks.delete(proxiedCallback);
        };
    }
}

// Create and expose the Comlink API
const comlinkAPI = new ComlinkWorkerAPI(workerAPI);
Comlink.expose(comlinkAPI);

// Start the emulation loop
workerState.startEmulation();