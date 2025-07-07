/**
 * Type for VideoBuffer: an array of tuples with a key and an array of strings
 */
export type VideoBuffer = Array<[number, string[]]>;

/**
 * Enum for accessing VideoBuffer tuple elements
 */
export enum WEB_VIDEO_BUFFER_ROW {
    KEY = 0,
    DATA = 1,
}

/**
 * Video data structure
 */
export interface VideoData {
    buffer: VideoBuffer;
    row: number;
    column: number;
}

/**
 * Video output interface for WebCRTVideo
 */
export interface VideoOut {
    onChange: (buffer: VideoBuffer, row: number, column: number) => void;
}

/**
 * WebCRTVideo subscription callback type
 */
export type WebCrtVideoSubFuncVideoType = VideoData;