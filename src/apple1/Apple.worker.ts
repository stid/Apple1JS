import Apple1 from '.';
import WebWorkerKeyboard from './WebKeyboard';
import WebCRTVideo from './WebCRTVideo';
import { WORKER_MESSAGES } from './TSTypes';

export const video = new WebCRTVideo();
export const keyboard = new WebWorkerKeyboard();

video.subscribe({
    onChange: newBuffer => {
        postMessage({ data: newBuffer, type: WORKER_MESSAGES.VIDEO_BUFFER });
    },
});

onmessage = function(e) {
    const { data, type } = e.data;

    switch (type) {
        case WORKER_MESSAGES.KEY_DOWN:
            keyboard.write(data);
            break;
    }
};

Apple1({ video: video, keyboard: keyboard });
