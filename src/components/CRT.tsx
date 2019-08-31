import React from 'react';

type Props = {
    videoBuffer: string[][];
};

const CRT = ({ videoBuffer }: Props) => (
    <div style={{ backgroundColor: '#193549', width: '337px' }}>
        <pre style={{ fontSize: '14px', font: '"Courier New", Courier, monospace', color: '#a5ff90' }}>
            {videoBuffer.map(line => `${line.join('')}\n`)}{' '}
        </pre>
    </div>
);

export default CRT;
