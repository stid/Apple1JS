import React from 'react';
import App from './App';
import { IInspectableComponent } from '../core/@types/IInspectableComponent';
import { APP_VERSION } from '../version';

interface MainProps {
    worker: Worker;
    apple1Instance: IInspectableComponent | null;
}

const Main: React.FC<MainProps> = ({ worker, apple1Instance }) => {
    return (
        <div className="w-full h-full">
            <header className="w-full bg-black/90 border-b border-green-800 shadow-lg mb-2 py-2 px-4 flex items-center justify-between">
                <h1 className="text-green-300 font-bold text-lg tracking-wide">
                    Apple 1 :: JS Emulator <span className="text-green-500 font-normal">- by =stid=</span>{' '}
                    <span className="text-green-700 font-mono">v{APP_VERSION}</span>
                </h1>
            </header>
            <App worker={worker} apple1Instance={apple1Instance} />
        </div>
    );
};

export default Main;
