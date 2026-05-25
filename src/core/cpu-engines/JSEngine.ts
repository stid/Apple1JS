/**
 * JavaScript CPU Engine
 *
 * Wrapper for the existing TypeScript CPU6502 implementation
 * that conforms to the ICPUEngine interface.
 */

import type { ICPUEngine, EngineType, CPURegisters, EngineMetrics } from '../cpu-interface/ICPUEngine';
import type { CPU6502State } from '../cpu6502/types';
import type Bus from '../Bus';
import CPU6502 from '../cpu6502/core';

/**
 * JavaScript implementation of the CPU engine
 */
export class JSEngine implements ICPUEngine {
    readonly engineType: EngineType = 'JS';
    readonly engineVersion = '1.0.0';
    readonly isReady = true; // JS engine is always ready

    readonly capabilities = {
        supportsBreakpoints: true,
        supportsProfiling: true,
        supportsStepBack: false,
        maxSpeed: 2_000_000, // ~2MHz in JS
    };

    private cpu: CPU6502;
    private breakpoints = new Set<number>();
    private breakpointListeners = new Set<(address: number) => void>();
    // Set while performing a deliberate single step so the breakpoint on the
    // current PC is ignored — this is how the debugger steps *off* a breakpoint.
    private isSingleStepping = false;
    private metrics: EngineMetrics;
    private metricsStartTime: number;
    private lastMetricsUpdate: number;
    private lastSecondInstructions: number;
    private lastSecondStartTime: number;
    // Cumulative host wall-clock ms spent executing since the last reset.
    // Divided by emulated seconds in getMetrics() to expose real engine cost.
    private hostExecMs = 0;

    constructor(private bus: Bus) {
        this.cpu = new CPU6502(bus);
        this.metricsStartTime = Date.now();
        this.lastMetricsUpdate = Date.now();
        this.lastSecondInstructions = 0;
        this.lastSecondStartTime = Date.now();
        this.metrics = this.initializeMetrics();
    }

    private initializeMetrics(): EngineMetrics {
        return {
            totalCycles: 0,
            instructionsExecuted: 0,
            averageIPS: 0,
            memoryUsage: 0,
            lastStepDuration: 0,
            initializationTime: 0,
            efficiency: 100, // JS baseline
        };
    }

    // ============ Initialization ============

    async ensureReady(): Promise<void> {
        // JS engine is always ready
        return Promise.resolve();
    }

    // ============ Core Operations ============

    performSingleStep(): number {
        const startTime = Date.now();

        // A deliberate single step always advances, even when sitting on a
        // breakpoint, so the debugger can step off it. The execution hook
        // consults this flag.
        this.isSingleStepping = true;
        const cycles = this.cpu.performSingleStep();
        this.isSingleStepping = false;

        // Update metrics
        const duration = Date.now() - startTime;
        this.updateMetrics(cycles, duration);

        return cycles;
    }

    performBulkSteps(cycles: number): void {
        // performance.now() (sub-ms) instead of Date.now(): a single bulk step
        // at 1MHz throttle can run in well under a millisecond, and the
        // host-utilization metric needs that resolution to be meaningful.
        const startTime = performance.now();
        this.cpu.performBulkSteps(cycles);
        const duration = performance.now() - startTime;
        this.hostExecMs += duration;
        this.metrics.totalCycles += cycles;
        this.metrics.lastStepDuration = duration * 1_000_000; // Convert to nanoseconds

        // Estimate instructions executed (approximate - assume average 3 cycles per instruction)
        const estimatedInstructions = Math.floor(cycles / 3);
        this.metrics.instructionsExecuted += estimatedInstructions;
        this.lastSecondInstructions += estimatedInstructions;

        // Update IPS calculation
        this.updateIPSMetrics();
    }

    reset(): void {
        this.cpu.reset();
        this.metrics = this.initializeMetrics();
        this.metricsStartTime = Date.now();
        this.lastMetricsUpdate = Date.now();
        this.lastSecondInstructions = 0;
        this.lastSecondStartTime = Date.now();
        this.hostExecMs = 0;
    }

    halt(): void {
        // Set interrupt flag to halt execution
        this.cpu.I = 1;
    }

    // ============ State Management ============

    saveState(): CPU6502State {
        return this.cpu.saveState();
    }

