import { useState, useEffect, useCallback, JSX } from 'react';
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

    const handleWorkerMessage = useCallback((e: MessageEvent) => {
        // Type guard for expected message structure
        if (!e.data || typeof e.data !== 'object') return;
        const { data, type } = e.data as { data: VideoData; type: WORKER_MESSAGES };
        if (type === WORKER_MESSAGES.UPDATE_VIDEO_BUFFER) {
            setVideoData(data);
        }
    }, []);

    useEffect(() => {
        worker.addEventListener('message', handleWorkerMessage);
        return () => {
            worker.removeEventListener('message', handleWorkerMessage);
        };
    }, [worker, handleWorkerMessage]);

    return <CRT videoData={videoData} />;
};

CRTWorker.displayName = 'CRTWorker';

export default CRTWorker;
