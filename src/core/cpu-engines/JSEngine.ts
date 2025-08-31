/**
 * JavaScript CPU Engine
 * 
 * Wrapper for the existing TypeScript CPU6502 implementation
 * that conforms to the ICPUEngine interface.
 */

import type { 
    ICPUEngine, 
    EngineType, 
    CPURegisters, 
    EngineMetrics 
} from '../cpu-interface/ICPUEngine';
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
        maxSpeed: 2_000_000 // ~2MHz in JS
    };
    
    private cpu: CPU6502;
    private breakpoints = new Set<number>();
    private metrics: EngineMetrics;
    private metricsStartTime: number;
    
    constructor(private bus: Bus) {
        this.cpu = new CPU6502(bus);
        this.metricsStartTime = performance.now();
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
            efficiency: 100 // JS baseline
        };
    }
    
    // ============ Initialization ============
    
    async ensureReady(): Promise<void> {
        // JS engine is always ready
        return Promise.resolve();
    }
    
    // ============ Core Operations ============
    
    performSingleStep(): number {
        const startTime = performance.now();
        
        // Check for breakpoints
        if (this.breakpoints.has(this.cpu.PC)) {
            // In a real implementation, we'd handle this differently
            console.log(`Breakpoint hit at ${this.cpu.PC.toString(16)}`);
        }
        
        const cycles = this.cpu.performSingleStep();
        
        // Update metrics
        const duration = performance.now() - startTime;
        this.updateMetrics(cycles, duration);
        
        return cycles;
    }
    
    performBulkSteps(cycles: number): void {
        const startTime = performance.now();
        this.cpu.performBulkSteps(cycles);
        
        const duration = performance.now() - startTime;
        this.metrics.totalCycles += cycles;
        this.metrics.lastStepDuration = duration * 1_000_000; // Convert to nanoseconds
    }
    
    reset(): void {
        this.cpu.reset();
        this.metrics = this.initializeMetrics();
        this.metricsStartTime = performance.now();
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
            C: this.cpu.C
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
    }
    
    clearBreakpoint(address: number): void {
        this.breakpoints.delete(address);
    }
    
    clearAllBreakpoints(): void {
        this.breakpoints.clear();
    }
    
    getBreakpoints(): number[] {
        return Array.from(this.breakpoints);
    }
    
    hasBreakpoint(address: number): boolean {
        return this.breakpoints.has(address);
    }
    
    // ============ Performance & Metrics ============
    
    getMetrics(): EngineMetrics {
        return { ...this.metrics };
    }
    
    resetMetrics(): void {
        this.metrics = this.initializeMetrics();
        this.metricsStartTime = performance.now();
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
                cycles: data.cycles
            });
        }
        
        return map;
    }
    
    getMemoryUsage(): number {
        // Rough estimate of memory usage
        // Bus + CPU state + breakpoints
        return 65536 + 1024 + (this.breakpoints.size * 8);
    }
    
    // ============ Private Methods ============
    
    private updateMetrics(cycles: number, duration: number): void {
        this.metrics.totalCycles += cycles;
        this.metrics.instructionsExecuted++;
        this.metrics.lastStepDuration = duration * 1_000_000; // Convert to nanoseconds
        
        // Calculate average IPS
        const totalTime = performance.now() - this.metricsStartTime;
        if (totalTime > 0) {
            this.metrics.averageIPS = (this.metrics.instructionsExecuted / totalTime) * 1000;
        }
        
        // Update memory usage periodically
        if (this.metrics.instructionsExecuted % 1000 === 0) {
            this.metrics.memoryUsage = this.getMemoryUsage();
        }
    }
    
    // ============ Engine-Specific Features ============
    
    getDebugInfo(): unknown {
        return {
            cpu: this.cpu.getInspectable(),
            breakpoints: Array.from(this.breakpoints),
            metrics: this.metrics
        };
    }
    
    cleanup(): void {
        // Clean up any resources
        this.breakpoints.clear();
        this.resetMetrics();
    }
}