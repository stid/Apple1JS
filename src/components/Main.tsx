import React from 'react';
import App from './App';
import { APP_VERSION } from '../version';
import type { WorkerManager } from '../services/WorkerManager';

interface MainProps {
    workerManager: WorkerManager;
}

const Main: React.FC<MainProps> = ({ workerManager }) => {
    return (
        <div className="w-full h-screen flex flex-col overflow-hidden">
            <header className="shrink-0 w-full bg-surface-secondary border-b border-border-primary h-11 px-md flex items-center justify-between gap-md">
                <div className="flex items-baseline gap-sm min-w-0">
                    <h1 className="text-base font-semibold tracking-tight text-text-primary whitespace-nowrap">
                        <span className="font-mono text-success mr-xs" aria-hidden="true">
                            ❯
                        </span>
                        apple1js
                    </h1>
                    <span className="font-mono text-xs text-text-tertiary truncate">
                        apple-1 emulator · 6502 · by stid
                    </span>
                </div>
                <div className="flex items-center gap-md flex-none">
                    <a
                        href="https://github.com/stid/Apple1JS"
                        className="font-mono text-xs"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        github
                    </a>
                    <span className="badge bg-surface-primary border-border-secondary text-text-secondary">
                        v{APP_VERSION}
                    </span>
                </div>
            </header>
            <div className="flex-1 flex overflow-hidden min-h-0">
                <App workerManager={workerManager} />
            </div>
        </div>
    );
};

export default Main;
