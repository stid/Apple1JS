/**
 * Dual Engine CPU Coordinator
 *
 * Manages both JavaScript and WASM CPU engines, enabling runtime switching
 * between them while maintaining state consistency.
 */

import type {
    ICPUEngine,
    EngineType,
    CPURegisters,
    EngineMetrics,
    EngineSwitchEvent,
    EngineComparison,
} from '../cpu-interface/ICPUEngine';
import type { CPU6502State } from '../cpu6502/types';
import type CPU6502 from '../cpu6502/core';
import type Bus from '../Bus';
import { JSEngine } from './JSEngine';
import { WasmEngine } from './WasmEngine';
import { isWasmSupported } from './wasm-loader';
import { loggingService } from '../../services/LoggingService';
import { RAM_BANK1_START, RAM_BANK1_END, RAM_BANK2_START, RAM_BANK2_END } from '../constants/memory';

/**
 * Engine switch reason types
 */
type SwitchReason = 'user' | 'performance' | 'error' | 'fallback';

/**
 * Engine switch listener
 */
type EngineSwitchListener = (event: EngineSwitchEvent) => void;

/**
 * Dual engine coordinator that manages both JS and WASM engines
 */
export class DualEngine implements ICPUEngine {
    // Current active engine
    private activeEngine: ICPUEngine;
    private activeEngineType: EngineType;

    // Both engine instances
    private jsEngine: JSEngine;
    private wasmEngine: WasmEngine | null = null;

    // Event listeners
    private switchListeners: Set<EngineSwitchListener> = new Set();

    // Performance tracking
    private switchCount = 0;
    private lastSwitchTime = 0;

    constructor(bus: Bus, initialEngine: EngineType = 'JS') {
        // Always create JS engine as fallback
        this.jsEngine = new JSEngine(bus);

        // Try to create WASM engine if supported
        if (isWasmSupported()) {
            try {
                this.wasmEngine = new WasmEngine(bus);
            } catch (error) {
                loggingService.warn('DualEngine', `Failed to create WASM engine, using JS only: ${error}`);
            }
        } else {
            loggingService.info('DualEngine', 'WASM not supported, using JS engine only');
        }

        // Set initial engine
        if (initialEngine === 'WASM' && this.wasmEngine) {
            this.activeEngine = this.wasmEngine;
            this.activeEngineType = 'WASM';
        } else {
            this.activeEngine = this.jsEngine;
            this.activeEngineType = 'JS';
        }

        loggingService.info('DualEngine', `Initialized with ${this.activeEngineType} engine`);
    }

    // ============ ICPUEngine Implementation ============

    get engineType(): EngineType {
        return this.activeEngineType;
    }

    get engineVersion(): string {
        return `Dual-${this.activeEngine.engineVersion}`;
    }

    get isReady(): boolean {
        return this.activeEngine.isReady;
    }

    get capabilities() {
        return {
            ...this.activeEngine.capabilities!,
            supportsEngineSwitch: true,
            availableEngines: this.getAvailableEngines(),
        };
    }

    async initialize(): Promise<void> {
        // Initialize both engines in parallel if possible
        const promises: Promise<void>[] = [];

        // JS engine doesn't need initialization
        promises.push(this.jsEngine.ensureReady());

        if (this.wasmEngine?.initialize) {
            promises.push(
                this.wasmEngine.initialize().catch((error) => {
                    loggingService.error('DualEngine', `WASM initialization failed: ${error}`);
                    // Don't throw, just disable WASM
                    this.wasmEngine = null;
                }),
            );
        }

        await Promise.all(promises);
    }

    async ensureReady(): Promise<void> {
        await this.activeEngine.ensureReady();
    }

    // ============ Core Operations (Delegated) ============

    performSingleStep(): number {
        return this.activeEngine.performSingleStep();
    }

    performBulkSteps(cycles: number): void {
        // Simply delegate to active engine
        this.activeEngine.performBulkSteps(cycles);
    }

    reset(): void {
        // Reset both engines to keep them in sync
        this.jsEngine.reset();
        this.wasmEngine?.reset();
    }

    halt(): void {
        this.activeEngine.halt();
    }

    // ============ State Management ============

