export enum WORKER_MESSAGES {
    VIDEO_BUFFER,
    KEY_DOWN,
}

export enum WEB_VIDEO_BUFFER_ROW {
    DATA = 1,
    KEY = 0,
}

export type VideoBuffer = Array<[number, string[]]>;

export type VideoData = {
    buffer: VideoBuffer;
    row: number;
    column: number;
};
