import * as Comlink from 'comlink';
import { WORKER_MESSAGES, WorkerMessage } from '../apple1/types/worker-messages';
import type { IWorkerAPI } from '../apple1/types/worker-api';
import type { EmulatorState } from '../apple1/types/emulator-state';
import type { VideoData } from '../apple1/types/video';
import type {
    FilteredDebugData,
    MemoryMapData,
    EngineStatusData,
    EngineComparisonData,
} from '../apple1/types/worker-messages';
// CONFIG no longer needed since Comlink is the only implementation

/**
 * WorkerManager provides a unified interface for worker communication
 * that can switch between the legacy postMessage approach and the new
 * Comlink-based implementation based on a feature flag.
 *
 * This enables a gradual migration and easy rollback if needed.
 */
export class WorkerManager {
    private worker: Worker | null = null;
    private comlinkAPI: Comlink.Remote<IWorkerAPI> | null = null;
    // useComlink field removed - always using Comlink now
    private messageHandlers: Map<WORKER_MESSAGES, (data: unknown) => void> = new Map();

    constructor() {
        console.log('WorkerManager: Using Comlink mode');
    }

    /**
     * Initialize the worker with the appropriate implementation
     */
    async initializeWorker(): Promise<Worker> {
        if (this.worker) {
            return this.worker;
        }

        // Load the Comlink-based worker (only implementation)
        this.worker = new Worker(new URL('../apple1/Apple.worker.comlink.ts', import.meta.url), { type: 'module' });

        // Wrap the worker with Comlink
        this.comlinkAPI = Comlink.wrap<IWorkerAPI>(this.worker);

        // Set up message handler for backward compatibility
        // Note: All events now go through Comlink, this is kept for potential future use
        this.worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
            const handler = this.messageHandlers.get(e.data.type);
            if (handler && 'data' in e.data) {
                handler(e.data.data);
            }
        };

