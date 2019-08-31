import React from 'react';

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
                    case 'VideoBuffer':
                        setVideoBuffer(data);
                        break;
                }
            });
        }
    }, []);

    return (
        <pre style={{ font: '"Courier New", Courier, monospace' }}>
            {videoBuffer.map(line => `${line.join('')}\n`)}{' '}
        </pre>
    );
};
