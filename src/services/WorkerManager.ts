import * as Comlink from 'comlink';
import { WORKER_MESSAGES, WorkerMessage, sendWorkerMessage } from '../apple1/types/worker-messages';
import type { IWorkerAPI } from '../apple1/types/worker-api';
import type { EmulatorState } from '../apple1/types/emulator-state';
import type { VideoData } from '../apple1/types/video';
import type { LogMessageData, DebugData } from '../apple1/types/worker-messages';
import { CONFIG } from '../config';

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
    private useComlink: boolean;
    private messageHandlers: Map<WORKER_MESSAGES, (data: unknown) => void> = new Map();

    constructor() {
        // Check feature flag from config
        this.useComlink = CONFIG.USE_COMLINK_WORKER;
        console.log(`WorkerManager: Using ${this.useComlink ? 'Comlink' : 'postMessage'} mode`);
    }

    /**
     * Initialize the worker with the appropriate implementation
     */
    async initializeWorker(): Promise<Worker> {
        if (this.worker) {
            return this.worker;
        }

        if (this.useComlink) {
            // Load the Comlink-based worker
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
        } else {
            // Legacy implementation has been removed
            throw new Error('Legacy postMessage worker implementation has been removed. Please set USE_COMLINK_WORKER to true in config.ts');
        }

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
        if (this.useComlink && this.comlinkAPI) {
            await this.comlinkAPI.pauseEmulation();
        } else if (this.worker) {
            sendWorkerMessage(this.worker, WORKER_MESSAGES.PAUSE_EMULATION);
        }
    }

    async resumeEmulation(): Promise<void> {
        if (this.useComlink && this.comlinkAPI) {
            await this.comlinkAPI.resumeEmulation();
        } else if (this.worker) {
            sendWorkerMessage(this.worker, WORKER_MESSAGES.RESUME_EMULATION);
        }
    }

    async step(): Promise<DebugData | void> {
        if (this.useComlink && this.comlinkAPI) {
            return await this.comlinkAPI.step();
        } else if (this.worker) {
            sendWorkerMessage(this.worker, WORKER_MESSAGES.STEP);
            // In legacy mode, debug data comes via message handler
        }
    }

    async saveState(): Promise<EmulatorState | void> {
        if (this.useComlink && this.comlinkAPI) {
            return await this.comlinkAPI.saveState();
        } else if (this.worker) {
            sendWorkerMessage(this.worker, WORKER_MESSAGES.SAVE_STATE);
            // In legacy mode, state data comes via message handler
        }
    }

    async loadState(state: EmulatorState): Promise<void> {
        if (this.useComlink && this.comlinkAPI) {
            await this.comlinkAPI.loadState(state);
        } else if (this.worker) {
            sendWorkerMessage(this.worker, WORKER_MESSAGES.LOAD_STATE, state);
        }
    }

    // ========== Breakpoint Management ==========

    async setBreakpoint(address: number): Promise<number[] | void> {
        if (this.useComlink && this.comlinkAPI) {
            return await this.comlinkAPI.setBreakpoint(address);
        } else if (this.worker) {
            sendWorkerMessage(this.worker, WORKER_MESSAGES.SET_BREAKPOINT, address);
            // In legacy mode, breakpoint list comes via message handler
        }
    }

    async clearBreakpoint(address: number): Promise<number[] | void> {
        if (this.useComlink && this.comlinkAPI) {
            return await this.comlinkAPI.clearBreakpoint(address);
        } else if (this.worker) {
            sendWorkerMessage(this.worker, WORKER_MESSAGES.CLEAR_BREAKPOINT, address);
            // In legacy mode, breakpoint list comes via message handler
        }
    }

    async clearAllBreakpoints(): Promise<void> {
        if (this.useComlink && this.comlinkAPI) {
            await this.comlinkAPI.clearAllBreakpoints();
        } else if (this.worker) {
            sendWorkerMessage(this.worker, WORKER_MESSAGES.CLEAR_ALL_BREAKPOINTS);
        }
    }

    async getBreakpoints(): Promise<number[] | void> {
        if (this.useComlink && this.comlinkAPI) {
            return await this.comlinkAPI.getBreakpoints();
        } else if (this.worker) {
            sendWorkerMessage(this.worker, WORKER_MESSAGES.GET_BREAKPOINTS);
            // In legacy mode, breakpoint list comes via message handler
        }
    }

    // ========== Memory Operations ==========

    async readMemoryRange(start: number, length: number): Promise<number[] | void> {
        if (this.useComlink && this.comlinkAPI) {
            return await this.comlinkAPI.readMemoryRange(start, length);
        } else if (this.worker) {
            sendWorkerMessage(this.worker, WORKER_MESSAGES.GET_MEMORY_RANGE, { start, length });
            // In legacy mode, memory data comes via message handler
        }
    }

    async writeMemory(address: number, value: number): Promise<void> {
        if (this.useComlink && this.comlinkAPI) {
            await this.comlinkAPI.writeMemory(address, value);
        } else if (this.worker) {
            sendWorkerMessage(this.worker, WORKER_MESSAGES.WRITE_MEMORY, { address, value });
        }
    }

    // ========== Configuration ==========

    async setCrtBsSupport(enabled: boolean): Promise<void> {
        if (this.useComlink && this.comlinkAPI) {
            await this.comlinkAPI.setCrtBsSupport(enabled);
        } else if (this.worker) {
            sendWorkerMessage(this.worker, WORKER_MESSAGES.SET_CRT_BS_SUPPORT_FLAG, enabled);
        }
    }

    async setDebuggerActive(active: boolean): Promise<void> {
        if (this.useComlink && this.comlinkAPI) {
            await this.comlinkAPI.setDebuggerActive(active);
        } else if (this.worker) {
            sendWorkerMessage(this.worker, WORKER_MESSAGES.SET_DEBUGGER_ACTIVE, active);
        }
    }

    // ========== Input ==========

    async keyDown(key: string): Promise<void> {
        if (this.useComlink && this.comlinkAPI) {
            await this.comlinkAPI.keyDown(key);
        } else if (this.worker) {
            sendWorkerMessage(this.worker, WORKER_MESSAGES.KEY_DOWN, key);
        }
    }

    // ========== Event Subscriptions (Comlink only) ==========

    async onVideoUpdate(callback: (data: VideoData) => void): Promise<(() => void) | void> {
        if (this.useComlink && this.comlinkAPI) {
            return await this.comlinkAPI.onVideoUpdate(callback);
        }
        // In legacy mode, use onMessage with WORKER_MESSAGES.UPDATE_VIDEO_BUFFER
    }

    async onBreakpointHit(callback: (address: number) => void): Promise<(() => void) | void> {
        if (this.useComlink && this.comlinkAPI) {
            return await this.comlinkAPI.onBreakpointHit(callback);
        }
        // In legacy mode, use onMessage with WORKER_MESSAGES.BREAKPOINT_HIT
    }

    async onEmulationStatus(callback: (status: 'running' | 'paused') => void): Promise<(() => void) | void> {
        if (this.useComlink && this.comlinkAPI) {
            return await this.comlinkAPI.onEmulationStatus(callback);
        }
        // In legacy mode, use onMessage with WORKER_MESSAGES.EMULATION_STATUS
    }

    async onLogMessage(callback: (data: LogMessageData) => void): Promise<(() => void) | void> {
        if (this.useComlink && this.comlinkAPI) {
            return await this.comlinkAPI.onLogMessage(callback);
        }
        // In legacy mode, use onMessage with WORKER_MESSAGES.LOG_MESSAGE
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