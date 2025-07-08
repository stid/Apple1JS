import React from 'react';
import { IInspectableComponent } from '../core/types';
import { Formatters } from '../utils/formatters';

type Addressable = {
    __address?: string;
    __addressRange?: [number, number];
    __addressName?: string;
    data?: Uint8Array;
};

// Removed unused TreeProps and BusMappingEntry to fix lint errors

// Add a path prop to ensure unique keys for each node
const InspectTree: React.FC<{ node: IInspectableComponent; path?: string }> = ({ node, path = '' }) => {
    const nodePath = path ? `${path}/${node.id}` : node.id;

    // Extra info for known types
    let extra: React.ReactNode = null;

    // RAM: show size and address if available
    if (node.type === 'RAM' && 'data' in node && node.data instanceof Uint8Array) {
        const addrNode = node as Addressable;
        extra = (
            <span style={{ color: '#6cf', marginLeft: 8 }}>
                size: {node.data.length} bytes
                {addrNode.__address && `, addr: ${addrNode.__address}`}
            </span>
        );
    }
    // ROM: show size and address if available
    if (node.type === 'ROM' && 'data' in node && node.data instanceof Uint8Array) {
        const addrNode = node as Addressable;
        extra = (
            <span style={{ color: '#fc6', marginLeft: 8 }}>
                size: {node.data.length} bytes
                {addrNode.__address && `, addr: ${addrNode.__address}`}
            </span>
        );
    }
    // Bus: show mapping
    if (node.type === 'Bus' && 'busMapping' in node && Array.isArray(node.busMapping)) {
        extra = (
            <span style={{ color: '#9f9', marginLeft: 8 }}>
                mapping: [
                {(node.busMapping as Array<{ addr: [number, number]; component: unknown; name: string }>).map(
                    (b, i) => (
                        <span key={i} style={{ marginLeft: 4 }}>
                            {b.name}: [{Formatters.hex(b.addr[0], 0)}:{Formatters.hex(b.addr[1], 0)}]
                        </span>
                    ),
                )}
                ]
            </span>
        );
    }

    return (
        <ul>
            <li>
                <strong>{node.type}</strong> <span style={{ color: '#888' }}>({node.id})</span> {extra}
                {node.children && node.children.length > 0 && (
                    <ul style={{ marginLeft: 16 }}>
                        {node.children.map((child, idx) => (
                            <InspectTree key={nodePath + '-' + idx} node={child} path={nodePath + '-' + idx} />
                        ))}
                    </ul>
                )}
            </li>
        </ul>
    );
};

export default InspectTree;