        return this.worker;
    }

    /**
     * Get the raw worker instance (for compatibility)
     */
    getWorker(): Worker | null {
        return this.worker;
    }

    /**
     * Register a message handler
     */
    onMessage(type: WORKER_MESSAGES, handler: (data: unknown) => void): void {
        this.messageHandlers.set(type, handler);
    }

    /**
     * Remove a message handler
     */
    offMessage(type: WORKER_MESSAGES): void {
        this.messageHandlers.delete(type);
    }

    /**
     * Invoke an operation on the Comlink worker API if it is initialized,
     * otherwise resolve to `undefined` (a no-op). Collapses the
     * `if (this.comlinkAPI) return await this.comlinkAPI.x(...)` boilerplate.
     */
    private async call<T>(fn: (api: Comlink.Remote<IWorkerAPI>) => Promise<T>): Promise<T | void> {
        if (this.comlinkAPI) {
            return await fn(this.comlinkAPI);
        }
    }

    /**
     * Like {@link call} but throws when the worker is not initialized — for
     * methods whose contract is non-void (callers depend on a real result).
     */
    private async callOrThrow<T>(fn: (api: Comlink.Remote<IWorkerAPI>) => Promise<T>): Promise<T> {
        if (this.comlinkAPI) {
            return await fn(this.comlinkAPI);
        }
        throw new Error('Worker not initialized');
    }

    // ========== Emulation Control ==========

    async pauseEmulation(): Promise<void> {
        await this.call((api) => api.pauseEmulation());
    }

    async resumeEmulation(): Promise<void> {
        await this.call((api) => api.resumeEmulation());
    }

    async step(): Promise<FilteredDebugData | void> {
        return this.call((api) => api.step());
    }

    async saveState(): Promise<EmulatorState | void> {
        return this.call((api) => api.saveState());
    }

    async loadState(state: EmulatorState): Promise<void> {
        await this.call((api) => api.loadState(state));
    }

    // ========== Breakpoint Management ==========

    async setBreakpoint(address: number): Promise<number[] | void> {
        return this.call((api) => api.setBreakpoint(address));
    }

    async clearBreakpoint(address: number): Promise<number[] | void> {
        return this.call((api) => api.clearBreakpoint(address));
    }

    async clearAllBreakpoints(): Promise<void> {
        await this.call((api) => api.clearAllBreakpoints());
    }

    async runToAddress(address: number): Promise<void> {
        await this.call((api) => api.runToAddress(address));
    }

    async getBreakpoints(): Promise<number[] | void> {
        return this.call((api) => api.getBreakpoints());
    }

    // ========== Memory Operations ==========

    async readMemoryRange(start: number, length: number): Promise<number[] | void> {
        return this.call((api) => api.readMemoryRange(start, length));
    }

    async writeMemory(address: number, value: number): Promise<void> {
        await this.call((api) => api.writeMemory(address, value));
    }

    async getDebugInfo(): Promise<FilteredDebugData | void> {
        return this.call((api) => api.getDebugInfo());
    }

    async getMemoryMap(): Promise<MemoryMapData | void> {
        return this.call((api) => api.getMemoryMap());
    }

    // ========== Configuration ==========

    async setCrtBsSupport(enabled: boolean): Promise<void> {
        await this.call((api) => api.setCrtBsSupport(enabled));
    }

    async setDebuggerActive(active: boolean): Promise<void> {
        await this.call((api) => api.setDebuggerActive(active));
    }

    async setCycleAccurateMode(enabled: boolean): Promise<void> {
        await this.call((api) => api.setCycleAccurateMode(enabled));
    }

    async setCpuProfiling(enabled: boolean): Promise<void> {
        await this.call((api) => api.setCpuProfiling(enabled));
    }

    // ========== Input ==========

    async keyDown(key: string): Promise<void> {
        await this.call((api) => api.keyDown(key));
    }

    // ========== Engine Management ==========

    async switchEngine(engineType: 'JS' | 'WASM'): Promise<void> {
        await this.callOrThrow((api) => api.switchEngine(engineType));
    }

    async getEngineStatus(): Promise<EngineStatusData> {
        return this.callOrThrow((api) => api.getEngineStatus());
    }

    async compareEngines(): Promise<EngineComparisonData> {
        return this.callOrThrow((api) => api.compareEngines());
    }

    // Auto-switch feature has been removed for simplicity

    // ========== Event Subscriptions (Comlink only) ==========

    async onVideoUpdate(callback: (data: VideoData) => void): Promise<(() => void) | void> {
        if (this.comlinkAPI) {
            try {
                console.log('WorkerManager: Setting up video update subscription');
                // Proxy the callback for cross-boundary communication
                const proxiedCallback = Comlink.proxy(callback);
                const unsubscribe = await this.comlinkAPI.onVideoUpdate(proxiedCallback);
                console.log('WorkerManager: Video update subscription successful');
                return unsubscribe;
            } catch (error) {
                console.error('WorkerManager: Error setting up video update subscription:', error);
                throw error;
            }
        }
        // Legacy mode removed
    }

    async onBreakpointHit(callback: (address: number) => void): Promise<(() => void) | void> {
        if (this.comlinkAPI) {
            const proxiedCallback = Comlink.proxy(callback);
            return await this.comlinkAPI.onBreakpointHit(proxiedCallback);
        }
        // Legacy mode removed
    }

    async onEmulationStatus(callback: (status: 'running' | 'paused') => void): Promise<(() => void) | void> {
        if (this.comlinkAPI) {
            const proxiedCallback = Comlink.proxy(callback);
            return await this.comlinkAPI.onEmulationStatus(proxiedCallback);
        }
        // Legacy mode removed
    }

    async onClockData(
        callback: (data: { cycles: number; frequency: number; totalCycles: number }) => void,
    ): Promise<(() => void) | void> {
        if (this.comlinkAPI) {
            const proxiedCallback = Comlink.proxy(callback);
            return await this.comlinkAPI.onClockData(proxiedCallback);
        }
        // Legacy mode removed
    }

    async onRunToCursorTarget(callback: (target: number | null) => void): Promise<(() => void) | void> {
        if (this.comlinkAPI) {
            const proxiedCallback = Comlink.proxy(callback);
            return await this.comlinkAPI.onRunToCursorTarget(proxiedCallback);
        }
        // Legacy mode removed
    }

    /**
     * Terminate the worker and clean up resources
     */
    terminate(): void {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this.comlinkAPI = null;
        }
        this.messageHandlers.clear();
    }
}

// Export a singleton instance
export const workerManager = new WorkerManager();
