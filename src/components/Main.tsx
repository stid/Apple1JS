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
        <div className="w-full min-h-screen lg:h-screen flex flex-col lg:overflow-hidden">
            <header className="flex-none w-full bg-black/90 border-b border-green-800 shadow-lg py-2 px-4 flex items-center justify-between">
                <h1 className="text-green-300 font-bold text-lg tracking-wide">
                    Apple 1 :: JS Emulator <span className="text-green-500 font-normal">- by =stid=</span>{' '}
                    <span className="text-green-700 font-mono">v{APP_VERSION}</span>
                </h1>
            </header>
            <div className="flex-1 lg:overflow-hidden">
                <App worker={worker} apple1Instance={apple1Instance} />
            </div>
        </div>
    );
};

export default Main;
