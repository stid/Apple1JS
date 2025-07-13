import { useState, useEffect, JSX } from 'react';
import { VideoData } from '../apple1/TSTypes';
import CRT from './CRT';
import type { WorkerManager } from '../services/WorkerManager';

type CRTWorkerProps = {
    workerManager: WorkerManager;
};

const CRTWorker = ({ workerManager }: CRTWorkerProps): JSX.Element => {
    const [videoData, setVideoData] = useState<VideoData>({
        buffer: [[0, ['']]],
        row: 0,
        column: 0,
    });

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
        
        const setupVideoUpdates = async () => {
            const result = await workerManager.onVideoUpdate((data: VideoData) => {
                setVideoData(data);
            });
            if (result) {
                unsubscribe = result;
            }
        };
        
        setupVideoUpdates();
        
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [workerManager]);

    return <CRT videoData={videoData} />;
};

CRTWorker.displayName = 'CRTWorker';

export default CRTWorker;
