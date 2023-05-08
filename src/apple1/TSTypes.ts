// Enum for worker message types
export enum WORKER_MESSAGES {
    UPDATE_VIDEO_BUFFER, // Update the video buffer
    KEY_DOWN, // Key press event
    DEBUG_INFO, // Debugging information
    CLOCK_DATA, // Clock data update
    SET_CRT_BS_SUPPORT_FLAG, // Set CRT support flag
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

// Union type for message data types
export type MessageDataTypes = DebugData | VideoData;
