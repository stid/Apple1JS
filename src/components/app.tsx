import React from 'react';
import { WORKER_MESSAGES, VideoData } from 'apple1/TSTypes';
import CRT from './CRT';
import Debugger from './Debugger';
import Info from './Info';

import styled, { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  body {
    background-color:black;
    color: #BBB;
    font-size: 14px;
    font-family: Menlo, Monaco, "Courier New", monospace;
  }
`;

const LayoutRow = styled.div`
    display: flex;
`;

const LayoutColumn = styled.div`
    flex: 50%;
    padding: 20px;
`;

type Props = {
    worker: Worker;
};
export default ({ worker }: Props) => {
    return (
        <>
            <GlobalStyle />
            <LayoutRow>
                <LayoutColumn>
                    <CRTWorker worker={worker} />
                    <Debugger worker={worker} />
                </LayoutColumn>
                <LayoutColumn>
                    <Info />
                </LayoutColumn>
            </LayoutRow>
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
        worker.addEventListener('message', e => {
            const { data, type }: { data: VideoData; type: WORKER_MESSAGES } = e.data;
            switch (type) {
                case WORKER_MESSAGES.VIDEO_BUFFER:
                    setVideoData(data as VideoData);
                    break;
            }
        });
    }, [worker]);

    return (
        <>
            <h3>Apple 1 :: JS Emulator - by =stid=</h3>
            <CRT videoData={videoData} />
        </>
    );
};
