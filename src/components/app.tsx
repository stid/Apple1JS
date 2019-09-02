import React from 'react';
import { WORKER_MESSAGES, VideoData } from 'apple1/TSTypes';
import CRT from './CRT';
import Debugger from './Debugger';

import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  body {
    background-color:black;
    color: #EEE;
    font-size: 12px;
    font-family: Menlo, Monaco, "Courier New", monospace;
  }
`;

type Props = {
    worker: Worker;
};

export default ({ worker }: Props) => {
    return (
        <>
            <GlobalStyle />
            <CRTWorker worker={worker} />
            <Debugger worker={worker} />
        </>
    );
};

type CRTWorkerProps = {
    worker: Worker;
};

const CRTWorker = ({ worker }: CRTWorkerProps) => {
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
            <h3>Apple 1 :: JS Emulator - by =stid=</h3>
            <CRT videoData={videoData} />
        </>
    );
};
