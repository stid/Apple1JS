import React, { useState } from 'react';
import InspectorView from './InspectorView';
import App from './App';
import { IInspectableComponent } from '../core/@types/IInspectableComponent';

interface MainProps {
    worker: Worker;
    apple1Instance: IInspectableComponent | null;
}

const Main: React.FC<MainProps> = ({ worker, apple1Instance }) => {
    const [tab, setTab] = useState<'emulator' | 'inspector'>('emulator');

    return (
        <div className="w-full h-full">
            <nav className="flex gap-2 mb-2">
                <button
                    className={`px-3 py-1 rounded ${tab === 'emulator' ? 'bg-green-700 text-white' : 'bg-neutral-800 text-green-300'}`}
                    onClick={() => setTab('emulator')}
                >
                    Emulator
                </button>
                <button
                    className={`px-3 py-1 rounded ${tab === 'inspector' ? 'bg-green-700 text-white' : 'bg-neutral-800 text-green-300'}`}
                    onClick={() => setTab('inspector')}
                >
                    Inspector
                </button>
            </nav>
            {tab === 'emulator' && <App worker={worker} />}
            {tab === 'inspector' && apple1Instance && <InspectorView root={apple1Instance} />}
            {tab === 'inspector' && !apple1Instance && (
                <div className="p-4 text-red-400">Inspector not connected to Apple1 instance.</div>
            )}
        </div>
    );
};

export default Main;
