import type { EmulatorState } from './emulator-state';
import type { VideoData } from './video';
import type { DebugData, MemoryMapData, LogMessageData } from './worker-messages';

/**
 * Worker API Interface for Comlink migration
 * 
 * This interface defines all the methods that will be exposed by the worker
 * through Comlink. It replaces the message-based communication pattern.
 */
export interface IWorkerAPI {
    // ========== Emulation Control ==========
    
    /**
     * Pause the emulation
     */
    pauseEmulation(): void;
    
    /**
     * Resume the emulation
     */
    resumeEmulation(): void;
    
    /**
     * Execute a single CPU instruction
     * @returns Debug data after the step
     */
    step(): DebugData;
    
    /**
     * Save the current emulator state
     * @returns The complete emulator state
     */
    saveState(): EmulatorState;
    
    /**
     * Load a saved emulator state
     * @param state The emulator state to load
     */
    loadState(state: EmulatorState): void;
    
    /**
     * Get current emulation status
     * @returns 'running' or 'paused'
     */
    getEmulationStatus(): 'running' | 'paused';
    
    // ========== Breakpoint Management ==========
    
    /**
     * Set a breakpoint at the specified address
     * @param address Memory address for the breakpoint
     * @returns Current list of all breakpoints
     */
    setBreakpoint(address: number): number[];
    
    /**
     * Clear a breakpoint at the specified address
     * @param address Memory address to clear
     * @returns Current list of all breakpoints
     */
    clearBreakpoint(address: number): number[];
    
    /**
     * Clear all breakpoints
     */
    clearAllBreakpoints(): void;
    
    /**
     * Get all current breakpoints
     * @returns Array of breakpoint addresses
     */
    getBreakpoints(): number[];
    
    /**
     * Run execution until reaching the specified address
     * @param address Target address to run to
     */
    runToAddress(address: number): void;
    
    // ========== Memory Operations ==========
    
    /**
     * Read a range of memory
     * @param start Starting address
     * @param length Number of bytes to read
     * @returns Array of memory values
     */
    readMemoryRange(start: number, length: number): number[];
    
    /**
     * Write a value to memory
     * @param address Memory address
     * @param value Value to write (0-255)
     */
    writeMemory(address: number, value: number): void;
    
    /**
     * Get the memory map information
     * @returns Memory map with regions
     */
    getMemoryMap(): MemoryMapData;
    
    // ========== Configuration ==========
    
    /**
     * Set CRT backspace support flag
     * @param enabled Whether to enable BS support
     */
    setCrtBsSupport(enabled: boolean): void;
    
    /**
     * Enable/disable CPU profiling
     * @param enabled Whether to enable profiling
     */
    setCpuProfiling(enabled: boolean): void;
    
    /**
     * Enable/disable cycle-accurate timing mode
     * @param enabled Whether to enable cycle-accurate mode
     */
    setCycleAccurateMode(enabled: boolean): void;
    
    /**
     * Set debugger active state (affects update frequency)
     * @param active Whether the debugger is visible
     */
    setDebuggerActive(active: boolean): void;
    
    // ========== Input ==========
    
    /**
     * Send a key press to the emulator
     * @param key The key character or code
     */
    keyDown(key: string): void;
    
    // ========== Debug Information ==========
    
    /**
     * Get current debug information for all components
     * @returns Debug data for CPU, PIA, Bus, and Clock
     */
    getDebugInfo(): DebugData;
    
    // ========== Event Subscriptions ==========
    // These will use Comlink.proxy for callbacks
    
    /**
     * Subscribe to video updates
     * @param callback Function to call with video data
     * @returns Unsubscribe function
     */
    onVideoUpdate(callback: (data: VideoData) => void): () => void;
    
    /**
     * Subscribe to breakpoint hit events
     * @param callback Function to call when breakpoint is hit
     * @returns Unsubscribe function
     */
    onBreakpointHit(callback: (address: number) => void): () => void;
    
    /**
     * Subscribe to emulation status changes
     * @param callback Function to call when status changes
     * @returns Unsubscribe function
     */
    onEmulationStatus(callback: (status: 'running' | 'paused') => void): () => void;
    
    /**
     * Subscribe to log messages from the worker
     * @param callback Function to call with log data
     * @returns Unsubscribe function
     */
    onLogMessage(callback: (data: LogMessageData) => void): () => void;
    
    /**
     * Subscribe to clock data updates
     * @param callback Function to call with clock data
     * @returns Unsubscribe function
     */
    onClockData(callback: (data: { cycles: number; frequency: number; totalCycles: number }) => void): () => void;
    
    /**
     * Subscribe to run-to-cursor target updates
     * @param callback Function to call with target address or null
     * @returns Unsubscribe function
     */
    onRunToCursorTarget(callback: (target: number | null) => void): () => void;
}

/**
 * Type for the worker state that will encapsulate all module-level variables
 */
export interface IWorkerState {
    video: unknown; // Will be WebCRTVideo
    keyboard: unknown; // Will be WebWorkerKeyboard
    apple1: unknown; // Will be Apple1
    breakpoints: Set<number>;
    runToCursorTarget: number | null;
    isPaused: boolean;
    isStepping: boolean;
    debuggerActive: boolean;
    debugUpdateInterval: number | null;
}