import Apple1 from './apple1';
import NodeKeyboard from './apple1/NodeKeyboard';
import NodeCRTVideo from './apple1/NodeCRTVideo';

export const video = new NodeCRTVideo();
export const keyboard = new NodeKeyboard();

export default Apple1;

Apple1({ video: video, keyboard: keyboard });
