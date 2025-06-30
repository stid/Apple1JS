import React, { useState } from 'react';
// import InspectorGraph from './InspectorGraph';
import { IInspectableComponent } from '../core/@types/IInspectableComponent';

interface InspectorViewProps {
    root: IInspectableComponent;
}

const InspectorView: React.FC<InspectorViewProps> = ({ root }) => {
    // Only architecture view is available
    const [view] = useState<'arch'>('arch');

    // Helper: recursively collect unique component types and counts
    function collectTypesUnique(node: IInspectableComponent, acc: Record<string, number>, seen: WeakSet<object>) {
        if (typeof node === 'object' && node !== null) {
            if (seen.has(node)) return acc;
            seen.add(node);
        }
        acc[node.type] = (acc[node.type] || 0) + 1;
        if (node.children) {
            node.children.forEach((child) => collectTypesUnique(child, acc, seen));
        }
        return acc;
    }
    const typeCounts = collectTypesUnique(root, {}, new WeakSet());

    // Helper: collect summary table (type, id, name, address), unique by object reference
    type SummaryRow = { type: string; id: string; name?: string; address?: string };
    function collectSummaryUnique(node: IInspectableComponent, arr: SummaryRow[], seen: WeakSet<object>) {
        if (typeof node === 'object' && node !== null) {
            if (seen.has(node)) return arr;
            seen.add(node);
        }
        const entry: SummaryRow = {
            type: node.type,
            id: node.id,
        };
        // Use type guards for name and __address
        if (
            Object.prototype.hasOwnProperty.call(node, 'name') &&
            typeof (node as unknown as { name?: unknown }).name === 'string'
        ) {
            entry.name = (node as unknown as { name: string }).name;
        }
        if (
            Object.prototype.hasOwnProperty.call(node, '__address') &&
            typeof (node as unknown as { __address?: unknown }).__address === 'string'
        ) {
            entry.address = (node as unknown as { __address: string }).__address;
        }
        arr.push(entry);
        if (node.children) {
            node.children.forEach((child) => collectSummaryUnique(child, arr, seen));
        }
        return arr;
    }
    const summaryRows = collectSummaryUnique(root, [], new WeakSet());

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

    return (
        <div className="p-4 bg-black/80 rounded-xl border border-neutral-700">
            <div className="flex gap-2 mb-2">
                <span className="px-3 py-1 rounded bg-green-700 text-white">Architecture</span>
            </div>
            {view === 'arch' && (
                <div className="mb-4">
                    <h2 className="text-lg font-bold mb-2">Architecture Overview</h2>
                    <div className="flex flex-wrap gap-4 mb-4">
                        {Object.entries(typeCounts).map(([type, count]) => (
                            <div key={type} className="flex items-center gap-2">
                                <span
                                    style={{
                                        display: 'inline-block',
                                        width: 18,
                                        height: 18,
                                        background: colorLegend[type] || colorLegend.default,
                                        borderRadius: 4,
                                        border: '1px solid #333',
                                    }}
                                />
                                <span className="font-mono text-green-200">{type}</span>
                                <span className="text-neutral-400">x{count}</span>
                            </div>
                        ))}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="text-sm border border-neutral-700 rounded w-full bg-neutral-900">
                            <thead>
                                <tr className="text-green-300">
                                    <th className="px-2 py-1 border-b border-neutral-700">Type</th>
                                    <th className="px-2 py-1 border-b border-neutral-700">ID</th>
                                    <th className="px-2 py-1 border-b border-neutral-700">Name</th>
                                    <th className="px-2 py-1 border-b border-neutral-700">Address</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summaryRows.map((row, i) => (
                                    <tr key={row.type + '-' + row.id + '-' + i}>
                                        <td
                                            className="px-2 py-1"
                                            style={{ color: colorLegend[row.type] || colorLegend.default }}
                                        >
                                            {row.type}
                                        </td>
                                        <td className="px-2 py-1 text-green-100">{row.id}</td>
                                        <td className="px-2 py-1 text-green-200">{row.name || ''}</td>
                                        <td className="px-2 py-1 text-green-300">{row.address || ''}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {/* Graph view removed */}
        </div>
    );
};

export default InspectorView;
