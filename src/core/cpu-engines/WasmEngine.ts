/**
 * WASM CPU Engine
 * 
 * High-performance WebAssembly implementation of the 6502 CPU
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
import { initializeWasmModule, WasmCPU, isWasmSupported } from './wasm-loader';
import { loggingService } from '../../services/LoggingService';

/**
 * WASM implementation of the CPU engine
 */
export class WasmEngine implements ICPUEngine {
    readonly engineType: EngineType = 'WASM';
    readonly engineVersion = '1.0.0';
    
    readonly capabilities = {
        supportsBreakpoints: true,
        supportsProfiling: true,
        supportsStepBack: false,
        maxSpeed: 10_000_000 // ~10MHz potential in WASM
    };
    
    private wasmCpu: WasmCPU | null = null;
    private bus: Bus;
    private breakpoints = new Set<number>();
    private metrics: EngineMetrics;
    private metricsStartTime: number;
    private initPromise: Promise<void> | null = null;
    private _isReady = false;
    
    // Memory synchronization
    private lastSyncedPC = -1;
    
    constructor(bus: Bus) {
        this.bus = bus;
        this.metricsStartTime = Date.now();
        this.metrics = this.initializeMetrics();
        
        // Check WASM support
        if (!isWasmSupported()) {
            throw new Error('WebAssembly is not supported in this environment');
        }
    }
    
    get isReady(): boolean {
        return this._isReady;
    }
    
    private initializeMetrics(): EngineMetrics {
        return {
            totalCycles: 0,
            instructionsExecuted: 0,
            averageIPS: 0,
            memoryUsage: 0,
            lastStepDuration: 0,
            initializationTime: 0,
            efficiency: 150 // WASM is typically 1.5x more efficient
        };
    }
    
    // ============ Initialization ============
    
    async initialize(): Promise<void> {
        if (this._isReady) {
            return;
        }
        
        if (this.initPromise) {
            return this.initPromise;
        }
        
        this.initPromise = this.performInitialization();
        return this.initPromise;
    }
    
    private async performInitialization(): Promise<void> {
        const startTime = Date.now();
        
        try {
            loggingService.info('WasmEngine', 'Starting WASM engine initialization...');
            
            // Initialize the WASM module
            await initializeWasmModule();
            
            // Create the WASM CPU instance
            this.wasmCpu = new WasmCPU();
            
            // Initialize CPU state
            this.wasmCpu.reset();
            
            // Sync initial memory from Bus to WASM
            this.syncMemoryFromBus();
            
            this._isReady = true;
            this.metrics.initializationTime = Date.now() - startTime;
            
            loggingService.info('WasmEngine', `WASM engine initialized in ${this.metrics.initializationTime.toFixed(2)}ms`);
        } catch (error) {
            loggingService.error('WasmEngine', `Failed to initialize WASM engine: ${error}`);
            throw new Error(`WASM engine initialization failed: ${error}`);
        }
    }
    
    async ensureReady(): Promise<void> {
        if (!this._isReady) {
            await this.initialize();
        }
    }
    
    // ============ Memory Synchronization ============
    
    /**
     * Sync memory from Bus to WASM
     * This is needed because WASM has its own memory space
     */
    private syncMemoryFromBus(): void {
        if (!this.wasmCpu) return;
        
        // Copy entire memory space from Bus to WASM
        // This is expensive but necessary for initial sync
        for (let addr = 0; addr < 0x10000; addr++) {
            const value = this.bus.read(addr);
            this.wasmCpu.write_memory(addr, value);
        }
    }
    
    
    // ============ Core Operations ============
    
    performSingleStep(): number {
        if (!this.wasmCpu) {
            throw new Error('WASM engine not initialized');
        }
        
        const startTime = Date.now();
        
        // Check for breakpoints
        const pc = this.wasmCpu.pc;
        if (this.breakpoints.has(pc)) {
            loggingService.info('WasmEngine', `Breakpoint hit at ${pc.toString(16)}`);
        }
        
        // Execute one instruction
        const cycles = this.wasmCpu.step();
        
        // Check if PC changed (indicates memory access might have occurred)
        const newPC = this.wasmCpu.pc;
        if (newPC !== this.lastSyncedPC) {
            // For now, we'll handle memory writes through the read/write methods
            // In the future, we might batch these for performance
            this.lastSyncedPC = newPC;
        }
        
        // Update metrics
        const duration = Date.now() - startTime;
        this.updateMetrics(cycles, duration);
        
        return cycles;
    }
    
