import { WEB_VIDEO_BUFFER_ROW, VideoData } from 'apple1/TSTypes';
import { styled } from '@stitches/react';
import CRTCursor from './CRTCursor';
import CRTRow from './CRTRow';
import * as CRTConstants from './CRTConstants';

const CRTContainer = styled('div', {
    backgroundColor: '#153838',
    width: CRTConstants.MONITOR_WIDTH,
    height: CRTConstants.MONITOR_HEIGHT,
    position: 'relative',
});

const CRTPreContainer = styled('div', {
    fontSize: '13px',
    fontFamily: '"Press Start 2P", cursive',
    color: '#a5ff90',
    letterSpacing: '0px',
    position: 'relative',
});

type Props = {
    videoData: VideoData;
};
const CRT = ({ videoData }: Props): JSX.Element => (
    <CRTContainer>
        <CRTPreContainer>
            <CRTCursor row={videoData.row} column={videoData.column} />
            {videoData.buffer.map((line, index) => (
                <CRTRow
                    rowIndex={index}
                    line={line[WEB_VIDEO_BUFFER_ROW.DATA].join('')}
                    key={line[WEB_VIDEO_BUFFER_ROW.KEY]}
                />
            ))}
        </CRTPreContainer>
    </CRTContainer>
);

export default CRT;
