import * as Comlink from 'comlink';
import { WORKER_MESSAGES, WorkerMessage } from '../apple1/types/worker-messages';
import type { IWorkerAPI } from '../apple1/types/worker-api';
import type { EmulatorState } from '../apple1/types/emulator-state';
import type { VideoData } from '../apple1/types/video';
import type { LogMessageData, DebugData } from '../apple1/types/worker-messages';
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
        this.worker = new Worker(
            new URL('../apple1/Apple.worker.comlink.ts', import.meta.url),
            { type: 'module' }
        );
        
        // Wrap the worker with Comlink
        this.comlinkAPI = Comlink.wrap<IWorkerAPI>(this.worker);
        
        // Set up message handler for hybrid mode (video updates still use postMessage)
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

    // ========== Emulation Control ==========

    async pauseEmulation(): Promise<void> {
        if (this.comlinkAPI) {
            await this.comlinkAPI.pauseEmulation();
        }
    }

    async resumeEmulation(): Promise<void> {
        if (this.comlinkAPI) {
            await this.comlinkAPI.resumeEmulation();
        }
    }

    async step(): Promise<DebugData | void> {
        if (this.comlinkAPI) {
            return await this.comlinkAPI.step();
        }
    }

    async saveState(): Promise<EmulatorState | void> {
        if (this.comlinkAPI) {
            return await this.comlinkAPI.saveState();
        }
    }

    async loadState(state: EmulatorState): Promise<void> {
        if (this.comlinkAPI) {
            await this.comlinkAPI.loadState(state);
        }
    }

    // ========== Breakpoint Management ==========

    async setBreakpoint(address: number): Promise<number[] | void> {
        if (this.comlinkAPI) {
            return await this.comlinkAPI.setBreakpoint(address);
        }
    }

    async clearBreakpoint(address: number): Promise<number[] | void> {
        if (this.comlinkAPI) {
            return await this.comlinkAPI.clearBreakpoint(address);
        }
    }

    async clearAllBreakpoints(): Promise<void> {
        if (this.comlinkAPI) {
            await this.comlinkAPI.clearAllBreakpoints();
        }
    }

    async getBreakpoints(): Promise<number[] | void> {
        if (this.comlinkAPI) {
            return await this.comlinkAPI.getBreakpoints();
        }
    }

    // ========== Memory Operations ==========

    async readMemoryRange(start: number, length: number): Promise<number[] | void> {
        if (this.comlinkAPI) {
            return await this.comlinkAPI.readMemoryRange(start, length);
        }
    }

    async writeMemory(address: number, value: number): Promise<void> {
        if (this.comlinkAPI) {
            await this.comlinkAPI.writeMemory(address, value);
        }
    }

    // ========== Configuration ==========

    async setCrtBsSupport(enabled: boolean): Promise<void> {
        if (this.comlinkAPI) {
            await this.comlinkAPI.setCrtBsSupport(enabled);
        }
    }

    async setDebuggerActive(active: boolean): Promise<void> {
        if (this.comlinkAPI) {
            await this.comlinkAPI.setDebuggerActive(active);
        }
    }

    // ========== Input ==========

    async keyDown(key: string): Promise<void> {
        if (this.comlinkAPI) {
            await this.comlinkAPI.keyDown(key);
        }
    }

    // ========== Event Subscriptions (Comlink only) ==========

    async onVideoUpdate(callback: (data: VideoData) => void): Promise<(() => void) | void> {
        if (this.comlinkAPI) {
            return await this.comlinkAPI.onVideoUpdate(callback);
        }
        // Legacy mode removed
    }

    async onBreakpointHit(callback: (address: number) => void): Promise<(() => void) | void> {
        if (this.comlinkAPI) {
            return await this.comlinkAPI.onBreakpointHit(callback);
        }
        // Legacy mode removed
    }

    async onEmulationStatus(callback: (status: 'running' | 'paused') => void): Promise<(() => void) | void> {
        if (this.comlinkAPI) {
            return await this.comlinkAPI.onEmulationStatus(callback);
        }
        // Legacy mode removed
    }

    async onLogMessage(callback: (data: LogMessageData) => void): Promise<(() => void) | void> {
        if (this.comlinkAPI) {
            return await this.comlinkAPI.onLogMessage(callback);
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