    loadState(state: CPU6502State): void {
        this.cpu.loadState(state);
    }

    getRegisters(): CPURegisters {
        return {
            PC: this.cpu.PC,
            A: this.cpu.A,
            X: this.cpu.X,
            Y: this.cpu.Y,
            S: this.cpu.S,
            N: this.cpu.N,
            V: this.cpu.V,
            B: 0, // B flag is not stored
            D: this.cpu.D,
            I: this.cpu.I,
            Z: this.cpu.Z,
            C: this.cpu.C,
        };
    }

    setRegisters(registers: Partial<CPURegisters>): void {
        if (registers.PC !== undefined) this.cpu.PC = registers.PC;
        if (registers.A !== undefined) this.cpu.A = registers.A;
        if (registers.X !== undefined) this.cpu.X = registers.X;
        if (registers.Y !== undefined) this.cpu.Y = registers.Y;
        if (registers.S !== undefined) this.cpu.S = registers.S;
        if (registers.N !== undefined) this.cpu.N = registers.N;
        if (registers.V !== undefined) this.cpu.V = registers.V;
        if (registers.D !== undefined) this.cpu.D = registers.D;
        if (registers.I !== undefined) this.cpu.I = registers.I;
        if (registers.Z !== undefined) this.cpu.Z = registers.Z;
        if (registers.C !== undefined) this.cpu.C = registers.C;
    }

    // ============ Memory Operations ============

    read(address: number): number {
        return this.bus.read(address);
    }

    write(address: number, value: number): void {
        this.bus.write(address, value);
    }

