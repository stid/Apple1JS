import Apple1 from './apple1';
import WebKeyboard from './Apple1/WebKeyboard';
import WebCRTVideo from './Apple1/WebCRTVideo';

export const video = new WebCRTVideo();
export const keyboard = new WebKeyboard();

export default Apple1;

video.subscribe({
    onChange: newBuffer => {
        console.log(newBuffer);
    },
});

Apple1({ video: video, keyboard: keyboard });
