import Apple1 from '.';
import WebWorkerKeyboard from './WebKeyboard';
import WebCRTVideo from './WebCRTVideo';
import { WORKER_MESSAGES } from './TSTypes';

export const video = new WebCRTVideo();
export const keyboard = new WebWorkerKeyboard();

video.subscribe({
    onChange: (newBuffer, row, column) => {
        postMessage({ data: { buffer: newBuffer, row: row, column: column }, type: WORKER_MESSAGES.VIDEO_BUFFER });
    },
});

const apple1 = new Apple1({ video: video, keyboard: keyboard });

onmessage = function (e) {
    const { data, type } = e.data;

    switch (type) {
        case WORKER_MESSAGES.KEY_DOWN:
            keyboard.write(data);
            break;
        case WORKER_MESSAGES.DEBUG_INFO:
            postMessage({
                data: {
                    clock: apple1.clock.toDebug(),
                    cpu: apple1.cpu.toDebug(),
                    pia: apple1.pia.toDebug(),
                    Spaces: apple1.addressSpaces.toDebug(),
                },
                type: WORKER_MESSAGES.DEBUG_INFO,
            });
            break;
    }
};

apple1.loop();
