import * as Comlink from 'comlink';
import { WorkerState } from './WorkerState';
import { WorkerAPI } from './WorkerAPI';
import type { VideoData } from './types/video';
import type { LogMessageData } from './types/worker-messages';
import type { IWorkerAPI } from './types/worker-api';
import type { EmulatorState } from './types/emulator-state';

/**
 * Comlink-based worker implementation for Apple1JS.
 * This provides a clean RPC-style API for worker communication,
 * replacing the previous postMessage-based implementation.
 * 
 * All operations including high-frequency video updates now use Comlink
 * for consistent type-safe communication.
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
    private subscriptionId = 0;
    private subscriptions = new Map<number, () => void>();

    constructor(private api: WorkerAPI) {
        // No hybrid mode support - pure Comlink implementation
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

    // Event subscription methods - forward to underlying WorkerAPI
    // Note: Callbacks are already proxied by WorkerManager
    onVideoUpdate(callback: (data: VideoData) => void): () => void {
        try {
            const unsubscribe = this.api.onVideoUpdate(callback);
            // Store the unsubscribe function and return a serializable function
            const id = ++this.subscriptionId;
            this.subscriptions.set(id, unsubscribe);
            
            // Return a proxy function that can be called from the main thread
            return Comlink.proxy(() => {
                const unsub = this.subscriptions.get(id);
                if (unsub) {
                    unsub();
                    this.subscriptions.delete(id);
                }
            });
        } catch (error) {
            console.error('Error setting up video update subscription:', error);
            throw error;
        }
    }

    onBreakpointHit(callback: (address: number) => void): () => void {
        const unsubscribe = this.api.onBreakpointHit(callback);
        const id = ++this.subscriptionId;
        this.subscriptions.set(id, unsubscribe);
        return Comlink.proxy(() => {
            const unsub = this.subscriptions.get(id);
            if (unsub) {
                unsub();
                this.subscriptions.delete(id);
            }
        });
    }

    onEmulationStatus(callback: (status: 'running' | 'paused') => void): () => void {
        const unsubscribe = this.api.onEmulationStatus(callback);
        const id = ++this.subscriptionId;
        this.subscriptions.set(id, unsubscribe);
        return Comlink.proxy(() => {
            const unsub = this.subscriptions.get(id);
            if (unsub) {
                unsub();
                this.subscriptions.delete(id);
            }
        });
    }

    onLogMessage(callback: (data: LogMessageData) => void): () => void {
        const unsubscribe = this.api.onLogMessage(callback);
        const id = ++this.subscriptionId;
        this.subscriptions.set(id, unsubscribe);
        return Comlink.proxy(() => {
            const unsub = this.subscriptions.get(id);
            if (unsub) {
                unsub();
                this.subscriptions.delete(id);
            }
        });
    }

    onClockData(callback: (data: { cycles: number; frequency: number; totalCycles: number }) => void): () => void {
        const unsubscribe = this.api.onClockData(callback);
        const id = ++this.subscriptionId;
        this.subscriptions.set(id, unsubscribe);
        return Comlink.proxy(() => {
            const unsub = this.subscriptions.get(id);
            if (unsub) {
                unsub();
                this.subscriptions.delete(id);
            }
        });
    }

    onRunToCursorTarget(callback: (target: number | null) => void): () => void {
        const unsubscribe = this.api.onRunToCursorTarget(callback);
        const id = ++this.subscriptionId;
        this.subscriptions.set(id, unsubscribe);
        return Comlink.proxy(() => {
            const unsub = this.subscriptions.get(id);
            if (unsub) {
                unsub();
                this.subscriptions.delete(id);
            }
        });
    }
}

// Create and expose the Comlink API
const comlinkAPI = new ComlinkWorkerAPI(workerAPI);
Comlink.expose(comlinkAPI);

// Note: Backward compatibility has been removed.
// All components must now use WorkerManager for communication.

// Start the emulation loop
workerState.startEmulation();