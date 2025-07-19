import type { EmulatorState } from './emulator-state';
import type { VideoData } from './video';

// Enum for worker message types
export enum WORKER_MESSAGES {
    UPDATE_VIDEO_BUFFER, // Update the video buffer
    KEY_DOWN, // Key press event
    DEBUG_INFO, // Debugging information
    CLOCK_DATA, // Clock data update
    SET_CRT_BS_SUPPORT_FLAG, // Set CRT support flag
    SAVE_STATE, // Request to save emulator state
    LOAD_STATE, // Request to load emulator state
    STATE_DATA, // Response with state data
    LOG_MESSAGE, // Log message from worker to main thread
    PAUSE_EMULATION, // Pause the emulation
    RESUME_EMULATION, // Resume the emulation
    EMULATION_STATUS, // Current emulation status (paused/running)
    GET_MEMORY_RANGE, // Request memory range for disassembly
    MEMORY_RANGE_DATA, // Response with memory range data
    DEBUG_DATA, // Debug data for components
    SET_CPU_PROFILING, // Enable/disable CPU performance profiling
    SET_CYCLE_ACCURATE_TIMING, // Enable/disable cycle-accurate timing mode
    STEP, // Execute a single CPU instruction
    SET_BREAKPOINT, // Set a breakpoint at an address
    CLEAR_BREAKPOINT, // Clear a breakpoint at an address
    CLEAR_ALL_BREAKPOINTS, // Clear all breakpoints
    GET_BREAKPOINTS, // Request current breakpoints
    BREAKPOINTS_DATA, // Response with current breakpoints
    BREAKPOINT_HIT, // Notification when breakpoint is hit
    SET_DEBUGGER_ACTIVE, // Set debugger visibility state
    GET_EMULATION_STATUS, // Request current emulation status
    RUN_TO_ADDRESS, // Run execution until reaching a specific address
    RUN_TO_CURSOR_TARGET, // Notification of current run-to-cursor target
    WRITE_MEMORY, // Write a value to a memory address
    GET_MEMORY_MAP, // Request memory map information
    MEMORY_MAP_DATA, // Response with memory map data
}

// Interface for DebugData: a dictionary of debugging information
export interface DebugData {
    [key: string]: { [key: string]: any };
}

// Extended debug data that supports additional types
export interface ExtendedDebugData {
    [key: string]: { [key: string]: string | number | boolean | object };
}

// Type for log messages from worker
export interface LogMessageData {
    level: 'info' | 'warn' | 'error';
    source: string;
    message: string;
}

// Interface for memory range requests
export interface MemoryRangeRequest {
    start: number;
    length: number;
}

// Interface for memory range response
export interface MemoryRangeData {
    start: number;
    data: number[];
}

// Interface for memory write request
export interface MemoryWriteRequest {
    address: number;
    value: number;
}

// Interface for memory map region
export interface MemoryRegion {
    start: number;
    end: number;
    type: 'RAM' | 'ROM' | 'IO' | 'UNMAPPED';
    writable: boolean;
    description?: string;
}

// Interface for memory map data
export interface MemoryMapData {
    regions: MemoryRegion[];
}

// Message for state save/load
export type StateMessage = {
    type: WORKER_MESSAGES.SAVE_STATE | WORKER_MESSAGES.LOAD_STATE | WORKER_MESSAGES.STATE_DATA;
    data?: EmulatorState;
};

/**
 * Base worker message type with strict typing
 */
interface BaseWorkerMessage<T extends WORKER_MESSAGES, D = never> {
    type: T;
    data: D;
    requestId?: string;
}

/**
 * Messages that don't require data payload
 */
interface SimpleWorkerMessage<T extends WORKER_MESSAGES> {
    type: T;
    requestId?: string;
}

/**
 * Clock data interface (replacing unknown)
 */
export interface ClockData {
    cycles: number;
    frequency: number;
    totalCycles: number;
}

/**
 * All possible worker message types - fully type-safe discriminated union
 */
