import React from 'react';
import { WORKER_MESSAGES } from 'apple1/constants';
import CRT from './CRT';

type Props = {
    worker?: Worker;
};

export default ({ worker }: Props) => {
    const [videoBuffer, setVideoBuffer] = React.useState([['']]);

    React.useEffect(() => {
        if (worker) {
            worker.addEventListener('message', e => {
                const { data, type } = e.data;
                switch (type) {
                    case WORKER_MESSAGES.VIDEO_BUFFER:
                        setVideoBuffer(data);
                        break;
                }
            });
        }
    }, []);

    return <CRT videoBuffer={videoBuffer} />;
};
