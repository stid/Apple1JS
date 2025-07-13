import * as Comlink from 'comlink';
import { WorkerState } from './WorkerState';
import { WorkerAPI } from './WorkerAPI';
import type { VideoData } from './types/video';
import type { LogMessageData } from './types/worker-messages';
import type { IWorkerAPI } from './types/worker-api';
import type { EmulatorState } from './types/emulator-state';

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

    // Event subscription methods - forward to underlying WorkerAPI with Comlink proxy
    onVideoUpdate(callback: (data: VideoData) => void): () => void {
        const proxiedCallback = Comlink.proxy(callback);
        return this.api.onVideoUpdate(proxiedCallback);
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

// Note: Backward compatibility has been removed.
// All components must now use WorkerManager for communication.

// Start the emulation loop
workerState.startEmulation();