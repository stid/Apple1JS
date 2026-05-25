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
import { EngineMetricsTracker } from './EngineMetricsTracker';
import { loggingService } from '../../services/LoggingService';

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
    // JS baseline efficiency is 100; bus + CPU + breakpoint memory estimate.
    private metricsTracker = new EngineMetricsTracker(100, () => this.getMemoryUsage());

    constructor(private bus: Bus) {
        this.cpu = new CPU6502(bus);
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
        // consults this flag. Reset it in `finally` so a throw can't leave it
        // stuck `true` (which would silently disable all later breakpoints).
        let cycles: number;
        this.isSingleStepping = true;
        try {
            cycles = this.cpu.performSingleStep();
        } finally {
            this.isSingleStepping = false;
        }

        // Update metrics
        const duration = Date.now() - startTime;
        this.metricsTracker.recordStep(cycles, duration);

        return cycles;
    }

    performBulkSteps(cycles: number): void {
        // performance.now() (sub-ms) instead of Date.now(): a single bulk step
        // at 1MHz throttle can run in well under a millisecond, and the
        // host-utilization metric needs that resolution to be meaningful.
        const startTime = performance.now();
        this.cpu.performBulkSteps(cycles);
        const duration = performance.now() - startTime;

        // Estimate instructions executed (approximate - assume average 3 cycles per instruction)
        const estimatedInstructions = Math.floor(cycles / 3);
        this.metricsTracker.recordBulk(cycles, duration, estimatedInstructions);
    }

    reset(): void {
        this.cpu.reset();
        this.metricsTracker.reset();
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
                // Isolate listener failures: a throwing listener must not escape
                // the execution hook and break the run loop / pause handling.
                this.breakpointListeners.forEach((listener) => {
                    try {
                        listener(pc);
                    } catch (error) {
                        loggingService.error('JSEngine', `Breakpoint listener threw: ${error}`);
                    }
                });
                return false; // Halt before executing the instruction at the breakpoint
            }
            return true;
        });
    }

    // ============ Performance & Metrics ============

    getMetrics(): EngineMetrics {
        return this.metricsTracker.snapshot();
    }

    resetMetrics(): void {
        this.metricsTracker.reset();
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

    // ============ Engine-Specific Features ============

    getDebugInfo(): unknown {
        return {
            cpu: this.cpu.getInspectable(),
            breakpoints: Array.from(this.breakpoints),
            metrics: this.metricsTracker.raw(),
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
