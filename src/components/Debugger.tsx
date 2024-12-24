import { useEffect, useState, memo, JSX } from 'react';
import { WORKER_MESSAGES, DebugData } from '../apple1/TSTypes';

// The Debugger component is responsible for displaying debug information
// received from a Web Worker.
const Debugger = ({ worker }: { worker: Worker }): JSX.Element => {
    const [debugInfo, setDebugInfo] = useState<DebugData>({});

    // Set up an interval to request debug information from the worker.
    useEffect(() => {
        const interval = setInterval(() => {
            worker.postMessage({ data: '', type: WORKER_MESSAGES.DEBUG_INFO });
        }, 600);
        return () => clearInterval(interval);
    }, [worker]);

    // Listen for messages from the worker and update the debugInfo state.
    useEffect(() => {
        const handleMessage = (e: MessageEvent<{ data: DebugData | number[]; type: WORKER_MESSAGES }>) => {
            const { data, type } = e.data;
            if (type === WORKER_MESSAGES.DEBUG_INFO) {
                setDebugInfo(data as DebugData);
            }
        };

        worker.addEventListener('message', handleMessage);
        return () => worker.removeEventListener('message', handleMessage);
    }, [worker]);

    return (
        <div className="flex flex-wrap space-x-4 text-sm pl-4">
            {Object.keys(debugInfo).map((key) => (
                <DebugDomain key={key} domainKey={key} domainData={debugInfo[key]} />
            ))}
        </div>
    );
};

interface DebugDomainProps {
    domainKey: string;
    domainData: { [key: string]: string | number | boolean };
}

// The DebugDomain component displays a domain of debug information.
const DebugDomain = ({ domainKey, domainData }: DebugDomainProps) => (
    <div className="bg-gray-100 rounded p-4 shadow-md">
        <DomainTitle title={domainKey} />
        <DomainContent domainData={domainData} />
    </div>
);

// The DomainTitle component displays the title for a domain.
const DomainTitle = ({ title }: { title: string }) => <div className="font-bold mb-2">{title}</div>;

// The DomainContent component displays the content for a domain.
const DomainContent = ({ domainData }: { domainData: { [key: string]: string | number | boolean } }) => (
    <div className="text-gray-700">
        {Object.keys(domainData).map((key) => (
            <DebugDomainItem key={key} label={key} value={domainData[key]} />
        ))}
    </div>
);

// The DebugDomainItem component displays a single key-value pair in a domain.
const DebugDomainItem = memo(({ label, value }: { label: string; value: string | number | boolean }) => {
    return <div className="mb-1">{`${label}: ${value}`}</div>;
});
DebugDomainItem.displayName = 'DebugDomainItem';

export default Debugger;