export type WorkerMessage =
    // Command messages (UI to Worker)
    | BaseWorkerMessage<WORKER_MESSAGES.SET_CRT_BS_SUPPORT_FLAG, boolean>
    | BaseWorkerMessage<WORKER_MESSAGES.KEY_DOWN, string>
    | BaseWorkerMessage<WORKER_MESSAGES.LOAD_STATE, EmulatorState>
    | BaseWorkerMessage<WORKER_MESSAGES.GET_MEMORY_RANGE, MemoryRangeRequest>
    | BaseWorkerMessage<WORKER_MESSAGES.SET_CPU_PROFILING, boolean>
    | BaseWorkerMessage<WORKER_MESSAGES.SET_CYCLE_ACCURATE_TIMING, boolean>
    | BaseWorkerMessage<WORKER_MESSAGES.SET_BREAKPOINT, number>
    | BaseWorkerMessage<WORKER_MESSAGES.CLEAR_BREAKPOINT, number>
    | BaseWorkerMessage<WORKER_MESSAGES.SET_DEBUGGER_ACTIVE, boolean>
    | BaseWorkerMessage<WORKER_MESSAGES.RUN_TO_ADDRESS, number>
    | BaseWorkerMessage<WORKER_MESSAGES.RUN_TO_CURSOR_TARGET, number | null>
    | BaseWorkerMessage<WORKER_MESSAGES.WRITE_MEMORY, MemoryWriteRequest>
    // Simple command messages (no data)
    | SimpleWorkerMessage<WORKER_MESSAGES.DEBUG_INFO>
    | SimpleWorkerMessage<WORKER_MESSAGES.SAVE_STATE>
    | SimpleWorkerMessage<WORKER_MESSAGES.PAUSE_EMULATION>
    | SimpleWorkerMessage<WORKER_MESSAGES.RESUME_EMULATION>
    | SimpleWorkerMessage<WORKER_MESSAGES.STEP>
    | SimpleWorkerMessage<WORKER_MESSAGES.CLEAR_ALL_BREAKPOINTS>
    | SimpleWorkerMessage<WORKER_MESSAGES.GET_BREAKPOINTS>
    | SimpleWorkerMessage<WORKER_MESSAGES.GET_EMULATION_STATUS>
    | SimpleWorkerMessage<WORKER_MESSAGES.GET_MEMORY_MAP>
    // Response messages (Worker to UI)
    | BaseWorkerMessage<WORKER_MESSAGES.STATE_DATA, EmulatorState>
    | BaseWorkerMessage<WORKER_MESSAGES.UPDATE_VIDEO_BUFFER, VideoData>
    | BaseWorkerMessage<WORKER_MESSAGES.DEBUG_DATA, DebugData>
    | BaseWorkerMessage<WORKER_MESSAGES.LOG_MESSAGE, LogMessageData>
    | BaseWorkerMessage<WORKER_MESSAGES.MEMORY_RANGE_DATA, MemoryRangeData>
    | BaseWorkerMessage<WORKER_MESSAGES.BREAKPOINTS_DATA, number[]>
    | BaseWorkerMessage<WORKER_MESSAGES.BREAKPOINT_HIT, number>
    | BaseWorkerMessage<WORKER_MESSAGES.EMULATION_STATUS, { paused: boolean }>
    | BaseWorkerMessage<WORKER_MESSAGES.CLOCK_DATA, ClockData>
    | BaseWorkerMessage<WORKER_MESSAGES.MEMORY_MAP_DATA, MemoryMapData>;

/**
 * Type guard to check if a message is a valid WorkerMessage
 */
export function isWorkerMessage(data: unknown): data is WorkerMessage {
    return typeof data === 'object' && 
           data !== null && 
           'type' in data &&
           typeof (data as {type: unknown}).type === 'number' &&
           Object.values(WORKER_MESSAGES).includes((data as {type: unknown}).type as WORKER_MESSAGES);
}

/**
 * Extract the payload type for a given message type
 */
export type ExtractPayload<T extends WORKER_MESSAGES> = 
    Extract<WorkerMessage, { type: T }> extends { data: infer D } ? D : never;

/**
 * Type-safe message creation functions
 */
export function createWorkerMessage<T extends WORKER_MESSAGES>(
    type: T,
    ...args: ExtractPayload<T> extends never ? [] : [data: ExtractPayload<T>]
): WorkerMessage {
    const [data] = args;
    if (data !== undefined) {
        return { type, data } as WorkerMessage;
    }
    return { type } as WorkerMessage;
}

/**
 * Type-safe message sending function
 */
export function sendWorkerMessage<T extends WORKER_MESSAGES>(
    worker: Worker,
    type: T,
    ...args: ExtractPayload<T> extends never ? [] : [data: ExtractPayload<T>]
): void {
    const message = createWorkerMessage(type, ...args);
    worker.postMessage(message);
}

/**
 * Type-safe message sending with request ID
 */
export function sendWorkerMessageWithRequest<T extends WORKER_MESSAGES>(
    worker: Worker,
    type: T,
    requestId: string,
    ...args: ExtractPayload<T> extends never ? [] : [data: ExtractPayload<T>]
): void {
    const message = createWorkerMessage(type, ...args);
    message.requestId = requestId;
    worker.postMessage(message);
}

// Union type for message data types (kept for backward compatibility)
export type MessageDataTypes = DebugData | VideoData | LogMessageData | MemoryRangeRequest | MemoryRangeData | ClockData | MemoryWriteRequest | MemoryMapData;