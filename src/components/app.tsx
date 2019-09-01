import React from 'react';
import { WORKER_MESSAGES, VideoData } from 'apple1/TSTypes';
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
    const [videoData, setVideoData] = React.useState<VideoData>({
        buffer: [[0, ['']]],
        row: 0,
        column: 0,
    });

    React.useEffect(() => {
        if (worker) {
            worker.addEventListener('message', e => {
                const { data, type }: { data: VideoData; type: WORKER_MESSAGES } = e.data;
                switch (type) {
                    case WORKER_MESSAGES.VIDEO_BUFFER:
                        setVideoData(data as VideoData);
                        break;
                }
            });
        }
    }, []);

    return (
        <>
            <GlobalStyle />
            <CRT videoData={videoData} />
        </>
    );
};
