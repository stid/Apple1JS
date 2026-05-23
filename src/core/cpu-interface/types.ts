/**
 * Shared Types for CPU Engine System
 * 
 * Common types used across both JS and WASM CPU implementations.
 */

/**
 * CPU execution mode
 */
export enum ExecutionMode {
    /** Normal execution */
    RUNNING = 'running',
    /** Paused execution */
    PAUSED = 'paused',
    /** Halted (waiting for interrupt) */
    HALTED = 'halted',
    /** Stopped at breakpoint */
    BREAKPOINT = 'breakpoint',
    /** Error state */
    ERROR = 'error'
}

/**
 * Memory access type for debugging
 */
export enum MemoryAccessType {
    READ = 'read',
    WRITE = 'write',
    EXECUTE = 'execute'
}

/**
 * Memory access event for debugging
 */
export interface MemoryAccessEvent {
    type: MemoryAccessType;
    address: number;
    value?: number;
    cycle: number;
}

/**
 * Instruction execution event
 */
export interface InstructionEvent {
    /** Address of instruction */
    address: number;
    /** Opcode byte */
    opcode: number;
    /** Mnemonic (e.g., "LDA") */
    mnemonic?: string;
    /** Operand bytes */
    operands?: number[];
    /** Cycles consumed */
    cycles: number;
    /** Timestamp */
    timestamp: number;
}

/**
 * Engine configuration options
 */
export interface EngineConfig {
    /** Enable debug mode */
    debug?: boolean;
    
    /** Enable profiling */
    profiling?: boolean;
    
    /** Enable cycle-accurate timing */
    cycleAccurate?: boolean;
    
    /** Maximum instructions per second (throttling) */
    maxIPS?: number;
    
    /** Initial memory contents */
    initialMemory?: Uint8Array;
    
    /** ROM image to load */
    rom?: {
        data: Uint8Array;
        address: number;
    };
    
    /** Enable instruction tracing */
    traceExecution?: boolean;
    
    /** Auto-switch to WASM if available */
    preferWASM?: boolean;
}

/**
 * Engine initialization options
 */
export interface InitOptions {
    /** URL to WASM module (for WASM engine) */
    wasmUrl?: string;
    
    /** Shared memory buffer (if using SharedArrayBuffer) */
    sharedMemory?: SharedArrayBuffer;
    
    /** Worker context (if running in worker) */
    workerContext?: boolean;
    
    /** Enable verbose logging */
    verbose?: boolean;
}

/**
 * Breakpoint information
 */
export interface Breakpoint {
    /** Memory address */
    address: number;
    
    /** Whether breakpoint is enabled */
    enabled: boolean;
    
    /** Hit count */
    hitCount?: number;
    
    /** Condition (future feature) */
    condition?: string;
    
    /** Temporary (one-shot) breakpoint */
    temporary?: boolean;
}

/**
 * Stack frame for debugging
 */
export interface StackFrame {
    /** Return address */
    address: number;
    
    /** Stack pointer at call */
    stackPointer: number;
    
    /** Subroutine name if known */
    name?: string;
}

/**
 * Debug state information
 */
export interface DebugState {
    /** Current execution mode */
    mode: ExecutionMode;
    
    /** Current instruction address */
    pc: number;
    
    /** Active breakpoints */
    breakpoints: Breakpoint[];
    
    /** Call stack */
    callStack?: StackFrame[];
    
    /** Recent memory accesses */
    memoryAccesses?: MemoryAccessEvent[];
    
    /** Recent instructions */
    instructionHistory?: InstructionEvent[];
}

/**
 * Performance sample
 */
export interface PerformanceSample {
    /** Sample timestamp */
    timestamp: number;
    
    /** Instructions per second */
    ips: number;
    
    /** CPU usage percentage */
    cpuUsage: number;
    
    /** Memory usage in bytes */
    memoryUsage: number;
    
    /** Frame time in milliseconds */
    frameTime?: number;
}

/**
 * Engine benchmark result
 */
export interface BenchmarkResult {
    /** Engine type */
    engine: 'JS' | 'WASM';
    
    /** Test name */
    name: string;
    
    /** Number of iterations */
    iterations: number;
    
    /** Total time in milliseconds */
    totalTime: number;
    
    /** Average time per iteration */
    averageTime: number;
    
    /** Operations per second */
    opsPerSecond: number;
    
    /** Standard deviation */
    stdDev?: number;
}

/**
 * Engine capability flags
 */
export interface EngineCapabilities {
    /** Supports breakpoints */
    breakpoints: boolean;
    
    /** Supports profiling */
    profiling: boolean;
    
    /** Supports step-back debugging */
    stepBack: boolean;
    
    /** Supports memory watchpoints */
    watchpoints: boolean;
    
    /** Supports instruction tracing */
    tracing: boolean;
    
    /** Maximum execution speed (IPS) */
    maxSpeed: number;
    
    /** Supports shared memory */
    sharedMemory: boolean;
    
    /** Supports state serialization */
    stateSerialization: boolean;
}

/**
 * Error types for engine operations
 */
export enum EngineErrorType {
    INITIALIZATION_FAILED = 'initialization_failed',
    WASM_LOAD_FAILED = 'wasm_load_failed',
    STATE_TRANSFER_FAILED = 'state_transfer_failed',
    MEMORY_ACCESS_VIOLATION = 'memory_access_violation',
    INVALID_INSTRUCTION = 'invalid_instruction',
    BREAKPOINT_HIT = 'breakpoint_hit',
    ENGINE_NOT_READY = 'engine_not_ready'
}

/**
 * Engine error class
 */
export class EngineError extends Error {
    constructor(
        public type: EngineErrorType,
        message: string,
        public engine?: 'JS' | 'WASM',
        public details?: unknown
    ) {
        super(message);
        this.name = 'EngineError';
    }
}

/**
 * Engine event types
 */
export enum EngineEventType {
    INITIALIZED = 'initialized',
    STARTED = 'started',
    STOPPED = 'stopped',
    BREAKPOINT_HIT = 'breakpoint_hit',
    STATE_CHANGED = 'state_changed',
    ERROR = 'error',
    METRICS_UPDATED = 'metrics_updated'
}

/**
 * Engine event
 */
export interface EngineEvent {
    type: EngineEventType;
    engine: 'JS' | 'WASM';
    timestamp: number;
    data?: unknown;
}