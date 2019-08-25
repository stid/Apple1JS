import Apple1 from './Apple1';
import NodeKeyboard from './Apple1/NodeKeyboard';
import NodeCRTVideo from './Apple1/NodeCRTVideo';

//export const video = new NodeKeyboard();
//export const keyboard = new NodeCRTVideo();

export default Apple1;



Apple1({video: new NodeCRTVideo(), keyboard: new NodeKeyboard()});
