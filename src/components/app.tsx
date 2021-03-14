import { useState, useEffect } from 'react';
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
export default ({ worker }: Props): JSX.Element => {
    return (
        <>
            <GlobalStyle />
            <LayoutRow>
                <LayoutColumn>
                    <Title />
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
    const [videoData, setVideoData] = useState<VideoData>({
        buffer: [[0, ['']]],
        row: 0,
        column: 0,
    });

    useEffect(() => {
        worker.addEventListener('message', (e) => {
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
            <CRT videoData={videoData} />
        </>
    );
};

const Title = () => <h3>Apple 1 :: JS Emulator - by =stid=</h3>;
