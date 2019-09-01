import React from 'react';
import { WORKER_MESSAGES, VideoBuffer } from 'apple1/TSTypes';
import CRT from './CRT';

import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  body {
    background-color:black;
  }
`;

type Props = {
    worker?: Worker;
};

export default ({ worker }: Props) => {
    const [videoBuffer, setVideoBuffer] = React.useState<VideoBuffer>([[0, ['']]]);

    React.useEffect(() => {
        if (worker) {
            worker.addEventListener('message', e => {
                const { data, type }: { data: VideoBuffer; type: WORKER_MESSAGES } = e.data;
                switch (type) {
                    case WORKER_MESSAGES.VIDEO_BUFFER:
                        setVideoBuffer(data as VideoBuffer);
                        break;
                }
            });
        }
    }, []);

    return (
        <>
            <GlobalStyle />
            <CRT videoBuffer={videoBuffer} />
        </>
    );
};
