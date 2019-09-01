import React from 'react';
import { WORKER_MESSAGES } from 'apple1/constants';
import CRT from './CRT';

type Props = {
    worker?: Worker;
};

declare type VideoBufferType = Array<[number, string[]]>;

export default ({ worker }: Props) => {
    const [videoBuffer, setVideoBuffer] = React.useState<VideoBufferType>([[0, ['']]]);

    React.useEffect(() => {
        if (worker) {
            worker.addEventListener('message', e => {
                const { data, type }: { data: VideoBufferType; type: WORKER_MESSAGES } = e.data;
                switch (type) {
                    case WORKER_MESSAGES.VIDEO_BUFFER:
                        setVideoBuffer(data as VideoBufferType);
                        break;
                }
            });
        }
    }, []);

    return <CRT videoBuffer={videoBuffer} />;
};
