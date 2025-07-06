// Import consolidated types
import type { EmulatorState, RAMBankState } from './@types/EmulatorState';
import type { VideoBuffer, VideoData } from './@types/VideoTypes';
import { WEB_VIDEO_BUFFER_ROW } from './@types/VideoTypes';

// Re-export for backward compatibility
export type { EmulatorState, RAMBankState, VideoBuffer, VideoData };
export { WEB_VIDEO_BUFFER_ROW };

// Message for state save/load
export type StateMessage = {
    type: WORKER_MESSAGES.SAVE_STATE | WORKER_MESSAGES.LOAD_STATE | WORKER_MESSAGES.STATE_DATA;
    data?: EmulatorState;
};
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
}


// Interface for DebugData: a dictionary of debugging information
export interface DebugData {
    [key: string]: { [key: string]: string | number };
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

// Union type for message data types
export type MessageDataTypes = DebugData | VideoData | LogMessageData | MemoryRangeRequest | MemoryRangeData;
