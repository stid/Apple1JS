/**
 * WASM CPU Engine
 *
 * High-performance WebAssembly implementation of the 6502 CPU
 * that conforms to the ICPUEngine interface.
 *
 * Uses WasmSystem which contains CPU, Bus, RAM, and ROM all in WASM
 * for maximum performance (5-10x faster than JS engine).
 */

import type { ICPUEngine, EngineType, CPURegisters, EngineMetrics } from '../cpu-interface/ICPUEngine';
import type { CPU6502State } from '../cpu6502/types';
import type { WasmSystem } from './wasm-loader';
import type Bus from '../Bus';
import { initializeWasmModule, getWasmSystemClass, isWasmSupported } from './wasm-loader';
import { installMemoryBridge, setBusForWasm } from './wasm-memory-bridge';
import { loggingService } from '../../services/LoggingService';
import { Formatters } from '../../utils/formatters';
import ROM from '../ROM';
import { RAM_BANK1_START, RAM_BANK1_END, RAM_BANK2_START, RAM_BANK2_END } from '../constants/memory';

/**
 * WASM implementation of the CPU engine
 */
export class WasmEngine implements ICPUEngine {
    readonly engineType: EngineType = 'WASM';
    readonly engineVersion = '2.0.0'; // Updated to 2.0 for WasmSystem

    readonly capabilities = {
        supportsBreakpoints: true,
        supportsProfiling: true,
        supportsStepBack: false,
        maxSpeed: 10_000_000, // ~10MHz potential in WASM
    };

    private wasmSystem: WasmSystem | null = null;
    private bus: Bus; // Keep for I/O synchronization
    private breakpoints = new Set<number>();
    private metrics: EngineMetrics;
    private metricsStartTime: number;
    private lastMetricsUpdate: number;
    private lastSecondInstructions: number;
    private lastSecondStartTime: number;
    private initPromise: Promise<void> | null = null;
    private _isReady = false;
    // Cumulative host wall-clock ms spent executing since the last reset.
    // Divided by emulated seconds in getMetrics() to expose real engine cost.
    private hostExecMs = 0;

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

        loggingService.info('WasmEngine', 'WasmSystem engine initialized - memory bridge for I/O ready');
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
            efficiency: 500, // WasmSystem is 5x more efficient (no boundary crossings)
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
     *
     * IMPORTANT: The WASM ROM.flash() expects data in format:
     * [low_addr, high_addr, ...rom_bytes]
     *
     * For Apple 1 ROM at $FF00, the header should be [0x00, 0xFF]
     */
    private extractROMDataFromBus(): Uint8Array {
        // Find ROM component in bus mapping
        // Bus structure: busMapping contains { addr: [start, end], component, name }
        const busData = this.bus.getInspectable();

        // Look for ROM component in children
        const romChild = busData.children?.find((child) => child.id === 'ROM' || child.type === 'ROM');

        if (!romChild?.component) {
            loggingService.warn('WasmEngine', 'ROM component not found in bus - using empty ROM');
            // Return empty ROM with address header
            const emptyRom = new Uint8Array(258); // 2 header + 256 data
            emptyRom[0] = 0x00; // Low byte of $FF00
            emptyRom[1] = 0xff; // High byte of $FF00
            return emptyRom;
        }

        // Access the ROM component
        // We need to access the actual ROM instance from the bus
        // The bus is constructed with busMapping which includes the ROM component
        const busInternal = this.bus as unknown as { busMapping: Array<{ name: string; component: unknown }> };
        const romMapping = busInternal.busMapping?.find((m) => m.name === 'ROM');

        if (!romMapping) {
            loggingService.warn('WasmEngine', 'ROM mapping not found - using empty ROM');
            const emptyRom = new Uint8Array(258);
            emptyRom[0] = 0x00;
            emptyRom[1] = 0xff;
            return emptyRom;
        }

        const rom = romMapping.component as ROM;
        if (typeof rom.getData !== 'function') {
            loggingService.warn('WasmEngine', 'ROM.getData() not available - using empty ROM');
            const emptyRom = new Uint8Array(258);
            emptyRom[0] = 0x00;
            emptyRom[1] = 0xff;
            return emptyRom;
        }

        // Get the raw ROM data (without header)
        const rawRomData = rom.getData();

        // Create new array with 2-byte address header prepended
        // WASM ROM.flash() expects: [low_addr, high_addr, ...data]
        // Apple 1 ROM is at $FF00, so header is [0x00, 0xFF]
        const romDataWithHeader = new Uint8Array(2 + rawRomData.length);
        romDataWithHeader[0] = 0x00; // Low byte of $FF00
        romDataWithHeader[1] = 0xff; // High byte of $FF00
        romDataWithHeader.set(rawRomData, 2);

        loggingService.info(
            'WasmEngine',
            `Extracted ${rawRomData.length} bytes of ROM data from Bus (with 2-byte header for WASM)`,
        );
        return romDataWithHeader;
    }

