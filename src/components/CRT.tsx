import { WEB_VIDEO_BUFFER_ROW, VideoData } from '../apple1/TSTypes';
import CRTCursor from './CRTCursor';
import CRTRow from './CRTRow';
import * as CRTConstants from './CRTConstants';

type Props = {
    videoData: VideoData;
};
const CRT = ({ videoData }: Props): JSX.Element => (
    <div
        className="relative bg-teal-900"
        style={{ width: CRTConstants.MONITOR_WIDTH, height: CRTConstants.MONITOR_HEIGHT }}
    >
        <div
            className={`text-[${CRTConstants.FONT_SIZE}px] relative text-green-400 tracking-normal font-['${CRTConstants.FONT_FAMILY}']`}
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
