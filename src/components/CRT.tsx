import React from 'react';
import { WEB_VIDEO_BUFFER_ROW, VideoBuffer } from 'apple1/TSTypes';
import styled from 'styled-components';

const TOP_PADDING = 10;
const LEFT_PADDING = 10;
const FONT_RECT = 13;
const MONITOR_WIDTH = FONT_RECT * 40 + LEFT_PADDING * 2;
const MONITOR_HEIGHT = FONT_RECT * 24 + TOP_PADDING * 2;

const CRTContainer = styled.div`
    background-color: #193549;
    width: ${MONITOR_WIDTH}px;
    height: ${MONITOR_HEIGHT}px;
    position: relative;
`;

const CRTPreContainer = styled.div`
    font-size: 12px;
    font-family: 'Press Start 2P', cursive;
    color: #a5ff90;
    letter-spacing: 0px;
    position: relative;
`;

type Props = {
    videoBuffer: VideoBuffer;
};
const CRT = ({ videoBuffer }: Props) => (
    <CRTContainer>
        <CRTPreContainer>
            {videoBuffer.map((line, index) => (
                <Row
                    rowIndex={index}
                    line={line[WEB_VIDEO_BUFFER_ROW.DATA].join('')}
                    key={line[WEB_VIDEO_BUFFER_ROW.KEY]}
                />
            ))}
        </CRTPreContainer>
    </CRTContainer>
);

const RowContainer = styled.div`
    position: absolute;
    height: 12px;
`;
type RowProps = {
    line: string;
    rowIndex: number;
};
const Row = React.memo(({ line, rowIndex }: RowProps) => {
    return (
        <RowContainer style={{ top: `${rowIndex * FONT_RECT + TOP_PADDING}px` }}>
            {line.split('').map((char, index) => (
                <Char char={char} x={index} key={index} />
            ))}
        </RowContainer>
    );
});

const CharContainer = styled.div`
    width: 12px;
    height: 12px;
    position: absolute;
`;

type CharProps = {
    char: string;
    x: number;
};
const Char = React.memo(({ char, x }: CharProps) => {
    return <CharContainer style={{ left: `${x * FONT_RECT + LEFT_PADDING}px` }}>{char}</CharContainer>;
});

export default CRT;