    readRange(start: number, length: number): Uint8Array {
        const data = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
            data[i] = this.bus.read(start + i);
        }
        return data;
    }

    writeRange(start: number, data: Uint8Array): void {
        for (let i = 0; i < data.length; i++) {
            this.bus.write(start + i, data[i]);
        }
    }

    loadProgram(program: Uint8Array, address = 0x0000): void {
        this.writeRange(address, program);
    }

    // ============ Debugging Support ============

    setBreakpoint(address: number): void {
        this.breakpoints.add(address);
        this.updateExecutionHook();
    }

    clearBreakpoint(address: number): void {
        this.breakpoints.delete(address);
        this.updateExecutionHook();
    }

    clearAllBreakpoints(): void {
        this.breakpoints.clear();
        this.updateExecutionHook();
    }

    getBreakpoints(): number[] {
        return Array.from(this.breakpoints);
    }

    hasBreakpoint(address: number): boolean {
        return this.breakpoints.has(address);
    }

    onBreakpointHit(callback: (address: number) => void): () => void {
        this.breakpointListeners.add(callback);
        return () => {
            this.breakpointListeners.delete(callback);
        };
    }

    /**
     * The underlying CPU6502 instance. Apple1 uses this as its `this.cpu` for
     * state save/load and inspection under the dual engine (the JS engine's CPU
     * is the one kept in sync). Typed accessor — avoids an `any` cast.
     */
    getInternalCPU(): CPU6502 {
        return this.cpu;
    }

    /**
     * Install (or remove) the CPU6502 execution hook that enforces breakpoints.
     * The hook is only present while breakpoints exist, so the no-breakpoint hot
     * path keeps its per-instruction overhead at zero. When the PC reaches a
     * breakpoint (and we're not single-stepping), it notifies listeners and
     * returns false, which halts CPU6502 execution before that instruction runs.
     */
    private updateExecutionHook(): void {
        if (this.breakpoints.size === 0) {
            this.cpu.setExecutionHook(undefined);
            return;
        }
        this.cpu.setExecutionHook((pc: number): boolean => {
            if (!this.isSingleStepping && this.breakpoints.has(pc)) {
                this.breakpointListeners.forEach((listener) => listener(pc));
                return false; // Halt before executing the instruction at the breakpoint
            }
            return true;
        });
    }

    // ============ Performance & Metrics ============

    getMetrics(): EngineMetrics {
        // Force update IPS calculation when metrics are requested
        this.updateIPSMetrics();

        // Calculate instantaneous IPS (last second)
        const now = Date.now();
        const timeSinceSecondStart = now - this.lastSecondStartTime;
        let lastIPS = 0;
        if (timeSinceSecondStart > 0) {
            // Calculate IPS based on instructions in the current second window
            lastIPS = Math.floor((this.lastSecondInstructions / timeSinceSecondStart) * 1000);
        }

        return {
            ...this.metrics,
            // Add lastIPS as a computed field
            lastIPS: lastIPS || this.metrics.averageIPS,
            // Host wall-clock ms per emulated second (1MHz => totalCycles/1e6 s)
            hostMillisPerSecond: this.computeHostMillisPerSecond(),
        } as EngineMetrics;
    }

    /**
     * Host wall-clock milliseconds spent executing per second of emulated
     * 6502 time. Exposes the real engine cost the throttled IPS hides.
     */
    private computeHostMillisPerSecond(): number {
        const emulatedSeconds = this.metrics.totalCycles / 1_000_000;
        return emulatedSeconds > 0 ? this.hostExecMs / emulatedSeconds : 0;
    }

    resetMetrics(): void {
        this.metrics = this.initializeMetrics();
        this.metricsStartTime = Date.now();
        this.lastMetricsUpdate = Date.now();
        this.lastSecondInstructions = 0;
        this.lastSecondStartTime = Date.now();
        this.hostExecMs = 0;
    }

    setProfiling(enabled: boolean): void {
        this.cpu.enableProfiling = enabled;
    }

    getProfilingData(): Map<number, { count: number; cycles: number }> {
        const cpuData = this.cpu.getProfilingData();
        const map = new Map<number, { count: number; cycles: number }>();

        // Convert the CPU's profiling data format to our interface format
        for (const [opcode, data] of Object.entries(cpuData)) {
            map.set(parseInt(opcode), {
                count: data.count,
                cycles: data.cycles,
            });
        }

        return map;
    }

    getMemoryUsage(): number {
        // Rough estimate of memory usage
        // Bus + CPU state + breakpoints
        return 65536 + 1024 + this.breakpoints.size * 8;
    }

    // ============ Private Methods ============

    private updateMetrics(cycles: number, duration: number): void {
        this.metrics.totalCycles += cycles;
        this.metrics.instructionsExecuted++;
        this.lastSecondInstructions++;
        this.metrics.lastStepDuration = duration * 1_000_000; // Convert to nanoseconds

        // Update IPS calculation
        this.updateIPSMetrics();

        // Update memory usage periodically
        if (this.metrics.instructionsExecuted % 1000 === 0) {
            this.metrics.memoryUsage = this.getMemoryUsage();
        }
    }

    private updateIPSMetrics(): void {
        const now = Date.now();
        const timeSinceLastUpdate = now - this.lastMetricsUpdate;

        // Update IPS every 100ms minimum OR when explicitly requested
        if (timeSinceLastUpdate >= 100 || timeSinceLastUpdate === 0) {
            // Calculate average IPS over entire runtime
            const totalTime = now - this.metricsStartTime;
            if (totalTime > 0 && this.metrics.instructionsExecuted > 0) {
                this.metrics.averageIPS = Math.floor((this.metrics.instructionsExecuted / totalTime) * 1000);
            }

            // Reset last second counter every second for instantaneous IPS
            const timeSinceSecondStart = now - this.lastSecondStartTime;
            if (timeSinceSecondStart >= 1000) {
                this.lastSecondInstructions = 0;
                this.lastSecondStartTime = now;
            }

            // Only update lastMetricsUpdate if time has actually passed
            if (timeSinceLastUpdate > 0) {
                this.lastMetricsUpdate = now;
            }
        }
    }

    // ============ Engine-Specific Features ============

    getDebugInfo(): unknown {
        return {
            cpu: this.cpu.getInspectable(),
            breakpoints: Array.from(this.breakpoints),
            metrics: this.metrics,
        };
    }

    /**
     * Flat debug snapshot in the shape the debugger UI consumes.
     * Delegates to the live CPU6502 so the worker can read the active
     * engine's state polymorphically (mirrors WasmEngine.toDebug()).
     */
    toDebug(): { [key: string]: string | number | boolean | object } {
        return this.cpu.toDebug();
    }

    cleanup(): void {
        // Clean up any resources
        this.breakpoints.clear();
        this.breakpointListeners.clear();
        this.updateExecutionHook();
        this.resetMetrics();
    }
}
