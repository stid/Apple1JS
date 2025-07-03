import React, { useEffect, useState } from 'react';
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

    // Helper function to get debug data for a component based on its type and id
    const getDebugDataForComponent = (node: InspectableArchView): Record<string, string | number | boolean> => {
        if (!debugInfo || Object.keys(debugInfo).length === 0) return {};
        
        // Map component types to debug domains
        const typeToDebugDomain: Record<string, string> = {
            'CPU': 'cpu',
            'PIA6820': 'pia', 
            'Bus': 'Bus',
            'Clock': 'clock'
        };
        
        const debugDomain = typeToDebugDomain[node.type];
        if (!debugDomain || !debugInfo[debugDomain]) return {};
        
        const domainData = debugInfo[debugDomain];
        
        // For CPU, flatten REG and HW data
        if (debugDomain === 'cpu' && typeof domainData === 'object') {
            const result: Record<string, string | number | boolean> = {};
            Object.entries(domainData).forEach(([key, value]) => {
                if (typeof value === 'object' && value !== null) {
                    // Flatten nested objects like REG and HW
                    Object.entries(value).forEach(([subKey, subValue]) => {
                        result[`${key}_${subKey}`] = subValue as string | number | boolean;
                    });
                } else {
                    result[key] = value as string | number | boolean;
                }
            });
            return result;
        }
        
        return domainData as Record<string, string | number | boolean>;
    };

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
        
        // Add debug data for this component if available
        const debugData = getDebugDataForComponent(node);
        const combinedConfig = { ...configObj, ...debugData };
        
        const filteredConfigEntries = Object.entries(combinedConfig).filter(([, v]) => v !== undefined && v !== null);
        const configCell =
            filteredConfigEntries.length > 0 ? (
                <table className="text-xs text-green-300 table-fixed">
                    <tbody>
                        {filteredConfigEntries.map(([k, v]) => {
                            // Check if this is debug data (from live debug info)
                            const isDebugData = k in debugData;
                            // Format value with fixed width for common numeric fields
                            const formattedValue = formatValue(k, v as string | number | boolean);
                            return (
                                <tr key={k}>
                                    <td className="pr-2 align-top" style={{ fontWeight: 600, minWidth: '80px' }}>
                                        {k}:
                                    </td>
                                    <td className={`align-top font-mono ${isDebugData ? 'text-blue-300 font-semibold' : ''}`}
                                        style={{ minWidth: '100px' }}>
                                        {formattedValue}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            ) : (
                <span className="text-neutral-500 italic">No config</span>
            );
        
        // Helper function to format values with consistent width
        function formatValue(key: string, value: string | number | boolean): string {
            const strValue = String(value);
            
            // For known numeric fields that can vary in length, pad them
            if (key === 'drift' || key === 'actualFrequency') {
                // For drift percentage and frequency, ensure consistent decimal places
                if (typeof value === 'number') {
                    return value.toFixed(2).padStart(8, ' ');
                }
            }
            
            // For hex values, ensure consistent width
            if (strValue.startsWith('0x')) {
                return strValue.padStart(6, ' ');
            }
            
            // For large numbers, add thousand separators for readability
            if (typeof value === 'number' && value > 999) {
                return value.toLocaleString().padStart(10, ' ');
            }
            
            return strValue;
        }
        const row = (
            <tr
                key={node.id}
                className={`border-b border-neutral-700 last:border-b-0 transition-colors duration-100 hover:bg-green-950/40 ${depth % 2 === 0 ? 'bg-neutral-900' : 'bg-neutral-950'}`}
            >
                <td
                    className="px-2 py-1 text-green-200 font-bold align-top"
                    style={{
                        color: colorLegend[node.type] || colorLegend.default,
                        fontWeight: 'bold',
                        paddingLeft: 6,
                        letterSpacing: 0.3,
                        position: 'relative',
                    }}
                >
                    {depth > 0 && (
                        <span
                            style={{
                                display: 'inline-block',
                                width: 12 * depth,
                                marginRight: 2,
                                borderLeft: '1px solid #333',
                                height: '100%',
                                verticalAlign: 'middle',
                            }}
                        />
                    )}
                    {depth > 0 ? <span style={{ marginRight: 2 }}>{'└─'}</span> : null}
                    {node.type}
                </td>
                <td className="px-2 py-1 text-green-100 font-mono align-top opacity-90 text-xs">{node.id}</td>
                <td className="px-2 py-1 text-green-300 align-top text-xs">
                    {node.name || <span className="opacity-40 italic">(unnamed)</span>}
                </td>
                <td className="px-2 py-1 align-top">
                    <div className="rounded bg-neutral-800/80 border border-neutral-700 px-1 py-1 text-xs font-mono text-green-300 max-w-xs whitespace-pre-wrap break-all">
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

    return (
        <div className="flex flex-col lg:h-full lg:overflow-hidden">
            <div className="lg:flex-1 lg:overflow-auto bg-black border-t border-slate-800 rounded-xl px-4 py-4">
                <table className="text-xs border border-neutral-700 rounded w-full bg-neutral-950">
                    <thead className="lg:sticky lg:top-0 lg:z-10 bg-neutral-800">
                        <tr className="text-green-300">
                            <th className="px-2 py-1 border-b border-neutral-700 text-left bg-neutral-800">Type</th>
                            <th className="px-2 py-1 border-b border-neutral-700 text-left bg-neutral-800">ID</th>
                            <th className="px-2 py-1 border-b border-neutral-700 text-left bg-neutral-800">Name</th>
                            <th className="px-2 py-1 border-b border-neutral-700 text-left bg-neutral-800">Config & Live Data</th>
                        </tr>
                    </thead>
                    <tbody>{renderArchTreeTable(archRoot)}</tbody>
                </table>
            </div>
        </div>
    );
};

export default InspectorView;