    private async performInitialization(): Promise<void> {
        const startTime = Date.now();

        try {
            loggingService.info('WasmEngine', 'Starting WASM System initialization...');

            // Install memory bridge for I/O operations (PIA, keyboard, display)
            installMemoryBridge();
            setBusForWasm(this.bus);
            loggingService.info('WasmEngine', 'Memory bridge installed for I/O operations');

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

            // initialize() only flashes the WOZ Monitor ROM. The WasmSystem keeps RAM
            // in its own internal memory, so the JS Bus RAM banks (anniversary demo in
            // bank 1, Integer BASIC in bank 2) must be mirrored in or $E000/$0280 read
            // as zero under WASM. The JS Bus is the source of truth at handoff.
            this.seedRamFromBus();

            this._isReady = true;
            this.metrics.initializationTime = Date.now() - startTime;

            loggingService.info(
                'WasmEngine',
                `WASM System initialized in ${this.metrics.initializationTime.toFixed(2)}ms`,
            );
        } catch (error) {
            loggingService.error('WasmEngine', `Failed to initialize WASM engine: ${error}`);
            throw new Error(`WASM engine initialization failed: ${error}`);
        }
    }

    /**
     * Mirror the JS Bus RAM banks into the WasmSystem's internal RAM.
     *
     * The WasmSystem owns its RAM for zero-boundary-crossing execution, so any
     * program flashed into the JS RAM banks (anniversary demo in bank 1, Integer
     * BASIC in bank 2) must be copied across once at init — otherwise those
     * regions read as zero under the WASM engine. The JS Bus is authoritative at
     * this handoff, so we read straight through it (I/O at $D010-$D013 and the
     * WOZ ROM at $FF00 are outside both bank ranges and are left untouched).
     */
    private seedRamFromBus(): void {
        if (!this.wasmSystem) return;
        const banks: ReadonlyArray<readonly [number, number]> = [
            [RAM_BANK1_START, RAM_BANK1_END],
            [RAM_BANK2_START, RAM_BANK2_END],
        ];
        let seeded = 0;
        for (const [start, end] of banks) {
            for (let addr = start; addr <= end; addr++) {
                this.wasmSystem.write_memory(addr, this.bus.read(addr) & 0xff);
                seeded++;
            }
        }
        loggingService.info('WasmEngine', `Seeded ${seeded} RAM bytes into WASM from JS Bus (banks 1 & 2)`);
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

        // Execute one instruction in WASM (breakpoint checking happens in Rust!)
        const cycles = this.wasmSystem.step();

        // Check if a breakpoint was hit (WASM returns 0 cycles on breakpoint)
        const breakpointAddr = this.wasmSystem.get_breakpoint_hit();
        if (breakpointAddr >= 0) {
            loggingService.info(
                'WasmEngine',
                `Breakpoint hit at $${breakpointAddr.toString(16).toUpperCase().padStart(4, '0')}`,
            );
            // Don't clear the flag - let the caller handle it
            // This signals to DualEngine/WorkerState that execution should pause
            return 0; // Signal breakpoint hit
        }

        // CRITICAL: If WASM returns 0 cycles without breakpoint, something went wrong
        if (cycles === 0 && breakpointAddr < 0) {
            const cpuState = this.wasmSystem.get_cpu_state();
            loggingService.error(
                'WasmEngine',
                `WASM returned 0 cycles at PC=${cpuState.pc.toString(16)} (no breakpoint)`,
            );
        }

        // Note: I/O synchronization happens automatically via memory bridge
        // during instruction execution - no explicit sync needed

        // Update metrics
        const duration = Date.now() - startTime;
        this.updateMetrics(cycles, duration);

        return cycles;
    }

