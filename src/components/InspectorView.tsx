import React, { useState } from 'react';
import InspectTree from './InspectTree';
import InspectorGraph from './InspectorGraph';
import { IInspectableComponent } from '../core/@types/IInspectableComponent';

interface InspectorViewProps {
    root: IInspectableComponent;
}

const InspectorView: React.FC<InspectorViewProps> = ({ root }) => {
    const [view, setView] = useState<'tree' | 'graph'>('tree');
    return (
        <div className="p-4 bg-black/80 rounded-xl border border-neutral-700">
            <div className="flex gap-2 mb-2">
                <button
                    className={`px-3 py-1 rounded ${view === 'tree' ? 'bg-green-700 text-white' : 'bg-neutral-800 text-green-300'}`}
                    onClick={() => setView('tree')}
                >
                    Tree View
                </button>
                <button
                    className={`px-3 py-1 rounded ${view === 'graph' ? 'bg-green-700 text-white' : 'bg-neutral-800 text-green-300'}`}
                    onClick={() => setView('graph')}
                >
                    Graph View
                </button>
            </div>
            <h2 className="text-lg font-bold mb-2">Hardware Composition</h2>
            {view === 'tree' ? <InspectTree node={root} /> : <InspectorGraph root={root} />}
        </div>
    );
};

export default InspectorView;
