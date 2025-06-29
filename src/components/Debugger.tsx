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

    // Show a friendly empty state if no debug info
    const hasDomains = Object.keys(debugInfo).length > 0;
    return (
        <div className="flex flex-wrap gap-6 text-sm px-4 py-6 md:px-8 md:py-8 bg-black border-t border-slate-800 min-h-[120px] rounded-xl">
            {hasDomains ? (
                Object.keys(debugInfo)
                    .sort()
                    .map((key) => <DebugDomain key={key} domainKey={key} domainData={debugInfo[key]} />)
            ) : (
                <div className="italic text-slate-500 px-4 py-6 md:px-8 md:py-8">No debug info available</div>
            )}
        </div>
    );
};

interface DebugDomainProps {
    domainKey: string;
    domainData: { [key: string]: string | number | boolean };
}

// The DebugDomain component displays a domain of debug information.
const DebugDomain = ({ domainKey, domainData }: DebugDomainProps) => (
    <div className="bg-neutral-900 rounded-xl px-2 pt-0 pb-1 md:px-3 md:pt-1 md:pb-1 shadow border border-slate-700 min-w-[180px] max-w-xs">
        <DomainTitle title={domainKey} />
        <DomainContent domainData={domainData} />
    </div>
);

// The DomainTitle component displays the title for a domain.
const DomainTitle = ({ title }: { title: string }) => (
    <div className="font-bold mb-2 text-slate-100 text-base tracking-wide border-b border-slate-700 pb-1 uppercase">
        {title}
    </div>
);

// The DomainContent component displays the content for a domain.
const DomainContent = ({ domainData }: { domainData: { [key: string]: string | number | boolean } }) => (
    <table className="w-full text-xs font-mono text-left mt-2">
        <tbody>
            {Object.keys(domainData)
                .sort()
                .map((key) => (
                    <DebugDomainItem key={key} label={key} value={domainData[key]} />
                ))}
        </tbody>
    </table>
);

// The DebugDomainItem component displays a single key-value pair in a domain.
const DebugDomainItem = memo(({ label, value }: { label: string; value: string | number | boolean }) => {
    return (
        <tr>
            <td className="pr-2 text-slate-400">{label}</td>
            <td className="text-green-300 font-semibold">{String(value)}</td>
        </tr>
    );
});
DebugDomainItem.displayName = 'DebugDomainItem';

export default Debugger;
