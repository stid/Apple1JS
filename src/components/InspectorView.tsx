import React from 'react';
import InspectTree from './InspectTree';
import { IInspectableComponent } from '../core/@types/IInspectableComponent';

interface InspectorViewProps {
    root: IInspectableComponent;
}

const InspectorView: React.FC<InspectorViewProps> = ({ root }) => {
    return (
        <div className="p-4 bg-black/80 rounded-xl border border-neutral-700">
            <h2 className="text-lg font-bold mb-2">Hardware Composition</h2>
            <InspectTree node={root} />
        </div>
    );
};

export default InspectorView;
