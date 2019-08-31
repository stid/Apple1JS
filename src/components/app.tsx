import React from 'react';
import WebCRTVideo from 'apple1/WebCRTVideo';

type Props = {
    video: WebCRTVideo;
};

export default ({ video }: Props) => {
    const [videoBuffer, setVideoBuffer] = React.useState([['']]);

    React.useEffect(() => {
        video.subscribe({
            onChange: newBuffer => {
                setVideoBuffer(newBuffer);
            },
        });
    }, []);

    return (
        <pre style={{ font: '"Courier New", Courier, monospace' }}>
            {videoBuffer.map(line => `${line.join('')}\n`)}{' '}
        </pre>
    );
};
