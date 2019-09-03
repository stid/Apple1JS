import React from 'react';
import { WEB_VIDEO_BUFFER_ROW, VideoData } from 'apple1/TSTypes';
import styled from 'styled-components';

const TOP_PADDING = 10;
const LEFT_PADDING = 10;
const FONT_RECT = 15;
const MONITOR_WIDTH = FONT_RECT * 40 + LEFT_PADDING * 2;
const MONITOR_HEIGHT = FONT_RECT * 24 + TOP_PADDING * 2;

const CRTContainer = styled.div`
    background-color: #193549;
    width: ${MONITOR_WIDTH}px;
    height: ${MONITOR_HEIGHT}px;
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
const CRT = ({ videoData }: Props) => (
    <CRTContainer>
        <CRTPreContainer>
            <Cursor row={videoData.row} column={videoData.column} />
            {videoData.buffer.map((line, index) => (
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
    height: 13px;
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
    width: 13px;
    height: 13px;
    position: absolute;
`;

type CharProps = {
    char: string;
    x: number;
};
const Char = React.memo(({ char, x }: CharProps) => {
    return <CharContainer style={{ left: `${x * FONT_RECT + LEFT_PADDING}px` }}>{char}</CharContainer>;
});

const CursorContainer = styled.div`
    width: 12px;
    height: 12px;
    position: absolute;
`;
type CursorProp = {
    row: number;
    column: number;
};
const Cursor = React.memo(({ row, column }: CursorProp) => {
    const [visible, setVisible] = React.useState(true);

    React.useEffect(() => {
        setTimeout(
            () => {
                setVisible(!visible);
            },
            visible ? 600 : 400,
        );
    }, [visible]);

    return (
        <>
            <CursorContainer
                style={{
                    left: `${column * FONT_RECT + LEFT_PADDING}px`,
                    top: `${row * FONT_RECT + TOP_PADDING}px`,
                    display: `${visible ? 'none' : 'block'}`,
                }}
            >
                @
            </CursorContainer>
        </>
    );
});

export default CRT;
