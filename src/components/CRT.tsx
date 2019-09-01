import React from 'react';
import { WEB_VIDEO_BUFFER_ROW, VideoBuffer } from 'apple1/TSTypes';

type Props = {
    videoBuffer: VideoBuffer;
};

const CRT = ({ videoBuffer }: Props) => (
    <div style={{ backgroundColor: '#193549', width: '517px' }}>
        <pre
            style={{
                fontSize: '12px',
                fontFamily: '"Press Start 2P", cursive',
                color: '#a5ff90',
                lineHeight: '14px',
                letterSpacing: '1px',
            }}
        >
            {videoBuffer.map(line => (
                <Row line={line[WEB_VIDEO_BUFFER_ROW.DATA]} key={line[WEB_VIDEO_BUFFER_ROW.KEY]} />
            ))}
        </pre>
    </div>
);

type RowProps = {
    line: string[];
};
const Row = ({ line }: RowProps) => {
    return <>{`${line.join('')}\n`}</>;
};

export default CRT;
