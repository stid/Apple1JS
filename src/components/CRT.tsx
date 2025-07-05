import { WEB_VIDEO_BUFFER_ROW, type VideoData } from '../apple1/TSTypes';
import CRTCursor from './CRTCursor';
import CRTRow from './CRTRow';
import * as CRTConstants from './CRTConstants';
import { JSX } from 'react';

type Props = {
    videoData: VideoData;
};
const CRT = ({ videoData }: Props): JSX.Element => (
    <div
        className="crt-container crt-bloom crt-barrel rounded-lg shadow-2xl shadow-green-500/20 border-2 border-teal-800 overflow-hidden crt-power-on"
        style={{ 
            width: CRTConstants.MONITOR_WIDTH, 
            height: CRTConstants.MONITOR_HEIGHT,
            backgroundColor: '#0A3A3A' // Darker teal background
        }}
    >
        {/* Enhanced scanline overlay with wobble effect */}
        <div className="crt-scanlines crt-scanline-wobble" />
        
        {/* Main display content with phosphor effect */}
        <div
            className="text-[13px] relative text-green-400 tracking-normal font-mono z-20 select-text crt-phosphor crt-chromatic"
            style={{ 
                right: '3px', 
                position: 'relative'
            }}
        >
            <CRTCursor row={videoData.row} column={videoData.column} />
            {videoData.buffer.map((line, index) => (
                <CRTRow
                    rowIndex={index}
                    line={line[WEB_VIDEO_BUFFER_ROW.DATA].join('')}
                    key={line[WEB_VIDEO_BUFFER_ROW.KEY]}
                />
            ))}
        </div>
    </div>
);

export default CRT;
