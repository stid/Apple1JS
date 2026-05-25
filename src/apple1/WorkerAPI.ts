import { WorkerState } from './WorkerState';
import type { IWorkerAPI } from './types/worker-api';
import type { EmulatorState } from './types/emulator-state';
import type { VideoData } from './types/video';
import type {
    FilteredDebugData,
    MemoryMapData,
    ClockData,
    EngineStatusData,
    EngineComparisonData,
} from './types/worker-messages';
import type { EngineMetrics } from './types/worker-api';
import { loggingService } from '../services/LoggingService';
import { Formatters } from '../utils/formatters';

// Note: postMessage no longer needed - using callbacks instead

/**
 * WorkerAPI implements the IWorkerAPI interface and provides
 * all the methods that will be exposed through Comlink.
 * This replaces the large switch statement with a cleaner API.
 */
export class WorkerAPI implements IWorkerAPI {
    // Event callback storage
    private videoCallbacks = new Set<(data: VideoData) => void>();
    private breakpointCallbacks = new Set<(address: number) => void>();
    private statusCallbacks = new Set<(status: 'running' | 'paused') => void>();
    private clockCallbacks = new Set<(data: ClockData) => void>();
    private runToCursorCallbacks = new Set<(target: number | null) => void>();

    constructor(private workerState: WorkerState) {
        // Set up callbacks for WorkerState to use
        this.workerState.setCallbacks({
            onStatus: (status) => {
                this.statusCallbacks.forEach((cb) => cb(status));
            },
            onBreakpoint: (address) => {
                this.breakpointCallbacks.forEach((cb) => cb(address));
            },
        });

        // Set up internal event subscriptions (including logging handler)
        this.setupInternalSubscriptions();
    }

    /**
     * Set up subscriptions to internal components for event distribution
     */
    private setupInternalSubscriptions(): void {
        // Subscribe to video updates
        if (this.workerState.video && typeof this.workerState.video.subscribe === 'function') {
            this.workerState.video.subscribe((data: VideoData) => {
                try {
                    // Ensure data can be structured cloned before sending
                    if (typeof globalThis.structuredClone !== 'undefined') {
                        globalThis.structuredClone(data);
                    }
                    this.videoCallbacks.forEach((cb) => {
                        try {
                            cb(data);
                        } catch (error) {
                            console.error('Error calling video callback:', error);
                        }
                    });
                } catch (error) {
                    console.error('VideoData cannot be structured cloned:', error, data);
                }
            });
        }

        // Note: Logging handler is set up in WorkerState which forwards to our callbacks
    }

    /**
     * Filter debug data to include string, number, and object values
     * Now properly supports nested objects like _PERF_DATA without workarounds
     */
    private filterDebugData(data: Record<string, unknown>): Record<string, string | number | object> {
        const filtered: Record<string, string | number | object> = {};

        for (const [key, value] of Object.entries(data)) {
            if (
                typeof value === 'string' ||
                typeof value === 'number' ||
                (typeof value === 'object' && value !== null)
            ) {
                filtered[key] = value as string | number | object;
            }
        }

        return filtered;
    }

    // ========== Emulation Control ==========

    pauseEmulation(): void {
        this.workerState.apple1.clock.pause();
        this.workerState.isPaused = true;

        // Update debug interval if debugger is active
        if (this.workerState.debuggerActive) {
            this.workerState.updateDebuggerState(true);
        }

        // Notify status callbacks
        this.statusCallbacks.forEach((cb) => cb('paused'));
    }

    resumeEmulation(): void {
        this.workerState.apple1.clock.resume();
        this.workerState.isPaused = false;

        // Update debug interval if debugger is active
        if (this.workerState.debuggerActive) {
            this.workerState.updateDebuggerState(true);
        }

        // Notify status callbacks
        this.statusCallbacks.forEach((cb) => cb('running'));
    }