    performBulkSteps(cycles: number): void {
        if (!this.wasmCpu) {
            throw new Error('WASM engine not initialized');
        }
        
        const startTime = Date.now();
        
        // Execute multiple cycles
        const actualCycles = this.wasmCpu.step_cycles(cycles);
        
        const duration = Date.now() - startTime;
        this.metrics.totalCycles += actualCycles;
        this.metrics.lastStepDuration = duration * 1_000_000; // Convert to nanoseconds
    }
    
    reset(): void {
        if (!this.wasmCpu) {
            throw new Error('WASM engine not initialized');
        }
        
        this.wasmCpu.reset();
        this.metrics = this.initializeMetrics();
        this.metricsStartTime = Date.now();
        
        // Re-sync memory after reset
        this.syncMemoryFromBus();
    }
    
    halt(): void {
        if (!this.wasmCpu) {
            throw new Error('WASM engine not initialized');
        }
        
        // Set interrupt flag to halt execution
        const status = this.wasmCpu.status;
        this.wasmCpu.status = status | 0x04; // Set I flag
    }
    
    // ============ State Management ============
    
    saveState(): CPU6502State {
        if (!this.wasmCpu) {
            throw new Error('WASM engine not initialized');
        }
        
        // Get state from WASM CPU
        const wasmState = this.wasmCpu.save_state();
        
        // Convert WASM state to CPU6502State format
        const status = this.wasmCpu.status;
        
        return {
            version: '3.0', // Match the JS engine version
            PC: this.wasmCpu.pc,
            A: this.wasmCpu.a,
            X: this.wasmCpu.x,
            Y: this.wasmCpu.y,
            S: this.wasmCpu.s,
            N: (status >> 7) & 1,
            V: (status >> 6) & 1,
            D: (status >> 3) & 1,
            I: (status >> 2) & 1,
            Z: (status >> 1) & 1,
            C: status & 1,
            irq: wasmState.irq || 0,
            nmi: wasmState.nmi || 0,
            cycles: wasmState.cycles || this.metrics.totalCycles,
            opcode: wasmState.opcode || 0,
            address: wasmState.address || 0,
            data: wasmState.data || 0,
            pendingIrq: wasmState.pendingIrq || 0,
            pendingNmi: wasmState.pendingNmi || 0
        };
    }
    
    loadState(state: CPU6502State): void {
        if (!this.wasmCpu) {
            throw new Error('WASM engine not initialized');
        }
        
        // Set registers
        this.wasmCpu.pc = state.PC;
        this.wasmCpu.a = state.A;
        this.wasmCpu.x = state.X;
        this.wasmCpu.y = state.Y;
        this.wasmCpu.s = state.S;
        
        // Combine status flags into status register
        let status = 0;
        status |= (state.N & 1) << 7;
        status |= (state.V & 1) << 6;
        status |= 1 << 5; // Unused, always 1
        status |= 1 << 4; // B flag (not stored)
        status |= (state.D & 1) << 3;
        status |= (state.I & 1) << 2;
        status |= (state.Z & 1) << 1;
        status |= (state.C & 1);
        
        this.wasmCpu.status = status;
        
        // Load the state into WASM
        const wasmState = {
            ...state,
            status
        };
        this.wasmCpu.load_state(wasmState);
        
        // Sync memory after state load
        this.syncMemoryFromBus();
    }
    
    getRegisters(): CPURegisters {
        if (!this.wasmCpu) {
            throw new Error('WASM engine not initialized');
        }
        
        const status = this.wasmCpu.status;
        
        return {
            PC: this.wasmCpu.pc,
            A: this.wasmCpu.a,
            X: this.wasmCpu.x,
            Y: this.wasmCpu.y,
            S: this.wasmCpu.s,
            N: (status >> 7) & 1,
            V: (status >> 6) & 1,
            B: 0, // B flag is not stored
            D: (status >> 3) & 1,
            I: (status >> 2) & 1,
            Z: (status >> 1) & 1,
            C: status & 1
        };
    }
    
