import ReactDOM from 'react-dom';
import React from 'react';
import Apple1 from './apple1';
import WebKeyboard from './apple1/WebKeyboard';
import WebCRTVideo from './apple1/WebCRTVideo';
import App from 'components/app';

export const video = new WebCRTVideo();
export const keyboard = new WebKeyboard();

ReactDOM.render(<App video={video} />, document.getElementById('app'));

Apple1({ video: video, keyboard: keyboard });
