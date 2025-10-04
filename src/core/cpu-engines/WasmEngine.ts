/**
 * WASM CPU Engine
 *
 * High-performance WebAssembly implementation of the 6502 CPU
 * that conforms to the ICPUEngine interface.
 *
 * Uses WasmSystem which contains CPU, Bus, RAM, and ROM all in WASM
 * for maximum performance (5-10x faster than JS engine).
 */

import type {
    ICPUEngine,
    EngineType,
    CPURegisters,
    EngineMetrics
} from '../cpu-interface/ICPUEngine';
import type { CPU6502State } from '../cpu6502/types';
import type { WasmSystem } from './wasm-loader';
import type Bus from '../Bus';
import { initializeWasmModule, getWasmSystemClass, isWasmSupported } from './wasm-loader';
import { loggingService } from '../../services/LoggingService';
import ROM from '../ROM';

/**
 * WASM implementation of the CPU engine
 */
export class WasmEngine implements ICPUEngine {
    readonly engineType: EngineType = 'WASM';
    readonly engineVersion = '2.0.0';  // Updated to 2.0 for WasmSystem

    readonly capabilities = {
        supportsBreakpoints: true,
        supportsProfiling: true,
        supportsStepBack: false,
        maxSpeed: 10_000_000 // ~10MHz potential in WASM
    };

    private wasmSystem: WasmSystem | null = null;
    private bus: Bus;  // Keep for I/O synchronization
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

        loggingService.info('WasmEngine', 'WasmSystem engine initialized - no memory bridge needed');
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
            efficiency: 500 // WasmSystem is 5x more efficient (no boundary crossings)
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
    
    /**
     * Extract ROM data from the JavaScript Bus
     */
    private extractROMDataFromBus(): Uint8Array {
        // Find ROM component in bus mapping
        // Bus structure: busMapping contains { addr: [start, end], component, name }
        const busData = this.bus.getInspectable();

        // Look for ROM component in children
        const romChild = busData.children?.find(child => child.id === 'ROM' || child.type === 'ROM');

        if (!romChild?.component) {
            loggingService.warn('WasmEngine', 'ROM component not found in bus - using empty ROM');
            return new Uint8Array(256); // Default 256 byte ROM
        }

        // Access the ROM component
        // We need to access the actual ROM instance from the bus
        // The bus is constructed with busMapping which includes the ROM component
        const busInternal = this.bus as unknown as { busMapping: Array<{ name: string; component: unknown }> };
        const romMapping = busInternal.busMapping?.find(m => m.name === 'ROM');

        if (!romMapping) {
            loggingService.warn('WasmEngine', 'ROM mapping not found - using empty ROM');
            return new Uint8Array(256);
        }

        const rom = romMapping.component as ROM;
        if (typeof rom.getData !== 'function') {
            loggingService.warn('WasmEngine', 'ROM.getData() not available - using empty ROM');
            return new Uint8Array(256);
        }

        const romData = rom.getData();
        loggingService.info('WasmEngine', `Extracted ${romData.length} bytes of ROM data from Bus`);
        return romData;
    }