    step(): FilteredDebugData {
        // First pause the clock to prevent concurrent execution
        this.workerState.apple1.clock.pause();
        this.workerState.isPaused = true;

        // Set stepping flag to bypass breakpoint check for this instruction
        this.workerState.isStepping = true;

        // Execute one instruction
        this.workerState.apple1.cpu.performSingleStep();

        // Clear stepping flag
        this.workerState.isStepping = false;

        // Check if we hit a breakpoint after stepping (at the new PC)
        if (this.workerState.breakpoints.has(this.workerState.apple1.cpu.PC)) {
            this.breakpointCallbacks.forEach((cb) => cb(this.workerState.apple1.cpu.PC));
        }

        // Return debug info, filtering out boolean and object values for backward compatibility
        const { cpu, pia, bus, clock } = this.workerState.apple1;
        return {
            cpu: this.filterDebugData(cpu.toDebug()),
            pia: this.filterDebugData(pia.toDebug()),
            Bus: this.filterDebugData(bus.toDebug()),
            clock: this.filterDebugData(clock.toDebug()),
        };
    }

    saveState(): EmulatorState {
        // Use the deprecated method for now to maintain compatibility
        return this.workerState.apple1.saveEmulatorState();
    }

    loadState(state: EmulatorState): void {
        // Deep clone the state to ensure a new reference
        const clonedState = JSON.parse(JSON.stringify(state));
        this.workerState.apple1.loadEmulatorState(clonedState);

        // Reset clock timing data to prevent timing issues after state restore
        this.workerState.apple1.clock.resetTiming();

        // Always restart the main loop after loading state
        this.workerState.apple1.startLoop();

        // Force video update after restore
        if (typeof this.workerState.video.forceUpdate === 'function') {
            this.workerState.video.forceUpdate();
        }
    }

    getEmulationStatus(): 'running' | 'paused' {
        return this.workerState.isPaused ? 'paused' : 'running';
    }

    // ========== Breakpoint Management ==========

    setBreakpoint(address: number): number[] {
        this.workerState.breakpoints.add(address);
        this.workerState.updateBreakpointHook();

        return Array.from(this.workerState.breakpoints);
    }

    clearBreakpoint(address: number): number[] {
        this.workerState.breakpoints.delete(address);
        this.workerState.updateBreakpointHook();
        return Array.from(this.workerState.breakpoints);
    }

    clearAllBreakpoints(): void {
        this.workerState.breakpoints.clear();
        this.workerState.updateBreakpointHook();
    }

    getBreakpoints(): number[] {
        return Array.from(this.workerState.breakpoints);
    }

    runToAddress(address: number): void {
        const targetAddress = address;

        // Don't run if we're already at the target address
        if (this.workerState.apple1.cpu.PC === targetAddress) {
            loggingService.log(
                'info',
                'RunToAddress',
                `Already at target address ${Formatters.address(targetAddress)}`,
            );
            return;
        }

        // Store the run-to-cursor target
        this.workerState.runToCursorTarget = targetAddress;

        // Notify callbacks about the run-to-cursor target
        this.runToCursorCallbacks.forEach((cb) => cb(this.workerState.runToCursorTarget));

        // Set up a temporary execution hook for run-to-address
        let runToAddressHit = false;

        this.workerState.apple1.cpu.setExecutionHook((pc: number) => {
            // Skip breakpoint check if we're stepping
            if (this.workerState.isStepping) {
                return true;
            }

            // Check existing breakpoints first
            if (!this.workerState.isPaused && this.workerState.breakpoints.has(pc)) {
                // Hit a breakpoint - pause execution
                this.workerState.apple1.clock.pause();
                this.workerState.isPaused = true;
                this.statusCallbacks.forEach((cb) => cb('paused'));
                this.breakpointCallbacks.forEach((cb) => cb(pc));
                loggingService.log('info', 'Breakpoint', `Hit breakpoint at ${Formatters.address(pc)}`);
                return false; // Halt execution
            }

            // Check if we've reached the target address
            if (pc === targetAddress && !runToAddressHit) {
                runToAddressHit = true;
                // Clear run-to-cursor target
                this.workerState.runToCursorTarget = null;
                // Pause execution
                this.workerState.apple1.clock.pause();
                this.workerState.isPaused = true;
                // Restore normal breakpoint hook
                this.workerState.updateBreakpointHook();
                // Send notifications
                this.statusCallbacks.forEach((cb) => cb('paused'));
                this.runToCursorCallbacks.forEach((cb) => cb(null));
                loggingService.log(
                    'info',
                    'RunToAddress',
                    `Reached target address ${Formatters.address(targetAddress)}`,
                );
                return false; // Halt execution
            }

            return true; // Continue execution
        });

        // Resume execution to run to the target
        if (this.workerState.isPaused) {
            this.workerState.apple1.clock.resume();
            this.workerState.isPaused = false;
            this.statusCallbacks.forEach((cb) => cb('running'));
        }

        loggingService.log('info', 'RunToAddress', `Running to address ${Formatters.address(targetAddress)}`);
    }

