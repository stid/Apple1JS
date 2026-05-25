/**
 * CPU Engine Interface
 *
 * Common interface for both JavaScript and WASM CPU implementations.
 * This enables runtime switching between engines while maintaining
 * full compatibility and state preservation.
 */

import type { CPU6502State } from '../cpu6502/types';

/**
 * Supported CPU engine types
 */
export type EngineType = 'JS' | 'WASM';

/**
 * CPU register state
 */
export interface CPURegisters {
    PC: number; // Program Counter (16-bit)
    A: number; // Accumulator (8-bit)
    X: number; // X Index Register (8-bit)
    Y: number; // Y Index Register (8-bit)
    S: number; // Stack Pointer (8-bit)

    // Status flags
    N: number; // Negative
    V: number; // Overflow
    B: number; // Break
    D: number; // Decimal
    I: number; // Interrupt Disable
    Z: number; // Zero
    C: number; // Carry
}

/**
 * Engine performance metrics
 */
export interface EngineMetrics {
    /** Total CPU cycles executed */
    totalCycles: number;

    /** Total instructions executed */
    instructionsExecuted: number;

    /** Average instructions per second */
    averageIPS: number;

    /** Last second's instructions per second (instantaneous) */
    lastIPS?: number;

    /** Memory usage in bytes */
    memoryUsage: number;

    /** Last instruction execution duration in nanoseconds */
    lastStepDuration: number;

    /** Engine initialization time in milliseconds */
    initializationTime?: number;

    /** Current engine efficiency (0-100) */
    efficiency?: number;

    /**
     * Host wall-clock milliseconds spent executing per emulated second
     * of 6502 time (at the ~1MHz target). Lower is better: it exposes the
     * real cost difference between engines that the clock-throttled IPS
     * hides. e.g. ~300ms/s for JS vs ~25ms/s for WASM. 0 until enough work
     * has run to measure.
     */
    hostMillisPerSecond?: number;
}

/**
 * Common interface for CPU engines
 */
export interface ICPUEngine {
    // ============ Engine Metadata ============

    /** Type of engine (JS or WASM) */
    readonly engineType: EngineType;

    /** Engine version string */
    readonly engineVersion: string;

    /** Whether the engine is ready for use */
    readonly isReady: boolean;

    /** Engine capabilities */
    readonly capabilities?: {
        supportsBreakpoints: boolean;
        supportsProfiling: boolean;
        supportsStepBack?: boolean;
        maxSpeed?: number; // Maximum IPS
    };

    // ============ Initialization ============

    /**
     * Initialize the engine (async for WASM loading)
     * @returns Promise that resolves when engine is ready
     */
    initialize?(): Promise<void>;

    /**
     * Ensure the engine is ready before use
     * @throws Error if initialization fails
     */
    ensureReady(): Promise<void>;

    // ============ Core Operations ============

    /**
     * Execute a single CPU instruction
     * @returns Number of cycles consumed
     */
    performSingleStep(): number;

    /**
     * Execute multiple instructions
     * @param cycles Number of cycles to execute
     */
    performBulkSteps(cycles: number): void;

    /**
     * Reset the CPU to initial state
     */
    reset(): void;

    /**
     * Halt execution
     */
    halt(): void;

    // ============ State Management ============

    /**
     * Save current CPU state
     * @returns Serializable state object
     */
    saveState(): CPU6502State;

    /**
     * Load CPU state
     * @param state Previously saved state
     */
    loadState(state: CPU6502State): void;

    /**
     * Get current register values
     * @returns Current CPU registers
     */
    getRegisters(): CPURegisters;

    /**
     * Set register values
     * @param registers Register values to set
     */
    setRegisters(registers: Partial<CPURegisters>): void;

    // ============ Memory Operations ============

    /**
     * Read a byte from memory
     * @param address Memory address (0-65535)
     * @returns Byte value (0-255)
     */
    read(address: number): number;

