import { WEB_VIDEO_BUFFER_ROW, VideoData } from 'apple1/TSTypes';
import styled from 'styled-components';
import CRTCursor from './CRTCursor';
import CRTRow from './CRTRow';
import * as CRTConstants from './CRTConstants';

const CRTContainer = styled.div`
    background-color: #193549;
    width: ${CRTConstants.MONITOR_WIDTH}px;
    height: ${CRTConstants.MONITOR_HEIGHT}px;
    position: relative;
`;

const CRTPreContainer = styled.div`
    font-size: 13px;
    font-family: 'Press Start 2P', cursive;
    color: #a5ff90;
    letter-spacing: 0px;
    position: relative;
`;

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