    saveState(): CPU6502State {
        return this.activeEngine.saveState();
    }

    loadState(state: CPU6502State): void {
        // Load state into both engines to keep them synchronized
        this.jsEngine.loadState(state);

        if (this.wasmEngine?.isReady) {
            try {
                this.wasmEngine.loadState(state);
            } catch (error) {
                loggingService.warn('DualEngine', `Failed to load state into WASM engine: ${error}`);
            }
        }
    }

    getRegisters(): CPURegisters {
        return this.activeEngine.getRegisters();
    }

    setRegisters(registers: Partial<CPURegisters>): void {
        // Set registers in both engines
        this.jsEngine.setRegisters(registers);
        this.wasmEngine?.setRegisters(registers);
    }

    // ============ Memory Operations ============

    read(address: number): number {
        return this.activeEngine.read(address);
    }

    write(address: number, value: number): void {
        // Write to BOTH engines to keep them synchronized
        // Each engine has its own RAM, so we must write to both
        this.jsEngine.write(address, value);
        if (this.wasmEngine?.isReady) {
            this.wasmEngine.write(address, value);
        }
    }

    readRange(start: number, length: number): Uint8Array {
        return this.activeEngine.readRange(start, length);
    }

    writeRange(start: number, data: Uint8Array): void {
        // Write to both engines to keep them synchronized
        this.jsEngine.writeRange(start, data);
        if (this.wasmEngine?.isReady) {
            this.wasmEngine.writeRange(start, data);
        }
    }

    loadProgram(program: Uint8Array, address?: number): void {
        // Load into both engines to keep them synchronized
        this.jsEngine.loadProgram(program, address);
        if (this.wasmEngine?.isReady) {
            this.wasmEngine.loadProgram(program, address);
        }
    }

    // ============ Debugging Support ============

    setBreakpoint(address: number): void {
        this.jsEngine.setBreakpoint(address);
        this.wasmEngine?.setBreakpoint(address);
    }

    clearBreakpoint(address: number): void {
        this.jsEngine.clearBreakpoint(address);
        this.wasmEngine?.clearBreakpoint(address);
    }

    clearAllBreakpoints(): void {
        this.jsEngine.clearAllBreakpoints();
        this.wasmEngine?.clearAllBreakpoints();
    }

    getBreakpoints(): number[] {
        return this.activeEngine.getBreakpoints();
    }

    hasBreakpoint(address: number): boolean {
        return this.activeEngine.hasBreakpoint(address);
    }

    onBreakpointHit(callback: (address: number) => void): () => void {
        // Subscribe on both engines so the listener keeps working across an
        // engine switch. Each engine only emits while it is the one executing.
        const unsubs: Array<() => void> = [];
        const jsUnsub = this.jsEngine.onBreakpointHit?.(callback);
        if (jsUnsub) unsubs.push(jsUnsub);
        const wasmUnsub = this.wasmEngine?.onBreakpointHit?.(callback);
        if (wasmUnsub) unsubs.push(wasmUnsub);
        return () => unsubs.forEach((unsub) => unsub());
    }

    // ============ Performance & Metrics ============

    getMetrics(): EngineMetrics {
        // Get fresh metrics from the active engine
        const metrics = this.activeEngine.getMetrics();

        // Ensure metrics are properly populated
        return {
            totalCycles: metrics.totalCycles || 0,
            instructionsExecuted: metrics.instructionsExecuted || 0,
            averageIPS: metrics.averageIPS || 0,
            lastIPS: metrics.lastIPS || 0,
            memoryUsage: metrics.memoryUsage || 0,
            lastStepDuration: metrics.lastStepDuration || 0,
            initializationTime: metrics.initializationTime || 0,
            efficiency: metrics.efficiency || 100,
            hostMillisPerSecond: metrics.hostMillisPerSecond || 0,
        };
    }

    /**
     * Get metrics from the currently active engine only
     * Returns metrics for both engine types, but only the active one is populated
     */
    getEngineMetrics(): { js: EngineMetrics | null; wasm: EngineMetrics | null } {
        if (this.activeEngineType === 'JS') {
            return {
                js: this.jsEngine.getMetrics(),
                wasm: null,
            };
        } else {
            return {
                js: null,
                wasm: this.wasmEngine?.getMetrics() || null,
            };
        }
    }