    /**
     * Write a byte to memory
     * @param address Memory address (0-65535)
     * @param value Byte value (0-255)
     */
    write(address: number, value: number): void;

    /**
     * Read a range of memory
     * @param start Starting address
     * @param length Number of bytes to read
     * @returns Array of byte values
     */
    readRange(start: number, length: number): Uint8Array;

    /**
     * Write a range of memory
     * @param start Starting address
     * @param data Bytes to write
     */
    writeRange(start: number, data: Uint8Array): void;

    /**
     * Load a program into memory
     * @param program Program bytes
     * @param address Starting address (default: 0x0000)
     */
    loadProgram(program: Uint8Array, address?: number): void;

    // ============ Debugging Support ============

    /**
     * Set a breakpoint at an address
     * @param address Breakpoint address
     */
    setBreakpoint(address: number): void;

    /**
     * Clear a breakpoint
     * @param address Breakpoint address to clear
     */
    clearBreakpoint(address: number): void;

    /**
     * Clear all breakpoints
     */
    clearAllBreakpoints(): void;

    /**
     * Get all active breakpoints
     * @returns Array of breakpoint addresses
     */
    getBreakpoints(): number[];

    /**
     * Check if address has a breakpoint
     * @param address Address to check
     * @returns True if breakpoint exists
     */
    hasBreakpoint(address: number): boolean;

    /**
     * Subscribe to breakpoint-hit events. The engine invokes the listener with
     * the PC of the breakpoint *before* that instruction executes, having halted
     * execution. This is the single, engine-agnostic enforcement signal the
     * worker wires to its pause/notify path — it works identically for the JS
     * engine (CPU6502 execution hook) and the WASM engine (Rust-side check).
     * @returns Unsubscribe function
     */
    onBreakpointHit?(callback: (address: number) => void): () => void;

    /**
     * Get disassembly at current PC
     * @param instructionCount Number of instructions to disassemble
     * @returns Disassembled instructions
     */
    disassemble?(instructionCount: number): string[];

    // ============ Performance & Metrics ============

    /**
     * Get current performance metrics
     * @returns Engine performance data
     */
    getMetrics(): EngineMetrics;

    /**
     * Reset performance metrics
     */
    resetMetrics(): void;

    /**
     * Enable/disable profiling
     * @param enabled Whether to enable profiling
     */
    setProfiling?(enabled: boolean): void;

    /**
     * Get profiling data
     * @returns Profiling information if available
     */
    getProfilingData?(): Map<number, { count: number; cycles: number }>;

    // ============ Engine-Specific Features ============

    /**
     * Get engine-specific debug information
     * @returns Debug data specific to the engine
     */
    getDebugInfo?(): unknown;

    /**
     * Get a flat key/value debug snapshot of the live CPU state in the
     * shape the debugger UI consumes (REG_*, FLAG_*, HW_*, IRQ_LINE, ...).
     * Implemented by every engine so the worker can read the *active*
     * engine's state polymorphically rather than a hardwired JS CPU.
     */
    toDebug?(): { [key: string]: string | number | boolean | object };

    /**
     * Perform engine-specific cleanup
     */
    cleanup?(): void;

    /**
     * Get estimated memory usage
     * @returns Memory usage in bytes
     */
    getMemoryUsage(): number;
}

/**
 * Factory function type for creating engines
 */
export type EngineFactory = () => ICPUEngine | Promise<ICPUEngine>;

/**
 * Engine switch event
 */
export interface EngineSwitchEvent {
    from: EngineType;
    to: EngineType;
    timestamp: number;
    reason?: 'user' | 'performance' | 'error' | 'fallback';
    metrics?: {
        fromMetrics: EngineMetrics;
        toMetrics?: EngineMetrics;
    };
}

/**
 * Engine comparison result
 */
export interface EngineComparison {
    js: EngineMetrics;
    wasm: EngineMetrics;
    speedup: number;
    memoryRatio: number;
    recommendation: 'JS' | 'WASM';
    reason: string;
}
