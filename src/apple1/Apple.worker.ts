import Apple1 from '.';
import WebWorkerKeyboard from './WebKeyboard';
import WebCRTVideo, { WebCrtVideoSubFuncVideoType } from './WebCRTVideo';
import { WORKER_MESSAGES } from './TSTypes';

export const video = new WebCRTVideo();
export const keyboard = new WebWorkerKeyboard();

video.subscribe((data: WebCrtVideoSubFuncVideoType) => {
    const { buffer, row, column } = data;
    postMessage({ data: { buffer, row, column }, type: WORKER_MESSAGES.VIDEO_BUFFER });
});

const apple1 = new Apple1({ video: video, keyboard: keyboard });

onmessage = function (e: MessageEvent<{ data: string; type: WORKER_MESSAGES }>) {
    const { data, type } = e.data;

    switch (type) {
        case WORKER_MESSAGES.KEY_DOWN:
            keyboard.write(data);
            break;
        case WORKER_MESSAGES.DEBUG_INFO: {
            const { clock, cpu, pia, addressSpaces } = apple1;
            postMessage({
                data: {
                    clock: clock.toDebug(),
                    cpu: cpu.toDebug(),
                    pia: pia.toDebug(),
                    Spaces: addressSpaces.toDebug(),
                },
                type: WORKER_MESSAGES.DEBUG_INFO,
            });
            break;
        }
    }
};

apple1.loop();