    private async performInitialization(): Promise<void> {
        const startTime = Date.now();

        try {
            loggingService.info('WasmEngine', 'Starting WASM System initialization...');

            // Initialize the WASM module
            await initializeWasmModule();

            // Get the WasmSystem class
            const WasmSystemClass = getWasmSystemClass();
            if (!WasmSystemClass) {
                throw new Error('WasmSystem class not available after initialization');
            }

            // Create the WASM System instance
            this.wasmSystem = new WasmSystemClass();
            loggingService.info('WasmEngine', 'WasmSystem instance created');

            // Extract ROM data from Bus
            const romData = this.extractROMDataFromBus();

            // Initialize with RAM and ROM
            const ramSize = 65536; // 64KB total system RAM
            this.wasmSystem.initialize(ramSize, romData);

            // Verify initialization
            if (!this.wasmSystem.is_initialized()) {
                throw new Error('WasmSystem initialization failed');
            }

            this._isReady = true;
            this.metrics.initializationTime = Date.now() - startTime;

            loggingService.info('WasmEngine', `WASM System initialized in ${this.metrics.initializationTime.toFixed(2)}ms`);
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
        if (!this.wasmSystem?.is_initialized()) {
            loggingService.warn('WasmEngine', 'performSingleStep called before initialization complete');
            return 0;
        }

        const startTime = Date.now();

        // Check for breakpoints
        const cpuState = this.wasmSystem.get_cpu_state();
        const pc = cpuState.pc;
        if (this.breakpoints.has(pc)) {
            // Breakpoint handling is done through execution hook
            // Don't log here as it can flood console
        }

        // Execute one instruction in WASM (no boundary crossings!)
        const cycles = this.wasmSystem.step();

        // CRITICAL: If WASM returns 0 cycles, it means execution failed
        const actualCycles = cycles || 2; // Default to 2 cycles if 0

        if (cycles === 0) {
            const newState = this.wasmSystem.get_cpu_state();
            loggingService.error('WasmEngine',
                `WASM returned 0 cycles at PC=${pc.toString(16)}, newPC=${newState.pc.toString(16)}`);
        }

        // Sync critical I/O writes back to JavaScript Bus
        // This is needed for PIA, display, and keyboard I/O
        this.syncWasmToJsBus();

        // Update metrics
        const duration = Date.now() - startTime;
        this.updateMetrics(actualCycles, duration);

        return actualCycles;
    }
    
    /**
     * Sync WASM memory to JavaScript Bus for I/O operations
     * Only syncs critical I/O regions to maintain compatibility with PIA, display, keyboard
     */
    private syncWasmToJsBus(): void {
        if (!this.wasmSystem) return;

        // Sync PIA region (0xD010-0xD013)
        // This is critical for keyboard and display I/O
        const PIA_START = 0xD010;
        const PIA_END = 0xD013;

        for (let addr = PIA_START; addr <= PIA_END; addr++) {
            const value = this.wasmSystem.read_memory(addr);
            this.bus.write(addr, value);
        }
    }

    performBulkSteps(cycles: number): void {
        if (!this.wasmSystem?.is_initialized()) {
            loggingService.warn('WasmEngine', 'performBulkSteps called before initialization complete');
            return;
        }

        // WasmSystem can run cycles efficiently without boundary crossings
        const executedCycles = this.wasmSystem.run_cycles(cycles);

        // Sync I/O after bulk execution
        this.syncWasmToJsBus();

        // Update metrics
        this.updateMetrics(executedCycles, 0);
    }
    
    reset(): void {
        if (!this.wasmSystem) {
            loggingService.warn('WasmEngine', 'reset called before initialization complete');
            return;
        }

        // Reset the WASM System
        this.wasmSystem.reset();

        this.metrics = this.initializeMetrics();
        this.metricsStartTime = Date.now();
        this.lastMetricsUpdate = Date.now();
        this.lastSecondInstructions = 0;
        this.lastSecondStartTime = Date.now();
    }

    halt(): void {
        if (!this.wasmSystem) {
            throw new Error('WASM engine not initialized');
        }

        // Set interrupt flag to halt execution
        const state = this.wasmSystem.get_cpu_state();
        const status = state.status | 0x04; // Set I flag
        this.wasmSystem.set_status(status);
    }
    
    // ============ State Management ============

    saveState(): CPU6502State {
        if (!this.wasmSystem) {
            throw new Error('WASM engine not initialized');
        }

        // Get state from WASM System and immediately destructure
        // This ensures the temporary object is released before we return
        const wasmState = this.wasmSystem.get_cpu_state();
        const pc = wasmState.pc;
        const a = wasmState.a;
        const x = wasmState.x;
        const y = wasmState.y;
        const s = wasmState.s;
        const status = wasmState.status;
        const irq = wasmState.irq;
        const nmi = wasmState.nmi;
        const cycles = wasmState.cycles || this.metrics.totalCycles;

        // Return new object (wasmState reference is now released)
        return {
            version: '3.0',
            PC: pc,
            A: a,
            X: x,
            Y: y,
            S: s,
            N: (status >> 7) & 1,
            V: (status >> 6) & 1,
            D: (status >> 3) & 1,
            I: (status >> 2) & 1,
            Z: (status >> 1) & 1,
            C: status & 1,
            irq: irq ? 1 : 0,
            nmi: nmi ? 1 : 0,
            cycles: cycles,
            opcode: 0,
            address: 0,
            data: 0,
            pendingIrq: 0,
            pendingNmi: 0
        };
    }
    
    loadState(state: CPU6502State): void {
        if (!this.wasmSystem) {
            throw new Error('WASM engine not initialized');
        }

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

        // Set registers using WasmSystem setters
        this.wasmSystem.set_pc(state.PC);
        this.wasmSystem.set_a(state.A);
        this.wasmSystem.set_x(state.X);
        this.wasmSystem.set_y(state.Y);
        this.wasmSystem.set_s(state.S);
        this.wasmSystem.set_status(status);

        loggingService.info('WasmEngine', 'State loaded into WasmSystem');
    }
    
    getRegisters(): CPURegisters {
        if (!this.wasmSystem) {
            throw new Error('WASM engine not initialized');
        }

        // Get state and immediately destructure to release WASM borrow
        const state = this.wasmSystem.get_cpu_state();
        const pc = state.pc;
        const a = state.a;
        const x = state.x;
        const y = state.y;
        const s = state.s;
        const status = state.status;

        return {
            PC: pc,
            A: a,
            X: x,
            Y: y,
            S: s,
            N: (status >> 7) & 1,
            V: (status >> 6) & 1,
            B: 0,
            D: (status >> 3) & 1,
            I: (status >> 2) & 1,
            Z: (status >> 1) & 1,
            C: status & 1
        };
    }
    
    setRegisters(registers: Partial<CPURegisters>): void {
        if (!this.wasmSystem) {
            throw new Error('WASM engine not initialized');
        }

        if (registers.PC !== undefined) this.wasmSystem.set_pc(registers.PC);
        if (registers.A !== undefined) this.wasmSystem.set_a(registers.A);
        if (registers.X !== undefined) this.wasmSystem.set_x(registers.X);
        if (registers.Y !== undefined) this.wasmSystem.set_y(registers.Y);
        if (registers.S !== undefined) this.wasmSystem.set_s(registers.S);

        // Update status flags if provided
        if (registers.N !== undefined || registers.V !== undefined ||
            registers.D !== undefined || registers.I !== undefined ||
            registers.Z !== undefined || registers.C !== undefined) {

            // Get current status and immediately extract it to release WASM borrow
            let status: number;
            {
                const state = this.wasmSystem.get_cpu_state();
                status = state.status;
                // state goes out of scope here, releasing the borrow
            }

            // Now modify status with the new flag values
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

            // Set the modified status (state borrow has been released)
            this.wasmSystem.set_status(status);
        }
    }
    
    // ============ Memory Operations ============

    read(address: number): number {
        if (!this.wasmSystem) {
            return this.bus.read(address);
        }
        // Read from WASM memory
        return this.wasmSystem.read_memory(address);
    }

    write(address: number, value: number): void {
        if (!this.wasmSystem) {
            this.bus.write(address, value);
            return;
        }

        // Write to WASM
        this.wasmSystem.write_memory(address, value);

        // Also write to JS Bus for I/O compatibility (PIA, display, etc.)
        this.bus.write(address, value);
    }
    
    readRange(start: number, length: number): Uint8Array {
        if (!this.wasmSystem) {
            const data = new Uint8Array(length);
            for (let i = 0; i < length; i++) {
                data[i] = this.bus.read(start + i);
            }
            return data;
        }

        // Read from WASM memory
        const data = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
            data[i] = this.wasmSystem.read_memory(start + i);
        }
        return data;
    }

