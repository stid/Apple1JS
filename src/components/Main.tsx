import React, { useState } from 'react';
import InspectorView from './InspectorView';
import App from './App';
import { IInspectableComponent } from '../core/@types/IInspectableComponent';
import { APP_VERSION } from '../version';

interface MainProps {
    worker: Worker;
    apple1Instance: IInspectableComponent | null;
}

const Main: React.FC<MainProps> = ({ worker, apple1Instance }) => {
    const [tab, setTab] = useState<'emulator' | 'inspector'>('emulator');

    return (
        <div className="w-full h-full">
            <header className="w-full bg-black/90 border-b border-green-800 shadow-lg mb-2 py-2 px-4 flex items-center justify-between">
                <h1 className="text-green-300 font-bold text-lg tracking-wide">
                    Apple 1 :: JS Emulator <span className="text-green-500 font-normal">- by =stid=</span>{' '}
                    <span className="text-green-700 font-mono">v{APP_VERSION}</span>
                </h1>
            </header>
            <nav className="flex gap-2 mb-2 px-4">
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
            {/* Always mount both, toggle visibility */}
            <div style={{ display: tab === 'emulator' ? 'block' : 'none', width: '100%', height: '100%' }}>
                <App worker={worker} />
            </div>
            <div style={{ display: tab === 'inspector' ? 'block' : 'none', width: '100%', height: '100%' }}>
                {apple1Instance ? (
                    <InspectorView root={apple1Instance} worker={worker} />
                ) : (
                    <div className="p-4 text-red-400">Inspector not connected to Apple1 instance.</div>
                )}
            </div>
        </div>
    );
};

export default Main;
