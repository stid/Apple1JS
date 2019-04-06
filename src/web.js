// @flow
import Apple1 from './Apple1';
import WebKeyboard from './Apple1/WebKeyboard.js';
import WebCRTVideo from './Apple1/WebCRTVideo.js';

Apple1({video: new WebCRTVideo(), keyboard: new WebKeyboard()});