    // ========== Memory Operations ==========

    readMemoryRange(start: number, length: number): number[] {
        // Route through the active (dual) engine so the debugger reflects the
        // engine that is actually executing. The WASM engine keeps RAM/stack in
        // its own memory and only mirrors I/O to the JS Bus, so reading the JS
        // Bus directly would show stale data while WASM is active.
        const dualEngine = this.workerState.getDualEngine();
        if (dualEngine) {
            return Array.from(dualEngine.readRange(start, length));
        }

        // Fallback for non-dual-engine setups: read the JS Bus directly.
        const memoryData: number[] = [];
        for (let i = 0; i < length; i++) {
            const addr = start + i;
            if (addr >= 0 && addr <= 0xffff) {
                memoryData.push(this.workerState.apple1.bus.read(addr));
            } else {
                memoryData.push(0);
            }
        }
        return memoryData;
    }

    writeMemory(address: number, value: number): void {
        if (address >= 0 && address <= 0xffff && value >= 0 && value <= 0xff) {
            // Route through the active (dual) engine so the write reaches the
            // engine that is actually executing. The WASM engine keeps RAM in
            // its own memory; writing the JS Bus directly (as before) left WASM
            // RAM stale, so hex-editor edits had no effect in WASM mode. This
            // mirrors the readMemoryRange routing above.
            const dualEngine = this.workerState.getDualEngine();
            if (dualEngine) {
                dualEngine.write(address, value);
            } else {
                this.workerState.apple1.bus.write(address, value);
            }
        } else {
            loggingService.log(
                'warn',
                'MemoryWrite',
                `Invalid memory write request: address=${address}, value=${value}`,
            );
        }
    }

    getMemoryMap(): MemoryMapData {
        return {
            regions: [
                // RAM Bank 1
                {
                    start: 0x0000,
                    end: 0x0fff,
                    type: 'RAM',
                    writable: true,
                    description: 'Main RAM (4KB)',
                },
                // Unmapped region 1
                {
                    start: 0x1000,
                    end: 0xd00f,
                    type: 'UNMAPPED',
                    writable: false,
                    description: 'Unmapped',
                },
                // PIA (I/O)
                {
                    start: 0xd010,
                    end: 0xd013,
                    type: 'IO',
                    writable: true,
                    description: 'PIA6820 - Keyboard & Display',
                },
                // Unmapped region 2
                {
                    start: 0xd014,
                    end: 0xdfff,
                    type: 'UNMAPPED',
                    writable: false,
                    description: 'Unmapped',
                },
                // RAM Bank 2
                {
                    start: 0xe000,
                    end: 0xefff,
                    type: 'RAM',
                    writable: true,
                    description: 'Extended RAM (4KB)',
                },
                // Unmapped region 3
                {
                    start: 0xf000,
                    end: 0xfeff,
                    type: 'UNMAPPED',
                    writable: false,
                    description: 'Unmapped',
                },
                // ROM
                {
                    start: 0xff00,
                    end: 0xffff,
                    type: 'ROM',
                    writable: false,
                    description: 'Monitor ROM (256 bytes)',
                },
            ],
        };
    }

    // ========== Configuration ==========

    setCrtBsSupport(enabled: boolean): void {
        this.workerState.video.setSupportBS(enabled);
    }

    setCpuProfiling(enabled: boolean): void {
        // Route through the active (dual) engine so profiling toggles on the
        // engine that is actually executing. Writing the dormant JS CPU
        // directly left the WASM engine unprofiled while it was active.
        const dualEngine = this.workerState.getDualEngine();
        if (dualEngine?.setProfiling) {
            dualEngine.setProfiling(enabled);
        } else {
            this.workerState.apple1.cpu.setProfilingEnabled(enabled);
        }
    }

    setCycleAccurateMode(enabled: boolean): void {
        this.workerState.apple1.cpu.setCycleAccurateMode(enabled);
    }

    setDebuggerActive(active: boolean): void {
        this.workerState.updateDebuggerState(active);
    }

    // ========== CPU Engine Management ==========