    performBulkSteps(cycles: number): void {
        if (!this.wasmSystem?.is_initialized()) {
            return;
        }

        // WasmSystem can run cycles efficiently without boundary crossings
        // Note: run_cycles will stop early if a breakpoint is hit (returns 0 from step)
        // Time the call with performance.now() (sub-ms) for the host-utilization metric.
        const startTime = performance.now();
        const executedCycles = this.wasmSystem.run_cycles(cycles);
        this.hostExecMs += performance.now() - startTime;

        // Check if a breakpoint was hit during bulk execution
        const breakpointAddr = this.wasmSystem.get_breakpoint_hit();
        if (breakpointAddr >= 0) {
            loggingService.info(
                'WasmEngine',
                `Breakpoint hit during bulk execution at $${breakpointAddr.toString(16).toUpperCase().padStart(4, '0')}`,
            );
        }

        // Note: I/O happens automatically via memory bridge - no sync needed

        // Update metrics for the whole batch. NOTE: updateMetrics() increments
        // the instruction counter by one and is only correct for single steps;
        // a bulk batch runs many instructions, so account for them here the same
        // way JSEngine does (estimate from cycles) to keep IPS comparable.
        if (executedCycles > 0) {
            const estimatedInstructions = Math.floor(executedCycles / 3);
            this.metrics.totalCycles += executedCycles;
            this.metrics.instructionsExecuted += estimatedInstructions;
            this.lastSecondInstructions += estimatedInstructions;
            this.updateIPSMetrics();
        }
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
        this.hostExecMs = 0;
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
            pendingNmi: 0,
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
        status |= state.C & 1;

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
            C: status & 1,
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
        if (
            registers.N !== undefined ||
            registers.V !== undefined ||
            registers.D !== undefined ||
            registers.I !== undefined ||
            registers.Z !== undefined ||
            registers.C !== undefined
        ) {
            // Get current status and immediately extract it to release WASM borrow
            let status: number;
            {
                const state = this.wasmSystem.get_cpu_state();
                status = state.status;
                // state goes out of scope here, releasing the borrow
            }

            // Now modify status with the new flag values
            if (registers.N !== undefined) {
                status = (status & 0x7f) | ((registers.N & 1) << 7);
            }
            if (registers.V !== undefined) {
                status = (status & 0xbf) | ((registers.V & 1) << 6);
            }
            if (registers.D !== undefined) {
                status = (status & 0xf7) | ((registers.D & 1) << 3);
            }
            if (registers.I !== undefined) {
                status = (status & 0xfb) | ((registers.I & 1) << 2);
            }
            if (registers.Z !== undefined) {
                status = (status & 0xfd) | ((registers.Z & 1) << 1);
            }
            if (registers.C !== undefined) {
                status = (status & 0xfe) | (registers.C & 1);
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
        // Sync to WASM for native breakpoint checking
        if (this.wasmSystem) {
            this.wasmSystem.set_breakpoint(address);
        }
    }

    clearBreakpoint(address: number): void {
        this.breakpoints.delete(address);
        // Sync to WASM
        if (this.wasmSystem) {
            this.wasmSystem.clear_breakpoint(address);
        }
    }

    clearAllBreakpoints(): void {
        this.breakpoints.clear();
        // Sync to WASM
        if (this.wasmSystem) {
            this.wasmSystem.clear_all_breakpoints();
        }
    }

    getBreakpoints(): number[] {
        return Array.from(this.breakpoints);
    }

    hasBreakpoint(address: number): boolean {
        return this.breakpoints.has(address);
    }

    /**
     * Check if a breakpoint was hit during the last step
     * Returns the address of the breakpoint, or -1 if none
     */
    getBreakpointHit(): number {
        if (!this.wasmSystem) {
            return -1;
        }
        return this.wasmSystem.get_breakpoint_hit();
    }

    /**
     * Clear the breakpoint hit flag after handling it
     */
    clearBreakpointHit(): void {
        if (this.wasmSystem) {
            this.wasmSystem.clear_breakpoint_hit();
        }
    }

    // ============ Performance & Metrics ============

    getMetrics(): EngineMetrics {
        if (this.wasmSystem) {
            // Get metrics from WasmSystem if available
            const wasmMetrics = this.wasmSystem.get_metrics();
            if (wasmMetrics) {
                this.metrics.totalCycles = wasmMetrics.cycles || this.metrics.totalCycles;
                this.metrics.instructionsExecuted = wasmMetrics.instructions || this.metrics.instructionsExecuted;
                // averageIPS is intentionally NOT taken from wasmMetrics: the Rust
                // get_metrics() reports (instructions/cycles)*1e6 (an idealized
                // instructions-per-1MHz figure), not wall-clock IPS. updateIPSMetrics()
                // below computes a real wall-clock rate from instructionsExecuted,
                // matching JSEngine so the two engines are comparable.
            }
        }

        // Force update IPS calculation when metrics are requested (consistent with JSEngine)
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
     * 6502 time. Mirrors JSEngine so the two engines are directly comparable;
     * this is where WASM's real advantage shows (far fewer host ms per second).
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

    getMemoryUsage(): number {
        if (!this.wasmSystem) {
            return 0;
        }

        // WasmSystem memory usage:
        // RAM size + ROM size + overhead
        const ramSize = this.wasmSystem.get_ram_size();
        return ramSize + 256 + 4096 + this.breakpoints.size * 8;
    }

    // ============ Profiling ============

    /**
     * Enable/disable profiling on the WASM CPU. Profiling already exists in the
     * Rust core (opcode counters); this wires it through so the WASM engine is
     * at parity with JSEngine.setProfiling().
     */
    setProfiling(enabled: boolean): void {
        this.wasmSystem?.enable_profiling(enabled);
    }

    /**
     * Profiling data in the same shape as JSEngine.getProfilingData(). The Rust
     * core tracks per-opcode counts but not per-opcode cycles, so cycles is 0.
     */
    getProfilingData(): Map<number, { count: number; cycles: number }> {
        const map = new Map<number, { count: number; cycles: number }>();
        if (!this.wasmSystem || !this.wasmSystem.is_profiling_enabled()) {
            return map;
        }
        for (const { opcode, count } of this.readTopOpcodes(256)) {
            map.set(opcode, { count, cycles: 0 });
        }
        return map;
    }

    /**
     * Profiling fields for toDebug(), in the same shape CPU6502.toDebug() emits
     * so the inspector renders WASM profiling identically to the JS engine.
     */
    private profilingDebugFields(): { [key: string]: string | number | boolean | object } {
        const enabled = this.wasmSystem?.is_profiling_enabled() ?? false;
        if (!this.wasmSystem || !enabled) {
            return { PERF_ENABLED: 'NO' };
        }

        const top = this.readTopOpcodes(256);
        const instructionCount = Number(this.wasmSystem.get_profiled_instruction_count());
        const totalInstructions = top.length;
        const topOpcodes = top.slice(0, 5).map(({ opcode, count }) => ({
            opcode: Formatters.hexByte(opcode),
            count,
            cycles: 0, // Rust core tracks per-opcode counts, not cycles
            avgCycles: 0,
        }));

        return {
            PERF_ENABLED: 'YES',
            PERF_INSTRUCTIONS: Formatters.decimal(instructionCount),
            PERF_UNIQUE_OPCODES: totalInstructions.toString(),
            PERF_TOP_OPCODES: topOpcodes.map((o) => `${o.opcode}:${o.count}`).join(', '),
            _PERF_DATA: {
                stats: { instructionCount, totalInstructions, profilingEnabled: true },
                topOpcodes,
            },
        };
    }

    /**
     * Decode WasmSystem.get_top_opcodes() — a packed [opcode, count(u64 LE)]×N
     * byte array (9 bytes per entry) — into {opcode, count} pairs.
     */
    private readTopOpcodes(limit: number): Array<{ opcode: number; count: number }> {
        if (!this.wasmSystem) return [];
        const packed = this.wasmSystem.get_top_opcodes(limit);
        const view = new DataView(packed.buffer, packed.byteOffset, packed.byteLength);
        const out: Array<{ opcode: number; count: number }> = [];
        for (let off = 0; off + 9 <= packed.byteLength; off += 9) {
            const opcode = view.getUint8(off);
            const count = Number(view.getBigUint64(off + 1, true));
            if (count > 0) out.push({ opcode, count });
        }
        return out;
    }

    // ============ Private Methods ============

    private updateMetrics(cycles: number, duration: number): void {
        this.metrics.totalCycles += cycles;
        this.metrics.instructionsExecuted++;
        this.lastSecondInstructions++;
        this.metrics.lastStepDuration = duration * 1_000_000; // Convert to nanoseconds

        // Update IPS calculation (same algorithm as JSEngine for consistency)
        this.updateIPSMetrics();

        // Update memory usage periodically
        if (this.metrics.instructionsExecuted % 1000 === 0) {
            this.metrics.memoryUsage = this.getMemoryUsage();
        }
    }

    /**
     * Update IPS metrics with consistent algorithm (matches JSEngine)
     * Uses 100ms minimum update interval and 1-second rolling window for lastIPS
     */
    private updateIPSMetrics(): void {
        const now = Date.now();
        const timeSinceLastUpdate = now - this.lastMetricsUpdate;

        // Update IPS every 100ms minimum OR when explicitly requested (timeSinceLastUpdate === 0)
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
        if (!this.wasmSystem) {
            return {
                status: 'Not initialized',
                breakpoints: Array.from(this.breakpoints),
                metrics: this.metrics,
            };
        }

        return {
            status: 'Ready',
            engineVersion: this.engineVersion,
            registers: this.getRegisters(),
            breakpoints: Array.from(this.breakpoints),
            metrics: this.metrics,
            wasmMetrics: this.wasmSystem.get_metrics(),
            memoryMap: this.wasmSystem.get_memory_map(),
        };
    }

    /**
     * Flat debug snapshot in the shape the debugger UI consumes, built from
     * the live WASM CPU state. Mirrors CPU6502.toDebug()/JSEngine.toDebug()
     * so the debugger reflects the WASM engine when it is active instead of
     * a frozen JS CPU.
     */
    toDebug(): { [key: string]: string | number | boolean | object } {
        if (!this.wasmSystem) {
            return {};
        }

        const state = this.wasmSystem.get_cpu_state();
        const pc = state.pc;
        const a = state.a;
        const x = state.x;
        const y = state.y;
        const s = state.s;
        const status = state.status;
        const cycles = state.cycles ?? this.metrics.totalCycles;
        const irq = state.irq;
        const nmi = state.nmi;

        // The WASM core does not retain a last-executed opcode; at the
        // throttled/paused rate the byte under PC is the most useful
        // "current opcode" to show in the debugger.
        const opcode = this.wasmSystem.read_memory(pc);

        return {
            ...this.profilingDebugFields(),
            REG_PC: Formatters.hexWord(pc),
            REG_A: Formatters.hexByte(a),
            REG_X: Formatters.hexByte(x),
            REG_Y: Formatters.hexByte(y),
            REG_S: Formatters.hexByte(s),
            FLAG_N: Formatters.flag((status >> 7) & 1),
            FLAG_V: Formatters.flag((status >> 6) & 1),
            FLAG_D: Formatters.flag((status >> 3) & 1),
            FLAG_I: Formatters.flag((status >> 2) & 1),
            FLAG_Z: Formatters.flag((status >> 1) & 1),
            FLAG_C: Formatters.flag(status & 1),
            HW_ADDR: Formatters.hexWord(this.wasmSystem.get_last_addr()),
            HW_DATA: Formatters.hexByte(this.wasmSystem.get_last_data()),
            HW_OPCODE: Formatters.hexByte(opcode),
            HW_CYCLES: Formatters.decimal(cycles),
            IRQ_LINE: irq ? 'ACTIVE' : 'INACTIVE',
            NMI_LINE: nmi ? 'ACTIVE' : 'INACTIVE',
            // Pending semantics match the JS engine exactly (CPU6502.core):
            //   pendingIrq = irq line asserted AND the I (interrupt-disable) flag clear
            //   pendingNmi = the NMI latch (get_cpu_state already reports the latch as `nmi`)
            // Deriving IRQ pending from the line alone would just duplicate IRQ_LINE.
            IRQ_PENDING: irq && (status & 0x04) === 0 ? 'YES' : 'NO',
            NMI_PENDING: nmi ? 'YES' : 'NO',
            // Raw numeric values (parity with CPU6502.toDebug)
            PC: pc,
            A: a,
            X: x,
            Y: y,
            S: s,
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
