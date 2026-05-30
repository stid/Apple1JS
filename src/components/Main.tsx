import React from 'react';
import App from './App';
import { IInspectableComponent } from '../core/types';
import { APP_VERSION } from '../version';
import { designTokens } from '../styles/tokens';
import type { WorkerManager } from '../services/WorkerManager';

interface MainProps {
    workerManager: WorkerManager;
    apple1Instance: IInspectableComponent | null;
}

const Main: React.FC<MainProps> = ({ workerManager, apple1Instance }) => {
    return (
        <div className="w-full h-screen flex flex-col overflow-hidden">
            <header
                className="shrink-0 w-full bg-surface-primary border-b border-border-primary py-md px-lg flex items-center justify-between"
                // Token md shadow; Tailwind's default shadow-md differs slightly.
                style={{ boxShadow: designTokens.boxShadow.md }}
            >
                <h1 className="text-base font-mono font-medium tracking-wide text-text-accent">
                    Apple 1 :: JS Emulator <span className="text-text-secondary font-normal">- by =stid=</span>{' '}
                    <span className="text-xs font-mono text-text-muted">v{APP_VERSION}</span>
                </h1>
            </header>
            <div className="flex-1 flex overflow-hidden min-h-0 py-lg">
                <App workerManager={workerManager} apple1Instance={apple1Instance} />
            </div>
        </div>
    );
};

export default Main;
