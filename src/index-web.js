// @flow
import Apple1 from './Apple1';
import WebKeyboard from './Apple1/WebKeyboard.js';
import WebCRTVideo from './Apple1/WebCRTVideo.js';


export const video = new WebCRTVideo();
export const keyboard = new WebKeyboard();

export default Apple1;


//webCRTVideo.subscribe( {
//    onChange: newBuffer => {
//        console.log(newBuffer);
//    }}
//);

//Apple1({video: webCRTVideo, keyboard: webKeyboard});