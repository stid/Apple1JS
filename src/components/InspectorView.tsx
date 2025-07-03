import React, { useEffect, useState, memo } from 'react';
import { IInspectableComponent } from '../core/@types/IInspectableComponent';
import { WORKER_MESSAGES, DebugData } from '../apple1/TSTypes';

import type { InspectableArchView } from '../core/@types/InspectableArchView';

interface InspectorViewProps {
    root: IInspectableComponent;
    worker?: Worker;
}

const InspectorView: React.FC<InspectorViewProps> = ({ root, worker }) => {
    const [debugInfo, setDebugInfo] = useState<DebugData>({});

    // Set up an interval to request debug information from the worker.
    useEffect(() => {
        if (!worker) return;
        
        const interval = setInterval(() => {
            worker.postMessage({ data: '', type: WORKER_MESSAGES.DEBUG_INFO });
        }, 600);
        return () => clearInterval(interval);
    }, [worker]);

    // Listen for messages from the worker and update the debugInfo state.
    useEffect(() => {
        if (!worker) return;
        
        const handleMessage = (e: MessageEvent<{ data: DebugData | number[]; type: WORKER_MESSAGES }>) => {
            const { data, type } = e.data;
            if (type === WORKER_MESSAGES.DEBUG_INFO) {
                setDebugInfo(data as DebugData);
            }
        };

        worker.addEventListener('message', handleMessage);
        return () => worker.removeEventListener('message', handleMessage);
    }, [worker]);

    // Type guard for children property
    function hasChildren(node: InspectableArchView): node is InspectableArchView & { children: InspectableArchView[] } {
        return Array.isArray((node as Record<string, unknown>).children);
    }

    // Use getInspectable() for architecture view
    const archRoot: InspectableArchView =
        typeof root.getInspectable === 'function' ? root.getInspectable() : (root as unknown as InspectableArchView);

    // Color legend (should match InspectorGraph)
    const colorLegend: Record<string, string> = {
        RAM: '#6cf',
        ROM: '#fc6',
        Bus: '#9f9',
        CPU: '#f99',
        PIA6820: '#f6c',
        IoComponent: '#cff',
        default: '#fff',
    };

    // Render only the architecture tree view, with columns for readability
    function renderArchTreeTable(node: InspectableArchView, depth = 0, seen = new Map()): React.ReactNode[] {
        // Deduplicate by id, but prefer the node with more config fields
        const configKeys = Object.keys(node).filter(
            (key) =>
                !['id', 'type', 'name', 'children', 'mapping'].includes(key) &&
                typeof node[key] !== 'object' &&
                typeof node[key] !== 'function',
        );
        const prev = seen.get(node.id);
        if (prev) {
            const prevConfigKeys = prev.configKeys || [];
            if (configKeys.length > prevConfigKeys.length) {
                seen.set(node.id, { node, configKeys });
            } else {
                return [];
            }
        } else {
            seen.set(node.id, { node, configKeys });
        }

        // Extract config fields
        const configObj: Record<string, unknown> = {};
        for (const key in node) {
            if (
                key !== 'id' &&
                key !== 'type' &&
                key !== 'name' &&
                key !== 'children' &&
                key !== 'mapping' &&
                typeof node[key] !== 'object' &&
                typeof node[key] !== 'function'
            ) {
                configObj[key] = node[key];
            }
        }
        const filteredConfigEntries = Object.entries(configObj).filter(([, v]) => v !== undefined && v !== null);
        const configCell =
            filteredConfigEntries.length > 0 ? (
                <table className="text-xs text-green-300">
                    <tbody>
                        {filteredConfigEntries.map(([k, v]) => (
                            <tr key={k}>
                                <td className="pr-2 align-top" style={{ fontWeight: 600 }}>
                                    {k}:
                                </td>
                                <td className="align-top">{String(v)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <span className="text-neutral-500 italic">No config</span>
            );
        const row = (
            <tr
                key={node.id}
                className={`border-b border-neutral-700 last:border-b-0 transition-colors duration-100 hover:bg-green-950/40 ${depth % 2 === 0 ? 'bg-neutral-900' : 'bg-neutral-950'}`}
            >
                <td
                    className="px-3 py-2 text-green-200 font-bold align-top"
                    style={{
                        color: colorLegend[node.type] || colorLegend.default,
                        fontWeight: 'bold',
                        paddingLeft: 8,
                        letterSpacing: 0.5,
                        position: 'relative',
                    }}
                >
                    {depth > 0 && (
                        <span
                            style={{
                                display: 'inline-block',
                                width: 18 * depth,
                                marginRight: 4,
                                borderLeft: '2px solid #333',
                                height: '100%',
                                verticalAlign: 'middle',
                            }}
                        />
                    )}
                    {depth > 0 ? <span style={{ marginRight: 4 }}>{'└─'}</span> : null}
                    {node.type}
                </td>
                <td className="px-3 py-2 text-green-100 font-mono align-top opacity-90">{node.id}</td>
                <td className="px-3 py-2 text-green-300 align-top">
                    {node.name || <span className="opacity-40 italic">(unnamed)</span>}
                </td>
                <td className="px-3 py-2 align-top">
                    <div className="rounded bg-neutral-800/80 border border-neutral-700 px-2 py-1 text-xs font-mono text-green-300 max-w-xs whitespace-pre-wrap break-all">
                        {configCell}
                    </div>
                </td>
            </tr>
        );
        let childrenRows: React.ReactNode[] = [];
        if (hasChildren(node) && node.children.length > 0) {
            childrenRows = node.children.flatMap((child) => renderArchTreeTable(child, depth + 1, seen));
        }
        return [row, ...childrenRows];
    }

    // Debug domain components (from Debugger component)
    const DebugDomain = ({ domainKey, domainData }: { domainKey: string; domainData: { [key: string]: string | number | boolean } }) => (
        <div className="bg-neutral-900 rounded-xl px-2 pt-0 pb-1 md:px-3 md:pt-1 md:pb-1 shadow border border-slate-700 min-w-[180px] max-w-xs">
            <DomainTitle title={domainKey} />
            <DomainContent domainData={domainData} />
        </div>
    );

    const DomainTitle = ({ title }: { title: string }) => (
        <div className="font-bold mb-2 text-slate-100 text-base tracking-wide border-b border-slate-700 pb-1 uppercase">
            {title}
        </div>
    );

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

    const DebugDomainItem = memo(({ label, value }: { label: string; value: string | number | boolean }) => {
        return (
            <tr>
                <td className="pr-2 text-slate-400">{label}</td>
                <td className="text-green-300 font-semibold">{String(value)}</td>
            </tr>
        );
    });
    DebugDomainItem.displayName = 'DebugDomainItem';

    // Check if we have debug info
    const hasDebugDomains = Object.keys(debugInfo).length > 0;

    return (
        <div className="p-4 space-y-6">
            {/* Architecture Section */}
            <div className="bg-black/80 rounded-xl border border-neutral-700 shadow-lg p-4">
                <div className="flex gap-2 mb-4">
                    <span className="px-3 py-1 rounded bg-green-700 text-white font-semibold tracking-wide">
                        Architecture
                    </span>
                </div>
                <div className="mb-4">
                    <h2 className="text-lg font-bold mb-2 text-green-200">Architecture Tree</h2>
                    <div className="overflow-x-auto">
                        <table className="text-sm border border-neutral-700 rounded w-full bg-neutral-950">
                            <thead>
                                <tr className="text-green-300 bg-neutral-800">
                                    <th className="px-3 py-2 border-b border-neutral-700 text-left">Type</th>
                                    <th className="px-3 py-2 border-b border-neutral-700 text-left">ID</th>
                                    <th className="px-3 py-2 border-b border-neutral-700 text-left">Name</th>
                                    <th className="px-3 py-2 border-b border-neutral-700 text-left">Config</th>
                                </tr>
                            </thead>
                            <tbody>{renderArchTreeTable(archRoot)}</tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Debug Information Section */}
            {worker && (
                <div className="bg-black/80 rounded-xl border border-neutral-700 shadow-lg p-4">
                    <div className="flex gap-2 mb-4">
                        <span className="px-3 py-1 rounded bg-blue-700 text-white font-semibold tracking-wide">
                            Real-time Debug
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-6 text-sm min-h-[120px]">
                        {hasDebugDomains ? (
                            Object.keys(debugInfo)
                                .sort()
                                .map((key) => <DebugDomain key={key} domainKey={key} domainData={debugInfo[key]} />)
                        ) : (
                            <div className="italic text-slate-500 px-4 py-6 md:px-8 md:py-8">No debug info available</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default InspectorView;