    resetMetrics(): void {
        this.jsEngine.resetMetrics();
        this.wasmEngine?.resetMetrics();
    }

    setProfiling(enabled: boolean): void {
        // Fan out to both engines so profiling state stays in sync regardless
        // of which engine is active when the user later switches.
        this.jsEngine.setProfiling?.(enabled);
        this.wasmEngine?.setProfiling?.(enabled);
    }

    getProfilingData(): Map<number, { count: number; cycles: number }> {
        return this.activeEngine.getProfilingData?.() ?? new Map();
    }

    getMemoryUsage(): number {
        // Return combined memory usage
        let total = this.jsEngine.getMemoryUsage();
        if (this.wasmEngine?.isReady) {
            total += this.wasmEngine.getMemoryUsage();
        }
        return total;
    }

    // ============ Engine Switching ============

    /**
     * Switch to a different engine
     */
    async switchEngine(targetEngine: EngineType, reason: SwitchReason = 'user'): Promise<void> {
        if (targetEngine === this.activeEngineType) {
            loggingService.info('DualEngine', `Already using ${targetEngine} engine`);
            return;
        }

        // Check if target engine is available
        if (targetEngine === 'WASM' && !this.wasmEngine) {
            throw new Error('WASM engine is not available');
        }

        const startTime = Date.now();
        const fromEngine = this.activeEngineType;
        const fromMetrics = this.activeEngine.getMetrics();

        loggingService.info('DualEngine', `Switching from ${fromEngine} to ${targetEngine} engine (reason: ${reason})`);

        try {
            // Save current CPU state (registers, flags, etc.)
            const currentState = this.activeEngine.saveState();

            // Get target engine
            const newEngine = targetEngine === 'JS' ? this.jsEngine : this.wasmEngine!;

            // Ensure target engine is ready
            await newEngine.ensureReady();

            // Synchronize RAM contents from source to target engine for BOTH
            // banks: bank 1 ($0000-$0FFF) and bank 2 ($E000-$EFFF, Integer BASIC).
            // Syncing only bank 1 would drop bank-2 RAM on an engine switch.
            const ramRanges: ReadonlyArray<readonly [number, number]> = [
                [RAM_BANK1_START, RAM_BANK1_END],
                [RAM_BANK2_START, RAM_BANK2_END],
            ];
            let syncedBytes = 0;
            for (const [start, end] of ramRanges) {
                const ramData = this.activeEngine.readRange(start, end - start + 1);
                newEngine.writeRange(start, ramData);
                syncedBytes += ramData.length;
            }
            loggingService.info('DualEngine', `Synchronized ${syncedBytes} bytes of RAM to ${targetEngine} engine`);

            // Load CPU state into target engine
            newEngine.loadState(currentState);

            // Switch active engine
            this.activeEngine = newEngine;
            this.activeEngineType = targetEngine;

            // Update metrics
            this.switchCount++;
            this.lastSwitchTime = Date.now() - startTime;

            // Emit switch event
            const event: EngineSwitchEvent = {
                from: fromEngine,
                to: targetEngine,
                timestamp: Date.now(),
                reason,
                metrics: {
                    fromMetrics,
                    toMetrics: newEngine.getMetrics(),
                },
            };

            this.emitSwitchEvent(event);

            loggingService.info('DualEngine', `Engine switch completed in ${this.lastSwitchTime.toFixed(2)}ms`);
        } catch (error) {
            loggingService.error('DualEngine', `Failed to switch to ${targetEngine} engine: ${error}`);

            // Try to fallback to JS if switching to WASM failed
            if (targetEngine === 'WASM' && fromEngine === 'JS') {
                this.activeEngine = this.jsEngine;
                this.activeEngineType = 'JS';

                const event: EngineSwitchEvent = {
                    from: fromEngine,
                    to: 'JS',
                    timestamp: Date.now(),
                    reason: 'fallback',
                };

                this.emitSwitchEvent(event);
            }

            throw error;
        }
    }

    /**
     * Get list of available engines
     */
    getAvailableEngines(): EngineType[] {
        const engines: EngineType[] = ['JS'];
        if (this.wasmEngine) {
            engines.push('WASM');
        }
        return engines;
    }

