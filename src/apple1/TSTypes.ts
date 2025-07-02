// Type for RAM state (expandable for more components)
export interface RAMBankState {
    id: string;
    state: { data: number[] };
}

export interface EmulatorState {
    ram: RAMBankState[];
    // Add more components here later
}

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
}

// Enum for indexing the VideoBuffer row tuple
export enum WEB_VIDEO_BUFFER_ROW {
    KEY = 0, // Key index
    DATA = 1, // Data index
}

// Type for VideoBuffer: an array of tuples with a key and an array of strings
export type VideoBuffer = Array<[number, string[]]>;

// Interface for VideoData: contains buffer, row, and column information
export interface VideoData {
    buffer: VideoBuffer;
    row: number;
    column: number;
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

// Union type for message data types
export type MessageDataTypes = DebugData | VideoData | LogMessageData;
