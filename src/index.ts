import Apple1 from './Apple1';
import NodeKeyboard from './Apple1/NodeKeyboard';
import NodeCRTVideo from './Apple1/NodeCRTVideo';

export const video = new NodeCRTVideo();
export const keyboard = new NodeKeyboard();

export default Apple1;

Apple1({video: video, keyboard: keyboard});
