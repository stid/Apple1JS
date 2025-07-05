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
            <header className="flex-none w-full bg-surface-primary border-b border-border-primary shadow-lg py-md px-lg flex items-center justify-between">
                <h1 className="text-text-accent font-medium text-lg tracking-wide">
                    Apple 1 :: JS Emulator <span className="text-text-secondary font-normal">- by =stid=</span>{' '}
                    <span className="text-text-muted font-mono text-sm">v{APP_VERSION}</span>
                </h1>
            </header>
            <div className="flex-1 lg:overflow-hidden">
                <App worker={worker} apple1Instance={apple1Instance} />
            </div>
        </div>
    );
};

export default Main;
