export enum WORKER_MESSAGES {
    VIDEO_BUFFER,
    KEY_DOWN,
    DEBUG_INFO,
}

export enum WEB_VIDEO_BUFFER_ROW {
    DATA = 1,
    KEY = 0,
}

export type VideoBuffer = Array<[number, string[]]>;

export interface VideoData {
    buffer: VideoBuffer;
    row: number;
    column: number;
}

export interface DebugData {
    [key: string]: { [key: string]: string | number };
}

export type MessageDataTypes = DebugData | VideoData;
