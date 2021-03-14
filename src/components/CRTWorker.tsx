import { useState, useEffect } from 'react';
import { WORKER_MESSAGES, VideoData } from 'apple1/TSTypes';
import CRT from './CRT';

type CRTWorkerProps = {
    worker: Worker;
};

const CRTWorker = ({ worker }: CRTWorkerProps): JSX.Element => {
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

    return <CRT videoData={videoData} />;
};

export default CRTWorker;
