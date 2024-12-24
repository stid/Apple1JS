import { useState, useEffect, JSX } from 'react';
import { WORKER_MESSAGES, VideoData } from '../apple1/TSTypes';
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
        const handleWorkerMessage = (e: MessageEvent<{ data: VideoData; type: WORKER_MESSAGES }>) => {
            const { data, type } = e.data;
            if (type === WORKER_MESSAGES.UPDATE_VIDEO_BUFFER) {
                setVideoData(data);
            }
        };

        worker.addEventListener('message', handleWorkerMessage);

        return () => {
            worker.removeEventListener('message', handleWorkerMessage);
        };
    }, [worker]);

    return <CRT videoData={videoData} />;
};

export default CRTWorker;
