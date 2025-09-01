/**
 * Enhanced WASM Engine with Internal Memory System
 * 
 * This engine uses WASM linear memory for RAM/ROM storage,
 * eliminating JS↔WASM boundary crossings for most memory operations.
 */

import type { ICPUEngine, EngineType, CPURegisters, EngineMetrics } from '../cpu-interface/ICPUEngine';
import type { CPU6502State } from '../cpu6502/types';
import type Bus from '../Bus';
import { loggingService } from '../../services/LoggingService';

// Import the generated WASM module types
import type { 
    CPU6502Enhanced as WasmCPU,
    RAM as WasmRAM,
    ROM as WasmROM,
    Bus as WasmBus
} from '../../wasm/apple1_cpu_wasm';

/**
 * Enhanced WASM engine with internal memory management
 */
export class WasmEnhancedEngine implements ICPUEngine {
    private wasmModule: typeof import('../../wasm/apple1_cpu_wasm') | null = null;
    private cpu: WasmCPU | null = null;
    private wasmBus: WasmBus | null = null;
    private wasmRam: WasmRAM | null = null;
    private wasmRom: WasmROM | null = null;
    private jsBus: Bus;
    private initialized = false;
    private startTime = 0;
    private totalCycles = 0;
    
    constructor(bus: Bus) {
        this.jsBus = bus;
    }
    
    // ============ ICPUEngine Implementation ============
    
    get engineType(): EngineType {
        return 'WASM' as EngineType;
    }
    
    get engineVersion(): string {
        return 'Enhanced-1.0';
    }
    
    get isReady(): boolean {
        return this.initialized && this.cpu !== null;
    }
    
    get capabilities() {
        return {
            supportsBreakpoints: true,
            supportsStepOver: false,
            supportsStepOut: false,
            supportsProfiler: true,
            supportsEngineSwitch: true,
            supportsInternalMemory: true, // New capability!
            memoryType: 'WASM Linear Memory'
        };
    }
    
    async initialize(): Promise<void> {
        if (this.initialized) return;
        
        try {
            // Dynamically import the WASM module
            this.wasmModule = await import('../../wasm/apple1_cpu_wasm');
            
            // Create the enhanced CPU with internal memory
            this.cpu = new this.wasmModule.CPU6502Enhanced();
            
            // Create WASM memory components
            this.wasmRam = new this.wasmModule.RAM(0x10000); // Full 64KB
            this.wasmRom = new this.wasmModule.ROM(0x100);   // 256 bytes for WOZ Monitor
            this.wasmBus = new this.wasmModule.Bus();
            
            // Connect memory components to the bus
            this.wasmBus.set_ram(this.wasmRam);
            this.wasmBus.set_rom(this.wasmRom);
            
            // Connect the bus to the CPU
            this.cpu.set_bus(this.wasmBus);
            
            // Load ROM data from JS Bus if available
            this.syncRomFromJS();
            
            // Initialize CPU
            this.cpu.reset();
            
            this.initialized = true;
            this.startTime = performance.now();
            
            loggingService.info('WasmEnhancedEngine', 
                `Initialized with internal WASM memory (RAM: 64KB, ROM: 256B)`);
        } catch (error) {
            loggingService.error('WasmEnhancedEngine', 
                `Failed to initialize: ${error}`);
            throw error;
        }
    }
    
    async ensureReady(): Promise<void> {
        if (!this.initialized) {
            await this.initialize();
        }
    }
    
    cleanup(): void {
        // WASM resources are automatically cleaned up
        this.cpu = null;
        this.wasmBus = null;
        this.wasmRam = null;
        this.wasmRom = null;
        this.wasmModule = null;
        this.initialized = false;
    }
    
    reset(): void {
        if (this.cpu) {
            this.cpu.reset();
            this.totalCycles = 0;
            this.startTime = performance.now();
        }
    }
    
    performSingleStep(): number {
        if (!this.cpu) return 0;
        
        const cycles = this.cpu.step();
        this.totalCycles += cycles;
        return cycles;
    }
    
    getRegisters(): CPURegisters {
        if (!this.cpu) {
            return {
                PC: 0, A: 0, X: 0, Y: 0, S: 0,
                N: 0, V: 0, B: 0, D: 0, I: 0, Z: 0, C: 0
            };
        }
        
        const state = this.cpu.get_state();
        return {
            PC: state.pc,
            A: state.a,
            X: state.x,
            Y: state.y,
            S: state.s,
            N: (state.status & 0x80) ? 1 : 0,
            V: (state.status & 0x40) ? 1 : 0,
            B: (state.status & 0x10) ? 1 : 0,
            D: (state.status & 0x08) ? 1 : 0,
            I: (state.status & 0x04) ? 1 : 0,
            Z: (state.status & 0x02) ? 1 : 0,
            C: (state.status & 0x01) ? 1 : 0
        };
    }
    
    setRegisters(registers: Partial<CPURegisters>): void {
        if (!this.cpu) return;
        
        const currentState = this.cpu.get_state();
        
        // Build new state from current + updates
        const newState = {
            ...currentState,
            pc: registers.PC ?? currentState.pc,
            a: registers.A ?? currentState.a,
            x: registers.X ?? currentState.x,
            y: registers.Y ?? currentState.y,
            s: registers.S ?? currentState.s,
            status: this.buildStatusFromFlags(registers, currentState.status)
        };
        
        this.cpu.set_state(newState);
    }
    