    setRegisters(registers: Partial<CPURegisters>): void {
        if (!this.wasmCpu) {
            throw new Error('WASM engine not initialized');
        }
        
        if (registers.PC !== undefined) this.wasmCpu.pc = registers.PC;
        if (registers.A !== undefined) this.wasmCpu.a = registers.A;
        if (registers.X !== undefined) this.wasmCpu.x = registers.X;
        if (registers.Y !== undefined) this.wasmCpu.y = registers.Y;
        if (registers.S !== undefined) this.wasmCpu.s = registers.S;
        
        // Update status flags if provided
        if (registers.N !== undefined || registers.V !== undefined || 
            registers.D !== undefined || registers.I !== undefined || 
            registers.Z !== undefined || registers.C !== undefined) {
            
            let status = this.wasmCpu.status;
            
            if (registers.N !== undefined) {
                status = (status & 0x7F) | ((registers.N & 1) << 7);
            }
            if (registers.V !== undefined) {
                status = (status & 0xBF) | ((registers.V & 1) << 6);
            }
            if (registers.D !== undefined) {
                status = (status & 0xF7) | ((registers.D & 1) << 3);
            }
            if (registers.I !== undefined) {
                status = (status & 0xFB) | ((registers.I & 1) << 2);
            }
            if (registers.Z !== undefined) {
                status = (status & 0xFD) | ((registers.Z & 1) << 1);
            }
            if (registers.C !== undefined) {
                status = (status & 0xFE) | (registers.C & 1);
            }
            
            this.wasmCpu.status = status;
        }
    }
    
    // ============ Memory Operations ============
    
    read(address: number): number {
        // Always read from Bus to maintain consistency
        return this.bus.read(address);
    }
    
    write(address: number, value: number): void {
        // Write to both WASM and Bus
        if (this.wasmCpu) {
            this.wasmCpu.write_memory(address, value);
        }
        this.bus.write(address, value);
    }
    
    readRange(start: number, length: number): Uint8Array {
        if (!this.wasmCpu) {
            // Fallback to Bus if WASM not ready
            const data = new Uint8Array(length);
            for (let i = 0; i < length; i++) {
                data[i] = this.bus.read(start + i);
            }
            return data;
        }
        
        // Use WASM's efficient range read
        return this.wasmCpu.read_memory_range(start, length);
    }
    
    writeRange(start: number, data: Uint8Array): void {
        if (this.wasmCpu) {
            this.wasmCpu.write_memory_range(start, data);
        }
        
        // Also write to Bus
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
        if (this.wasmCpu) {
            // Get metrics from WASM if available
            const wasmMetrics = this.wasmCpu.get_metrics();
            if (wasmMetrics) {
                this.metrics.totalCycles = wasmMetrics.total_cycles || this.metrics.totalCycles;
                this.metrics.instructionsExecuted = wasmMetrics.instructions_executed || this.metrics.instructionsExecuted;
            }
        }
        
        return { ...this.metrics };
    }
    
    resetMetrics(): void {
        this.metrics = this.initializeMetrics();
        this.metricsStartTime = Date.now();
        
        if (this.wasmCpu) {
            this.wasmCpu.reset_metrics();
        }
    }
    
    getMemoryUsage(): number {
        // WASM memory usage estimate
        // 64KB for CPU memory + overhead
        return 65536 + 4096 + (this.breakpoints.size * 8);
    }
    
    // ============ Private Methods ============
    
    private updateMetrics(cycles: number, duration: number): void {
        this.metrics.totalCycles += cycles;
        this.metrics.instructionsExecuted++;
        this.metrics.lastStepDuration = duration * 1_000_000; // Convert to nanoseconds
        
        // Calculate average IPS
        const totalTime = Date.now() - this.metricsStartTime;
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
        if (!this.wasmCpu) {
            return {
                status: 'Not initialized',
                breakpoints: Array.from(this.breakpoints),
                metrics: this.metrics
            };
        }
        
        return {
            status: 'Ready',
            registers: this.getRegisters(),
            breakpoints: Array.from(this.breakpoints),
            metrics: this.metrics,
            wasmMetrics: this.wasmCpu.get_metrics()
        };
    }
    
    cleanup(): void {
        // Free WASM resources
        if (this.wasmCpu) {
            this.wasmCpu.free();
            this.wasmCpu = null;
        }
        
        // Clean up other resources
        this.breakpoints.clear();
        this.resetMetrics();
        this._isReady = false;
        this.initPromise = null;
    }
}