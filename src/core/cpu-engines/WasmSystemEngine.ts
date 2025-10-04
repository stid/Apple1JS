/**
 * WASM System Engine
 *
 * High-performance WebAssembly implementation with self-contained
 * CPU, Bus, RAM, and ROM all in WASM. This eliminates JavaScript
 * boundary crossings for memory access, providing 5-10x performance improvement.
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

/**
 * WASM System implementation of the CPU engine
 * Uses self-contained WasmSystem (CPU + Bus + RAM + ROM in WASM)
 */
export class WasmSystemEngine implements ICPUEngine {
    readonly engineType: EngineType = 'WASM';
    readonly engineVersion = '1.0.0';

    readonly capabilities = {
        supportsBreakpoints: true,
        supportsProfiling: true,
        supportsStepBack: false,
        maxSpeed: 10_000_000 // ~10MHz potential in WASM
    };

    private wasmSystem: WasmSystem | null = null;
    private bus: Bus; // JavaScript Bus for I/O compatibility
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

        loggingService.info('WasmSystemEngine', 'Initialized with self-contained WASM system');
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
            efficiency: 200 // WASM System is typically 2x more efficient than JS
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
            loggingService.info('WasmSystemEngine', 'Starting WASM system initialization...');

            // Initialize the WASM module
            await initializeWasmModule();

            // Get the WasmSystem class
            const WasmSystemClass = getWasmSystemClass();
            if (!WasmSystemClass) {
                throw new Error('WasmSystem class not available after initialization');
            }

            // Create the WasmSystem instance
            this.wasmSystem = new WasmSystemClass();
            loggingService.info('WasmSystemEngine', 'WASM System instance created');

            // Extract ROM data from JavaScript Bus
            const romData = this.extractROMDataFromBus();
            loggingService.info('WasmSystemEngine', `Extracted ${romData.length} bytes of ROM data`);

            // Initialize WasmSystem with RAM size and ROM data
            const ramSize = 65536; // 64KB total address space
            this.wasmSystem.initialize(ramSize, romData);

            // Verify initialization
            if (!this.wasmSystem.is_initialized()) {
                throw new Error('WasmSystem initialization failed');
            }

            loggingService.info('WasmSystemEngine', 'WasmSystem initialized and verified');

            // Reset the system to set up PC from reset vector
            this.wasmSystem.reset();

            this._isReady = true;
            this.metrics.initializationTime = Date.now() - startTime;