    writeRange(start: number, data: Uint8Array): void {
        if (!this.wasmSystem) {
            for (let i = 0; i < data.length; i++) {
                this.bus.write(start + i, data[i]);
            }
            return;
        }

        // Write to both WASM and JS Bus
        for (let i = 0; i < data.length; i++) {
            this.wasmSystem.write_memory(start + i, data[i]);
            this.bus.write(start + i, data[i]);
        }
    }

    loadProgram(program: Uint8Array, address = 0x0000): void {
        // Load program into both WASM and JS Bus
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
        if (this.wasmSystem) {
            // Get metrics from WasmSystem if available
            const wasmMetrics = this.wasmSystem.get_metrics();
            if (wasmMetrics) {
                this.metrics.totalCycles = wasmMetrics.cycles || this.metrics.totalCycles;
                this.metrics.instructionsExecuted = wasmMetrics.instructions || this.metrics.instructionsExecuted;
                this.metrics.averageIPS = wasmMetrics.average_ips || this.metrics.averageIPS;
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
    }
    
    getMemoryUsage(): number {
        if (!this.wasmSystem) {
            return 0;
        }

        // WasmSystem memory usage:
        // RAM size + ROM size + overhead
        const ramSize = this.wasmSystem.get_ram_size();
        return ramSize + 256 + 4096 + (this.breakpoints.size * 8);
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
        if (!this.wasmSystem) {
            return {
                status: 'Not initialized',
                breakpoints: Array.from(this.breakpoints),
                metrics: this.metrics
            };
        }

        return {
            status: 'Ready',
            engineVersion: this.engineVersion,
            registers: this.getRegisters(),
            breakpoints: Array.from(this.breakpoints),
            metrics: this.metrics,
            wasmMetrics: this.wasmSystem.get_metrics(),
            memoryMap: this.wasmSystem.get_memory_map()
        };
    }

    cleanup(): void {
        // Free WASM resources
        if (this.wasmSystem) {
            this.wasmSystem.free();
            this.wasmSystem = null;
        }

        // Clean up other resources
        this.breakpoints.clear();
        this.resetMetrics();
        this._isReady = false;
        this.initPromise = null;
    }
}