    /**
     * Check if an engine is available
     */
    isEngineAvailable(engine: EngineType): boolean {
        return engine === 'JS' || (engine === 'WASM' && this.wasmEngine !== null);
    }

    /**
     * Compare performance of both engines
     */
    async compareEngines(): Promise<EngineComparison> {
        if (!this.wasmEngine) {
            throw new Error('WASM engine not available for comparison');
        }

        // Ensure both engines are ready
        await this.jsEngine.ensureReady();
        await this.wasmEngine.ensureReady();

        // Get metrics from both
        const jsMetrics = this.jsEngine.getMetrics();
        const wasmMetrics = this.wasmEngine.getMetrics();

        // Calculate speedup
        const speedup = wasmMetrics.averageIPS / (jsMetrics.averageIPS || 1);

        // Calculate memory ratio
        const jsMemory = this.jsEngine.getMemoryUsage();
        const wasmMemory = this.wasmEngine.getMemoryUsage();
        const memoryRatio = wasmMemory / jsMemory;

        // Make recommendation
        let recommendation: 'JS' | 'WASM' = 'JS';
        let reason = 'JS engine is more stable';

        if (speedup > 1.5 && wasmMetrics.instructionsExecuted > 1000) {
            recommendation = 'WASM';
            reason = `WASM is ${speedup.toFixed(1)}x faster`;
        } else if (memoryRatio < 0.7 && wasmMetrics.instructionsExecuted > 1000) {
            recommendation = 'WASM';
            reason = `WASM uses ${((1 - memoryRatio) * 100).toFixed(0)}% less memory`;
        }

        return {
            js: jsMetrics,
            wasm: wasmMetrics,
            speedup,
            memoryRatio,
            recommendation,
            reason,
        };
    }

    /**
     * Get engine switch statistics
     */
    getSwitchStats(): {
        currentEngine: EngineType;
        availableEngines: EngineType[];
        switchCount: number;
        lastSwitchTime: number;
    } {
        return {
            currentEngine: this.activeEngineType,
            availableEngines: this.getAvailableEngines(),
            switchCount: this.switchCount,
            lastSwitchTime: this.lastSwitchTime,
        };
    }

    // ============ Event Management ============

    /**
     * Add engine switch event listener
     */
    onEngineSwitch(listener: EngineSwitchListener): () => void {
        this.switchListeners.add(listener);

        // Return unsubscribe function
        return () => {
            this.switchListeners.delete(listener);
        };
    }

    private emitSwitchEvent(event: EngineSwitchEvent): void {
        this.switchListeners.forEach((listener) => {
            try {
                listener(event);
            } catch (error) {
                loggingService.error('DualEngine', `Error in switch event listener: ${error}`);
            }
        });
    }

    // ============ Engine-Specific Features ============

    getDebugInfo(): unknown {
        return {
            activeEngine: this.activeEngineType,
            availableEngines: this.getAvailableEngines(),
            switchStats: this.getSwitchStats(),
            jsDebugInfo: this.jsEngine.getDebugInfo ? this.jsEngine.getDebugInfo() : null,
            wasmDebugInfo: this.wasmEngine?.getDebugInfo ? this.wasmEngine.getDebugInfo() : null,
        };
    }

    /**
     * Flat debug snapshot of the *active* engine in the shape the debugger UI
     * consumes. This is what makes the CPU State / Execution panels track the
     * WASM engine when it is active instead of the dormant JS CPU.
     */
    toDebug(): { [key: string]: string | number | boolean | object } {
        return this.activeEngine.toDebug ? this.activeEngine.toDebug() : {};
    }

    cleanup(): void {
        // Clean up both engines
        this.jsEngine.cleanup?.();
        this.wasmEngine?.cleanup?.();

        // Clear listeners
        this.switchListeners.clear();
    }

    /**
     * The JS engine's underlying CPU6502. Apple1 holds this as its `this.cpu`
     * for state save/load and inspection (the JS CPU is kept synchronized with
     * the active engine). Typed accessor — no `any` cast required.
     */
    getInternalCPU(): CPU6502 {
        return this.jsEngine.getInternalCPU();
    }
}
