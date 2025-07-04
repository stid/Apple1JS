import Apple1 from '.';
import WebWorkerKeyboard from './WebKeyboard';
import WebCRTVideo, { WebCrtVideoSubFuncVideoType } from './WebCRTVideo';
import { WORKER_MESSAGES, LogMessageData, MemoryRangeRequest, MemoryRangeData } from './TSTypes';
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
                // Reset clock timing data to prevent timing issues after state restore
                apple1.clock.resetTiming();
                // Always restart the main loop after loading state
                apple1.startLoop();
                // Force video update after restore
                if (typeof video.forceUpdate === 'function') {
                    video.forceUpdate();
                }
            }
            break;
        }
        case WORKER_MESSAGES.PAUSE_EMULATION: {
            // Pause the clock/emulation
            apple1.clock.pause();
            break;
        }
        case WORKER_MESSAGES.RESUME_EMULATION: {
            // Resume the clock/emulation
            apple1.clock.resume();
            break;
        }
        case WORKER_MESSAGES.GET_MEMORY_RANGE: {
            // Handle memory range request for disassembler
            if (data && typeof data === 'object') {
                const request = data as MemoryRangeRequest & { mode?: string };
                const memoryData: number[] = [];
                for (let i = 0; i < request.length; i++) {
                    const addr = request.start + i;
                    if (addr >= 0 && addr <= 0xFFFF) {
                        memoryData.push(apple1.bus.read(addr));
                    } else {
                        memoryData.push(0);
                    }
                }
                const response: MemoryRangeData & { mode?: string } = {
                    start: request.start,
                    data: memoryData,
                    mode: request.mode
                };
                postMessage({ data: response, type: WORKER_MESSAGES.MEMORY_RANGE_DATA });
            }
            break;
        }
    }
};

// Send debug data periodically for disassembler
setInterval(() => {
    const { cpu } = apple1;
    postMessage({
        data: {
            cpu: { PC: cpu.PC }
        },
        type: WORKER_MESSAGES.DEBUG_DATA,
    });
}, 100); // Every 100ms

apple1.startLoop();
