import React from 'react';
import { IInspectableComponent } from '../core/@types/IInspectableComponent';

interface TreeProps {
    node: IInspectableComponent;
}

const InspectTree: React.FC<TreeProps> = ({ node }) => {
    return (
        <ul>
            <li>
                <strong>{node.type}</strong> <span style={{ color: '#888' }}>({node.id})</span>
                {node.children && node.children.length > 0 && (
                    <ul style={{ marginLeft: 16 }}>
                        {node.children.map((child) => (
                            <InspectTree key={child.id} node={child} />
                        ))}
                    </ul>
                )}
            </li>
        </ul>
    );
};

export default InspectTree;