    /**
     * Get available CPU engines
     */
    getAvailableEngines(): string[] {
        // Check if DualEngine is available
        if (this.workerState.apple1.cpuEngine) {
            const dualEngine = this.workerState.apple1.cpuEngine;
            if ('getAvailableEngines' in dualEngine && typeof dualEngine.getAvailableEngines === 'function') {
                return dualEngine.getAvailableEngines();
            }
        }
        return ['JS']; // Default to JS engine only
    }

    /**
     * Get current CPU engine type
     */
    getCurrentEngine(): string {
        if (this.workerState.apple1.cpuEngine) {
            return this.workerState.apple1.cpuEngine.engineType;
        }
        return 'JS'; // Default JS engine
    }

    /**
     * Switch to a different CPU engine
     */
    async switchEngine(engineType: 'JS' | 'WASM'): Promise<void> {
        // Pause emulation during switch
        const wasRunning = !this.workerState.isPaused;
        if (wasRunning) {
            this.pauseEmulation();
        }

        try {
            await this.workerState.switchEngine(engineType);
        } finally {
            // Resume if it was running
            if (wasRunning) {
                this.resumeEmulation();
            }
        }
    }

    /**
     * Get current engine status
     */
    getEngineStatus(): EngineStatusData {
        return this.workerState.getEngineStatus();
    }

    /**
     * Get engine performance metrics
     */
    getEngineMetrics(): EngineMetrics | null {
        const dualEngine = this.workerState.getDualEngine();
        if (dualEngine && 'getMetrics' in dualEngine && typeof dualEngine.getMetrics === 'function') {
            return dualEngine.getMetrics() as EngineMetrics;
        }
        return null;
    }

    /**
     * Compare engine performance
     */
    async compareEngines(): Promise<EngineComparisonData> {
        return await this.workerState.compareEngines();
    }

    // Auto-switch feature has been removed for simplicity

    // ========== Input ==========

    keyDown(key: string): void {
        console.log('[WorkerAPI] keyDown called with key:', key);
        this.workerState.keyboard.write(key);
    }

    // ========== Debug Information ==========

    getDebugInfo(): FilteredDebugData {
        const { clock, cpu, pia, bus } = this.workerState.apple1;
        // CPU state must come from the *active* engine: when WASM is active the
        // JS CPU (apple1.cpu) is dormant and its toDebug() snapshot is frozen.
        // The dual engine delegates toDebug() to whichever engine is running.
        const dualEngine = this.workerState.getDualEngine();
        const cpuDebug = dualEngine?.toDebug ? dualEngine.toDebug() : cpu.toDebug();
        return {
            cpu: this.filterDebugData(cpuDebug),
            pia: this.filterDebugData(pia.toDebug()),
            Bus: this.filterDebugData(bus.toDebug()),
            clock: this.filterDebugData(clock.toDebug()),
        };
    }

    // ========== Event Subscriptions ==========
    // These will be implemented in Phase 1 with Comlink.proxy

    onVideoUpdate(callback: (data: VideoData) => void): () => void {
        this.videoCallbacks.add(callback);
        // Deliver the current frame immediately: the power-on screen is emitted
        // before any subscriber registers, so a late subscriber (e.g. React mounting
        // after the worker booted) would otherwise never see it until the next write.
        const video = this.workerState.video;
        if (video && typeof video.getState === 'function') {
            const { buffer, row, column } = video.getState();
            callback({ buffer, row, column });
        }
        return () => {
            this.videoCallbacks.delete(callback);
        };
    }

    onBreakpointHit(callback: (address: number) => void): () => void {
        this.breakpointCallbacks.add(callback);
        return () => {
            this.breakpointCallbacks.delete(callback);
        };
    }

    onEmulationStatus(callback: (status: 'running' | 'paused') => void): () => void {
        this.statusCallbacks.add(callback);
        return () => {
            this.statusCallbacks.delete(callback);
        };
    }

    onClockData(callback: (data: ClockData) => void): () => void {
        this.clockCallbacks.add(callback);
        return () => {
            this.clockCallbacks.delete(callback);
        };
    }

    onRunToCursorTarget(callback: (target: number | null) => void): () => void {
        this.runToCursorCallbacks.add(callback);
        return () => {
            this.runToCursorCallbacks.delete(callback);
        };
    }
}
