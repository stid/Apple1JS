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
        const handler = (e: MessageEvent<{ data: VideoData; type: WORKER_MESSAGES }>) => {
            const { data, type } = e.data;
            switch (type) {
                case WORKER_MESSAGES.VIDEO_BUFFER:
                    setVideoData(data);
                    break;
            }
        };
        worker.addEventListener('message', handler);

        return () => worker.removeEventListener('message', handler);
    }, [worker]);

    return <CRT videoData={videoData} />;
};

export default CRTWorker;
