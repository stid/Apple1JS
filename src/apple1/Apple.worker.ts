import Apple1 from '.';
import WebWorkerKeyboard from './WebKeyboard';
import WebCRTVideo, { WebCrtVideoSubFuncVideoType } from './WebCRTVideo';
import { WORKER_MESSAGES, LogMessageData } from './TSTypes';
import { loggingService } from '../services/LoggingService';

export const video = new WebCRTVideo();
export const keyboard = new WebWorkerKeyboard();

video.subscribe((data: WebCrtVideoSubFuncVideoType) => {
    const { buffer, row, column } = data;
    postMessage({ data: { buffer, row, column }, type: WORKER_MESSAGES.UPDATE_VIDEO_BUFFER });
});

// Set up worker-to-main thread log message forwarding
loggingService.addHandler((level, source, message) => {
    const logData: LogMessageData = { level, source, message };
    postMessage({ data: logData, type: WORKER_MESSAGES.LOG_MESSAGE });
});

const apple1 = new Apple1({ video: video, keyboard: keyboard });

import type { StateMessage } from './TSTypes';

onmessage = function (e: MessageEvent<{ data: string; type: WORKER_MESSAGES } | StateMessage>) {
    let type: WORKER_MESSAGES;
    let data: unknown;
    if (typeof e.data === 'object' && e.data !== null && 'type' in e.data) {
        type = (e.data as StateMessage).type;
        data = (e.data as StateMessage).data;
    } else {
        type = (e.data as { type: WORKER_MESSAGES }).type;
        data = (e.data as { data: string }).data;
    }

    switch (type) {
        case WORKER_MESSAGES.SET_CRT_BS_SUPPORT_FLAG:
            video.setSupportBS(!!data);
            break;
        case WORKER_MESSAGES.KEY_DOWN:
            if (typeof data === 'string') {
                keyboard.write(data);
            }
            break;
        case WORKER_MESSAGES.DEBUG_INFO: {
            const { clock, cpu, pia, bus } = apple1;
            postMessage({
                data: {
                    cpu: cpu.toDebug(),
                    pia: pia.toDebug(),
                    Bus: bus.toDebug(),
                    clock: clock.toDebug(),
                },
                type: WORKER_MESSAGES.DEBUG_INFO,
            });
            break;
        }
        case WORKER_MESSAGES.SAVE_STATE: {
            // Save full machine state
            const state = apple1.saveState();
            postMessage({ data: state, type: WORKER_MESSAGES.STATE_DATA });
            break;
        }
        case WORKER_MESSAGES.LOAD_STATE: {
            // Restore full machine state
            if (data && typeof data === 'object') {
                // Deep clone the state to ensure a new reference and trigger state change
                const clonedState = JSON.parse(JSON.stringify(data));
                apple1.loadState(clonedState);
                // Always restart the main loop after loading state
                apple1.startLoop();
                // Force video update after restore
                if (typeof video.forceUpdate === 'function') {
                    video.forceUpdate();
                }
            }
            break;
        }
    }
};

apple1.startLoop();
