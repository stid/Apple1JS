import Apple1 from './apple1';
import WebWorkerKeyboard from './apple1/WebWorkerKeyboard';
import WebCRTVideo from './apple1/WebCRTVideo';

export const video = new WebCRTVideo();
export const keyboard = new WebWorkerKeyboard();

// TO VIDEO
video.subscribe({
    onChange: newBuffer => {
        postMessage({ data: newBuffer, type: 'VideoBuffer' });
    },
});

onmessage = function(e) {
    const { data, type } = e.data;

    switch (type) {
        case 'keyDown':
            keyboard.write(data);
            break;
    }
};

Apple1({ video: video, keyboard: keyboard });