    getState(): CPU6502State {
        if (!this.cpu) {
            throw new Error('Enhanced WASM engine not initialized');
        }
        
        const state = this.cpu.get_state();
        return {
            version: '3.0',
            pc: state.pc,
            a: state.a,
            x: state.x,
            y: state.y,
            s: state.s,
            status: state.status,
            cycles: state.cycles,
            irq: state.irq,
            nmi: state.nmi,
            breakpoints: [],
            clockSpeed: 1000000,
            clockMode: 'STEP',
            trace: [],
            metadata: {
                engine: 'WASM-Enhanced',
                memoryType: 'Internal'
            }
        };
    }
    
    setState(state: CPU6502State): void {
        if (!this.cpu) return;
        
        this.cpu.set_state({
            pc: state.pc,
            a: state.a,
            x: state.x,
            y: state.y,
            s: state.s,
            status: state.status,
            cycles: state.cycles || 0,
            irq: state.irq || false,
            nmi: state.nmi || false
        });
    }
    
    getMetrics(): EngineMetrics {
        if (!this.cpu) {
            return {
                totalCycles: 0,
                instructionsExecuted: 0,
                averageIPS: 0,
                lastIPS: 0,
                memoryUsage: 0,
                lastStepDuration: 0
            };
        }
        
        const metrics = this.cpu.get_metrics();
        const elapsedSeconds = (performance.now() - this.startTime) / 1000;
        
        return {
            totalCycles: metrics.cycles,
            totalInstructions: metrics.instructions,
            averageIPS: metrics.average_ips,
            currentIPS: elapsedSeconds > 0 ? metrics.instructions / elapsedSeconds : 0,
            lastStepDuration: metrics.last_step_duration
        };
    }
    
    getMemoryUsage(): number {
        // Estimate WASM memory usage
        // 64KB RAM + 256B ROM + overhead
        return 65536 + 256 + 4096; // ~68KB
    }
    
    triggerIRQ(): void {
        this.cpu?.trigger_irq();
    }
    
    triggerNMI(): void {
        this.cpu?.trigger_nmi();
    }
    
    // ============ Enhanced Features ============
    
    /**
     * Check if using internal WASM memory
     */
    hasInternalMemory(): boolean {
        return this.cpu?.has_internal_memory() ?? false;
    }
    
    /**
     * Sync ROM data from JavaScript Bus
     */
    private syncRomFromJS(): void {
        if (!this.wasmRom) return;
        
        // Read ROM data from JS Bus (0xFF00-0xFFFF)
        const romData = new Uint8Array(258); // 2 byte header + 256 bytes
        romData[0] = 0x00; // Low address
        romData[1] = 0xFF; // High address
        
        for (let i = 0; i < 256; i++) {
            romData[i + 2] = this.jsBus.read(0xFF00 + i);
        }
        
        // Flash to WASM ROM
        this.wasmRom.flash(romData);
    }
    
    /**
     * Sync RAM data from JavaScript Bus (for migration)
     */
    syncRamFromJS(): void {
        if (!this.wasmRam) return;
        
        // Copy RAM regions from JS Bus
        // 0x0000-0x0FFF (4KB main RAM)
        for (let addr = 0x0000; addr <= 0x0FFF; addr++) {
            this.wasmRam.write(addr, this.jsBus.read(addr));
        }
        
        // 0xE000-0xEFFF (4KB extended RAM for BASIC)
        for (let addr = 0xE000; addr <= 0xEFFF; addr++) {
            this.wasmRam.write(addr, this.jsBus.read(addr));
        }
        
        loggingService.info('WasmEnhancedEngine', 'RAM synced from JS Bus');
    }
    
    /**
     * Get performance comparison vs standard WASM engine
     */
    getPerformanceRatio(): number {
        // Estimate based on boundary crossing elimination
        // Each instruction typically does 2-6 memory accesses
        // Each boundary crossing adds ~10-20ns overhead
        // Result: 5-10x improvement expected
        return this.hasInternalMemory() ? 5.0 : 1.0;
    }
    
    // ============ Helper Methods ============
    
    private buildStatusFromFlags(
        flags: Partial<CPURegisters>, 
        currentStatus: number
    ): number {
        let status = currentStatus;
        
        if (flags.N !== undefined) {
            status = flags.N ? (status | 0x80) : (status & ~0x80);
        }
        if (flags.V !== undefined) {
            status = flags.V ? (status | 0x40) : (status & ~0x40);
        }
        if (flags.B !== undefined) {
            status = flags.B ? (status | 0x10) : (status & ~0x10);
        }
        if (flags.D !== undefined) {
            status = flags.D ? (status | 0x08) : (status & ~0x08);
        }
        if (flags.I !== undefined) {
            status = flags.I ? (status | 0x04) : (status & ~0x04);
        }
        if (flags.Z !== undefined) {
            status = flags.Z ? (status | 0x02) : (status & ~0x02);
        }
        if (flags.C !== undefined) {
            status = flags.C ? (status | 0x01) : (status & ~0x01);
        }
        
        // Always set bit 5 (unused, always 1)
        status |= 0x20;
        
        return status;
    }
}