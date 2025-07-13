import * as Comlink from 'comlink';
import { WorkerState } from './WorkerState';
import { WorkerAPI } from './WorkerAPI';
import type { VideoData } from './types/video';
import { WORKER_MESSAGES } from './types/worker-messages';
import type { LogMessageData, WorkerMessage } from './types/worker-messages';
import type { IWorkerAPI } from './types/worker-api';
import type { EmulatorState } from './types/emulator-state';

// Declare postMessage for worker context
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
    // Only keep videoCallbacks for hybrid mode
    private videoCallbacks = new Set<(data: VideoData) => void>();

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
                
                // Only handle video updates here for hybrid mode
                if (workerMessage.type === WORKER_MESSAGES.UPDATE_VIDEO_BUFFER && 'data' in workerMessage) {
                    this.videoCallbacks.forEach(cb => cb(workerMessage.data as VideoData));
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

    // Event subscription methods - forward to underlying WorkerAPI with Comlink proxy
    onVideoUpdate(callback: (data: VideoData) => void): () => void {
        const proxiedCallback = Comlink.proxy(callback);
        const unsubscribe = this.api.onVideoUpdate(proxiedCallback);
        // Also track for hybrid mode
        this.videoCallbacks.add(proxiedCallback);
        return () => {
            unsubscribe();
            this.videoCallbacks.delete(proxiedCallback);
        };
    }

    onBreakpointHit(callback: (address: number) => void): () => void {
        const proxiedCallback = Comlink.proxy(callback);
        return this.api.onBreakpointHit(proxiedCallback);
    }

    onEmulationStatus(callback: (status: 'running' | 'paused') => void): () => void {
        const proxiedCallback = Comlink.proxy(callback);
        return this.api.onEmulationStatus(proxiedCallback);
    }

    onLogMessage(callback: (data: LogMessageData) => void): () => void {
        const proxiedCallback = Comlink.proxy(callback);
        return this.api.onLogMessage(proxiedCallback);
    }

    onClockData(callback: (data: { cycles: number; frequency: number; totalCycles: number }) => void): () => void {
        const proxiedCallback = Comlink.proxy(callback);
        return this.api.onClockData(proxiedCallback);
    }

    onRunToCursorTarget(callback: (target: number | null) => void): () => void {
        const proxiedCallback = Comlink.proxy(callback);
        return this.api.onRunToCursorTarget(proxiedCallback);
    }
}

// Create and expose the Comlink API
const comlinkAPI = new ComlinkWorkerAPI(workerAPI);
Comlink.expose(comlinkAPI);

// Add backward compatibility for postMessage-based components
// This allows existing components to continue working while we migrate them
globalThis.onmessage = async function (e: MessageEvent<WorkerMessage>) {
    const { type } = e.data;
    const data = 'data' in e.data ? e.data.data : undefined;
    
    try {
        switch (type) {
            case WORKER_MESSAGES.GET_MEMORY_RANGE:
                if (data && typeof data === 'object' && 'start' in data && 'length' in data) {
                    const memoryData = comlinkAPI.readMemoryRange(data.start as number, data.length as number);
                    postMessage({
                        type: WORKER_MESSAGES.MEMORY_RANGE_DATA,
                        data: {
                            start: data.start,
                            data: memoryData
                        }
                    });
                }
                break;
                
            case WORKER_MESSAGES.KEY_DOWN:
                if (typeof data === 'string') {
                    comlinkAPI.keyDown(data);
                }
                break;
                
            case WORKER_MESSAGES.SET_DEBUGGER_ACTIVE:
                if (typeof data === 'boolean') {
                    comlinkAPI.setDebuggerActive(data);
                }
                break;
                
            case WORKER_MESSAGES.SAVE_STATE: {
                const state = comlinkAPI.saveState();
                postMessage({
                    type: WORKER_MESSAGES.STATE_DATA,
                    data: state
                });
                break;
            }
                
            case WORKER_MESSAGES.LOAD_STATE:
                if (data && typeof data === 'object') {
                    comlinkAPI.loadState(data as EmulatorState);
                }
                break;
                
            case WORKER_MESSAGES.SET_CRT_BS_SUPPORT_FLAG:
                if (typeof data === 'boolean') {
                    comlinkAPI.setCrtBsSupport(data);
                }
                break;
                
            case WORKER_MESSAGES.SET_CYCLE_ACCURATE_TIMING:
                if (typeof data === 'boolean') {
                    comlinkAPI.setCycleAccurateMode(data);
                }
                break;
                
            case WORKER_MESSAGES.DEBUG_INFO: {
                const debugInfo = comlinkAPI.getDebugInfo();
                postMessage({
                    type: WORKER_MESSAGES.DEBUG_DATA,
                    data: debugInfo
                });
                break;
            }
                
            case WORKER_MESSAGES.RUN_TO_ADDRESS:
                if (typeof data === 'number') {
                    comlinkAPI.runToAddress(data);
                }
                break;
                
            default:
                console.warn(`Unhandled postMessage type: ${type}`);
                break;
        }
    } catch (error) {
        console.error(`Error handling postMessage ${type}:`, error);
    }
};

// Start the emulation loop
workerState.startEmulation();