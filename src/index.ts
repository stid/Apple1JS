import Apple1 from './apple1';
import NodeKeyboard from './apple1/NodeKeyboard';
import NodeCRTVideo from './apple1/NodeCRTVideo';

export const video = new NodeCRTVideo();
export const keyboard = new NodeKeyboard();

export default Apple1;

const apple1 = new Apple1({ video: video, keyboard: keyboard });
console.log('::: CTRL-R to Start / Reset');

apple1.loop();
