import React from 'react';

export type ActionsProps = {
    onReset: React.MouseEventHandler<HTMLAnchorElement>;
    onBS: React.MouseEventHandler<HTMLAnchorElement>;
    onShowDebug: React.MouseEventHandler<HTMLAnchorElement>;
    supportBS: boolean;
    showDebug: boolean;
};

const Actions = ({ onReset, onBS, supportBS, showDebug, onShowDebug }: ActionsProps) => (
    <nav className="flex flex-wrap gap-2 justify-center my-4">
        <a
            onClick={onReset}
            href="#"
            className="inline-block px-4 py-1 rounded-full bg-black/70 border border-green-700 text-green-400 font-mono text-xs tracking-wide transition hover:bg-green-900/60 hover:text-green-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
            tabIndex={0}
        >
            RESET
        </a>
        <a
            onClick={onBS}
            href="#"
            className="inline-block px-4 py-1 rounded-full bg-black/70 border border-green-700 text-green-400 font-mono text-xs tracking-wide transition hover:bg-green-900/60 hover:text-green-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
            tabIndex={0}
        >
            SUPOPRT BACKSPACE [{supportBS ? 'ON' : 'OFF'}]
        </a>
        <a
            onClick={onShowDebug}
            href="#"
            className="inline-block px-4 py-1 rounded-full bg-black/70 border border-green-700 text-green-400 font-mono text-xs tracking-wide transition hover:bg-green-900/60 hover:text-green-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
            tabIndex={0}
        >
            {showDebug ? 'HIDE DEBUG' : 'SHOW DEBUG'}
        </a>
    </nav>
);

export default Actions;
