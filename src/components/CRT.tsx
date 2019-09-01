import React from 'react';
import { WEB_VIDEO_BUFFER_ROW, VideoBuffer } from 'apple1/TSTypes';
import styled from 'styled-components';

const TOP_PADDING = 20;
const LEFT_PADDING = 20;
const FONT_RECT = 13;
const MONITOR_WIDTH = FONT_RECT * 40 + LEFT_PADDING;
const MONITOR_HEIGHT = FONT_RECT * 24 + TOP_PADDING;

const CRTContainer = styled.div`
    background-color: #193549;
    width: ${MONITOR_WIDTH}px;
    height: ${MONITOR_HEIGHT}px;
`;

const CRTPreContainer = styled.div`
    font-size: 12px;
    font-family: 'Press Start 2P', cursive;
    color: #a5ff90;
    letter-spacing: 0px;
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

type RowProps = {
    line: string;
    rowIndex: number;
};
const Row = React.memo(({ line, rowIndex }: RowProps) => {
    return (
        <div>
            {line.split('').map((char, index) => (
                <Char char={char} x={index} y={rowIndex} key={index} />
            ))}
        </div>
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
    y: number;
};
const Char = React.memo(({ char, x, y }: CharProps) => {
    return (
        <CharContainer style={{ top: `${y * FONT_RECT + TOP_PADDING}px`, left: `${x * FONT_RECT + LEFT_PADDING}px` }}>
            {char}
        </CharContainer>
    );
});

export default CRT;
