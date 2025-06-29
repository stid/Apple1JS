import { WEB_VIDEO_BUFFER_ROW, VideoData } from '../apple1/TSTypes';
import CRTCursor from './CRTCursor';
import CRTRow from './CRTRow';
import * as CRTConstants from './CRTConstants';
import { JSX } from 'react';

type Props = {
    videoData: VideoData;
};
const CRT = ({ videoData }: Props): JSX.Element => (
    <div
        className="relative bg-teal-900 rounded-lg shadow-2xl border-2 border-teal-700 overflow-hidden crt-effect"
        style={{ width: CRTConstants.MONITOR_WIDTH, height: CRTConstants.MONITOR_HEIGHT }}
    >
        {/* Optional scanline overlay */}
        <div
            className="pointer-events-none absolute inset-0 z-10 opacity-20 mix-blend-overlay"
            style={{
                background:
                    'repeating-linear-gradient(180deg, transparent, transparent 2px, #000 3px, transparent 4px)',
            }}
        />
        <div
            className="text-[13px] relative text-green-400 tracking-normal font-mono z-20 select-text"
            style={{ right: '3px', position: 'relative' }}
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