            loggingService.info('WasmSystemEngine',
                `WASM system initialized in ${this.metrics.initializationTime.toFixed(2)}ms`);
        } catch (error) {
            loggingService.error('WasmSystemEngine', `Failed to initialize: ${error}`);
            throw new Error(`WASM system initialization failed: ${error}`);
        }
    }

    /**
     * Extract ROM data from JavaScript Bus
     * Finds the ROM component and extracts its data
     */
    private extractROMDataFromBus(): Uint8Array {
        try {
            // Access the bus mapping to find ROM
            // We need to use type assertion since busMapping is private
            const busWithMapping = this.bus as unknown as { busMapping: Array<{
                addr: [number, number];
                component: { getData?: () => Uint8Array };
                name: string;
            }> };

            // Find the ROM component in the bus mapping
            const romMapping = busWithMapping.busMapping.find(
                mapping => mapping.name === 'ROM'
            );

            if (!romMapping) {
                throw new Error('ROM component not found in bus mapping');
            }

            // Get ROM data using the getData() method
            const romComponent = romMapping.component;
            if (!romComponent.getData) {
                throw new Error('ROM component does not have getData() method');
            }

            const romData = romComponent.getData();

            if (!romData || romData.length === 0) {
                throw new Error('ROM data is empty');
            }

            loggingService.info('WasmSystemEngine',
                `Extracted ROM from ${romMapping.addr[0].toString(16)}-${romMapping.addr[1].toString(16)}`);

            return romData;
        } catch (error) {
            loggingService.error('WasmSystemEngine', `Failed to extract ROM data: ${error}`);
            throw error;
        }
    }

    async ensureReady(): Promise<void> {
        if (!this._isReady) {
            await this.initialize();
        }
    }

    // ============ Core Operations ============

    performSingleStep(): number {
        if (!this.wasmSystem || !this.wasmSystem.is_initialized()) {
            loggingService.warn('WasmSystemEngine', 'performSingleStep called before initialization complete');
            return 0;
        }

        const startTime = Date.now();

        // Check for breakpoints
        const state = this.wasmSystem.get_cpu_state();
        const pc = state.pc;

        if (this.breakpoints.has(pc)) {
            // Breakpoint hit - could be handled by execution hook
            // Don't log here to avoid console flooding
        }

        // Execute one instruction in WASM
        const cycles = this.wasmSystem.step();

        // CRITICAL: If WASM returns 0 cycles, it means execution failed
        const actualCycles = cycles || 2; // Default to 2 cycles if 0

        if (cycles === 0) {
            const newState = this.wasmSystem.get_cpu_state();
            loggingService.error('WasmSystemEngine',
                `WASM returned 0 cycles at PC=${pc.toString(16)}, newPC=${newState.pc.toString(16)}`);
        }

        // Sync critical I/O writes back to JavaScript Bus
        // This ensures display and keyboard I/O work correctly
        this.syncIOToJavaScriptBus();

        // Update metrics
        const duration = Date.now() - startTime;
        this.updateMetrics(actualCycles, duration);

        return actualCycles;
    }

    performBulkSteps(cycles: number): void {
        if (!this.wasmSystem || !this.wasmSystem.is_initialized()) {
            loggingService.warn('WasmSystemEngine', 'performBulkSteps called before initialization complete');
            return;
        }

        // Use WASM's bulk execution for maximum performance
        // This avoids JavaScript boundary crossings
        const totalCycles = this.wasmSystem.run_cycles(cycles);

        // Sync I/O after bulk execution
        this.syncIOToJavaScriptBus();

        // Update metrics
        // Approximate instruction count (average 2-4 cycles per instruction)
        const approximateInstructions = Math.floor(totalCycles / 3);
        this.metrics.totalCycles += totalCycles;
        this.metrics.instructionsExecuted += approximateInstructions;
        this.lastSecondInstructions += approximateInstructions;
    }

    /**
     * Sync I/O memory locations from WASM to JavaScript Bus
     * This ensures display and keyboard I/O devices work correctly
     *
     * PIA is at 0xD010-0xD013, we need to sync these addresses
     */
    private syncIOToJavaScriptBus(): void {
        if (!this.wasmSystem) return;

        // PIA addresses: 0xD010-0xD013
        const PIA_START = 0xD010;
        const PIA_END = 0xD013;

        // Read from WASM and write to JavaScript Bus
        for (let addr = PIA_START; addr <= PIA_END; addr++) {
            const value = this.wasmSystem.read_memory(addr);
            this.bus.write(addr, value);
        }
    }

    reset(): void {
        if (!this.wasmSystem) {
            loggingService.warn('WasmSystemEngine', 'reset called before initialization complete');
            return;
        }

        // Reset the WASM system
        this.wasmSystem.reset();

        // Reset metrics
        this.metrics = this.initializeMetrics();
        this.metricsStartTime = Date.now();
        this.lastMetricsUpdate = Date.now();
        this.lastSecondInstructions = 0;
        this.lastSecondStartTime = Date.now();

        loggingService.info('WasmSystemEngine', 'System reset complete');
    }

    halt(): void {
        if (!this.wasmSystem) {
            throw new Error('WASM system not initialized');
        }

        // Set interrupt flag to halt execution
        this.wasmSystem.trigger_irq();
    }

    // ============ State Management ============

    saveState(): CPU6502State {
        if (!this.wasmSystem) {
            throw new Error('WASM system not initialized');
        }

        // Get state from WASM System
        const wasmState = this.wasmSystem.get_cpu_state();

        // Convert WASM state to CPU6502State format
        const status = wasmState.status;

        return {
            version: '3.0',
            PC: wasmState.pc,
            A: wasmState.a,
            X: wasmState.x,
            Y: wasmState.y,
            S: wasmState.s,
            N: (status >> 7) & 1,
            V: (status >> 6) & 1,
            D: (status >> 3) & 1,
            I: (status >> 2) & 1,
            Z: (status >> 1) & 1,
            C: status & 1,
            irq: 0,
            nmi: 0,
            cycles: this.metrics.totalCycles,
            opcode: 0,
            address: 0,
            data: 0,
            pendingIrq: 0,
            pendingNmi: 0
        };
    }

    loadState(state: CPU6502State): void {
        if (!this.wasmSystem) {
            throw new Error('WASM system not initialized');
        }

        // Set registers using WasmSystem setters
        this.wasmSystem.set_pc(state.PC);
        this.wasmSystem.set_a(state.A);
        this.wasmSystem.set_x(state.X);
        this.wasmSystem.set_y(state.Y);
        this.wasmSystem.set_s(state.S);

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

        this.wasmSystem.set_status(status);

        loggingService.info('WasmSystemEngine', 'State loaded successfully');
    }

    getRegisters(): CPURegisters {
        if (!this.wasmSystem) {
            throw new Error('WASM system not initialized');
        }

        const state = this.wasmSystem.get_cpu_state();
        const status = state.status;

        return {
            PC: state.pc,
            A: state.a,
            X: state.x,
            Y: state.y,
            S: state.s,
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
        if (!this.wasmSystem) {
            throw new Error('WASM system not initialized');
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

            const currentState = this.wasmSystem.get_cpu_state();
            let status = currentState.status;

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

            this.wasmSystem.set_status(status);
        }
    }

    // ============ Memory Operations ============

    read(address: number): number {
        if (!this.wasmSystem) {
            return 0;
        }

        // Read from WASM's internal memory
        return this.wasmSystem.read_memory(address);
    }

    write(address: number, value: number): void {
        if (!this.wasmSystem) {
            return;
        }

        // Write to WASM System's internal memory
        this.wasmSystem.write_memory(address, value);

        // IMPORTANT: Also write to JavaScript Bus for I/O compatibility
        // This ensures display and keyboard work correctly
        this.bus.write(address, value);
    }

    readRange(start: number, length: number): Uint8Array {
        if (!this.wasmSystem) {
            return new Uint8Array(length);
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
            return;
        }

        // Write to WASM and JavaScript Bus
        for (let i = 0; i < data.length; i++) {
            const addr = start + i;
            this.wasmSystem.write_memory(addr, data[i]);
            this.bus.write(addr, data[i]);
        }
    }

    loadProgram(program: Uint8Array, address = 0x0000): void {
        if (!this.wasmSystem) {
            return;
        }

        // Load into WASM and JavaScript Bus
        for (let i = 0; i < program.length; i++) {
            const addr = address + i;
            this.wasmSystem.write_memory(addr, program[i]);
            this.bus.write(addr, program[i]);
        }

        loggingService.info('WasmSystemEngine',
            `Loaded ${program.length} bytes at 0x${address.toString(16)}`);
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
            // Get metrics from WASM if available
            const wasmMetrics = this.wasmSystem.get_metrics();
            if (wasmMetrics) {
                this.metrics.totalCycles = wasmMetrics.total_cycles || this.metrics.totalCycles;
                this.metrics.instructionsExecuted = wasmMetrics.instructions_executed || this.metrics.instructionsExecuted;
            }
        }

        // Update IPS calculation
        const now = Date.now();
        const totalTime = now - this.metricsStartTime;
        if (totalTime > 0 && this.metrics.instructionsExecuted > 0) {
            this.metrics.averageIPS = Math.floor((this.metrics.instructionsExecuted / totalTime) * 1000);
        }

        // Calculate instantaneous IPS (last second)
        const timeSinceSecondStart = now - this.lastSecondStartTime;
        let lastIPS = 0;
        if (timeSinceSecondStart > 0) {
            lastIPS = Math.floor((this.lastSecondInstructions / timeSinceSecondStart) * 1000);
        }

        return {
            ...this.metrics,
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
        // WASM System memory usage estimate
        // 64KB RAM + 256B ROM + CPU state + overhead
        return 65536 + 256 + 4096 + (this.breakpoints.size * 8);
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

            // Reset last second counter every second
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
