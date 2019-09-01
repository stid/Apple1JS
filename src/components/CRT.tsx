import React from 'react';

type Props = {
    videoBuffer: Array<[number, string[]]>;
};

const CRT = ({ videoBuffer }: Props) => (
    <div style={{ backgroundColor: '#193549', width: '337px' }}>
        <pre style={{ fontSize: '14px', font: '"Courier New", Courier, monospace', color: '#a5ff90' }}>
            {videoBuffer.map(line => (
                <Row line={line[1]} key={line[0]} />
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
