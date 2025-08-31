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
import type { WasmCPU } from './wasm-loader';
import type Bus from '../Bus';
import { initializeWasmModule, getWasmCPUClass, isWasmSupported } from './wasm-loader';
import { loggingService } from '../../services/LoggingService';
import { setBusForWasm, installMemoryBridge } from './wasm-memory-bridge';

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
    private lastMetricsUpdate: number;
    private lastSecondInstructions: number;
    private lastSecondStartTime: number;
    private initPromise: Promise<void> | null = null;
    private _isReady = false;
    
    
    constructor(bus: Bus) {
        this.bus = bus;
        this.metricsStartTime = Date.now();
        this.lastMetricsUpdate = Date.now();
        this.lastSecondInstructions = 0;
        this.lastSecondStartTime = Date.now();
        this.metrics = this.initializeMetrics();
        
        // Check WASM support
        if (!isWasmSupported()) {
            throw new Error('WebAssembly is not supported in this environment');
        }
        
        // Install memory bridge for WASM to use Bus as single source of truth
        installMemoryBridge();
        setBusForWasm(bus);
        loggingService.info('WasmEngine', 'Memory bridge configured for single source of truth');
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
            
            // Get the WasmCPU class
            const WasmCPUClass = getWasmCPUClass();
            if (!WasmCPUClass) {
                throw new Error('WasmCPU class not available after initialization');
            }
            
            // Create the WASM CPU instance
            this.wasmCpu = new WasmCPUClass();
            loggingService.info('WasmEngine', 'WASM CPU instance created');
            
            // IMPORTANT: Sync memory BEFORE reset so WASM can read the reset vector
            // The reset vector at 0xFFFC-0xFFFD must be available
            // No memory syncing needed - WASM calls JavaScript Bus directly
            
            // Now reset the CPU - it will read the reset vector from memory
            this.wasmCpu.reset();
            
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
    
    // ============ Core Operations ============
    
    performSingleStep(): number {
        if (!this.wasmCpu) {
            // Return 0 cycles if not initialized - the engine will be initialized asynchronously
            loggingService.warn('WasmEngine', 'performSingleStep called before initialization complete');
            return 0;
        }
        
        const startTime = Date.now();
        
        // Check for breakpoints
        const pc = this.wasmCpu.pc;
        if (this.breakpoints.has(pc)) {
            // Breakpoint handling is done through execution hook
            // Don't log here as it can flood console
        }
        
        // Get opcode for metrics and debugging only
        const opcode = this.bus.read(pc);
        
        // No memory syncing needed - WASM calls JavaScript Bus directly
        
        // Execute one instruction
        const cycles = this.wasmCpu.step();
        
        // CRITICAL: If WASM returns 0 cycles, it means execution failed
        // We should still advance to avoid infinite loops
        const actualCycles = cycles || 2; // Default to 2 cycles if 0
        
        // Check if PC didn't advance (might indicate a halt or invalid instruction)
        const newPC = this.wasmCpu.pc;
        if (cycles === 0) {
            loggingService.error('WasmEngine', 
                `WASM returned 0 cycles at PC=${pc.toString(16)}, opcode=${opcode.toString(16)}, newPC=${newPC.toString(16)}`);
            // Return at least 2 cycles to prevent infinite loop
            return actualCycles;
        }
        
        if (newPC === pc && opcode !== 0x4C && opcode !== 0x6C && opcode !== 0x20) {
            // Not a JMP, JMP indirect, or JSR - PC should have advanced
            loggingService.warn('WasmEngine', 
                `PC didn't advance at PC=${pc.toString(16)}, opcode=${opcode.toString(16)}`);
        }
        
        // No write-back needed - WASM writes directly to Bus
        
        // Update metrics
        const duration = Date.now() - startTime;
        this.updateMetrics(actualCycles, duration);
        
        return actualCycles;
    }
    
    performBulkSteps(cycles: number): void {
        if (!this.wasmCpu) {
            // Skip if not initialized - the engine will be initialized asynchronously
            loggingService.warn('WasmEngine', 'performBulkSteps called before initialization complete');
            return;
        }
        
        // For bulk steps, execute instructions one by one to maintain Bus consistency
        // This ensures proper I/O handling
        let remainingCycles = cycles;
        let totalExecuted = 0;
        
        while (remainingCycles > 0 && totalExecuted < cycles) {
            const executed = this.performSingleStep();
            totalExecuted += executed;
            remainingCycles -= executed;
            
            // Early exit if we've executed enough cycles
            if (totalExecuted >= cycles) break;
        }
        
        // Metrics are already updated by performSingleStep
    }
    
    reset(): void {
        if (!this.wasmCpu) {
            loggingService.warn('WasmEngine', 'reset called before initialization complete');
            return;
        }
        
        // Reset the CPU - it reads reset vector directly from Bus
        this.wasmCpu.reset();
        
        // Reset complete - PC set to reset vector
        
        this.metrics = this.initializeMetrics();
        this.metricsStartTime = Date.now();
        this.lastMetricsUpdate = Date.now();
        this.lastSecondInstructions = 0;
        this.lastSecondStartTime = Date.now();
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
        
        // Load the state into WASM - convert to expected format
        const wasmState = {
            pc: state.PC,
            a: state.A,
            x: state.X,
            y: state.Y,
            s: state.S,
            status: status,
            cycles: state.cycles || 0,
            irq: state.irq || false,
            nmi: state.nmi || false
        };
        
        try {
            this.wasmCpu.load_state(wasmState);
        } catch (error) {
            loggingService.error('WasmEngine', `Failed to load state into WASM: ${error}`);
            // Set registers directly as fallback
            // The registers were already set above, so just log the error
        }
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
        // Read directly from Bus - WASM uses Bus for all memory access
        return this.bus.read(address);
    }
    
    write(address: number, value: number): void {
        // Write to Bus - WASM will read it from there
        this.bus.write(address, value);
    }
    
    readRange(start: number, length: number): Uint8Array {
        // Read from Bus - WASM uses Bus for all memory access
        const data = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
            data[i] = this.bus.read(start + i);
        }
        return data;
    }
    
    writeRange(start: number, data: Uint8Array): void {
        // Write to Bus - WASM will read it from there
        for (let i = 0; i < data.length; i++) {
            this.bus.write(start + i, data[i]);
        }
    }
    
    loadProgram(program: Uint8Array, address = 0x0000): void {
        // Load program into Bus - WASM will read it directly
        for (let i = 0; i < program.length; i++) {
            this.bus.write(address + i, program[i]);
        }
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
        
        // Force update IPS calculation when metrics are requested
        const now = Date.now();
        const totalTime = now - this.metricsStartTime;
        if (totalTime > 0 && this.metrics.instructionsExecuted > 0) {
            this.metrics.averageIPS = Math.floor((this.metrics.instructionsExecuted / totalTime) * 1000);
        }
        
        // Calculate instantaneous IPS (last second)
        const timeSinceSecondStart = now - this.lastSecondStartTime;
        let lastIPS = 0;
        if (timeSinceSecondStart > 0) {
            // Calculate IPS based on instructions in the current second window
            lastIPS = Math.floor((this.lastSecondInstructions / timeSinceSecondStart) * 1000);
        }
        
        return { 
            ...this.metrics,
            // Add lastIPS as a computed field
            lastIPS: lastIPS || this.metrics.averageIPS
        } as EngineMetrics;
    }
    
    resetMetrics(): void {
        this.metrics = this.initializeMetrics();
        this.metricsStartTime = Date.now();
        this.lastMetricsUpdate = Date.now();
        this.lastSecondInstructions = 0;
        this.lastSecondStartTime = Date.now();
        
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
        this.lastSecondInstructions++;
        this.metrics.lastStepDuration = duration * 1_000_000; // Convert to nanoseconds
        
        // Update IPS calculation periodically
        const now = Date.now();
        const timeSinceLastUpdate = now - this.lastMetricsUpdate;
        
        if (timeSinceLastUpdate >= 100) {
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
            
            this.lastMetricsUpdate = now;
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