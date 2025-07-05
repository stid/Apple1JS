import React from 'react';

export type ActionsProps = {
    onReset: React.MouseEventHandler<HTMLAnchorElement>;
    onBS: React.MouseEventHandler<HTMLAnchorElement>;
    supportBS: boolean;
    onSaveState: React.MouseEventHandler<HTMLAnchorElement>;
    onLoadState: React.ChangeEventHandler<HTMLInputElement>;
    onPauseResume: React.MouseEventHandler<HTMLAnchorElement>;
    isPaused: boolean;
    onRefocus: () => void;
    onCycleAccurateTiming: React.MouseEventHandler<HTMLAnchorElement>;
    cycleAccurateTiming: boolean;
};

const Actions = ({ onReset, onBS, supportBS, onSaveState, onLoadState, onPauseResume, isPaused, onRefocus, onCycleAccurateTiming, cycleAccurateTiming }: ActionsProps) => (
    <nav className="flex flex-wrap gap-2 justify-center my-4">
        <a
            onClick={(e) => {
                onReset(e);
                onRefocus();
            }}
            href="#"
            className="inline-block px-4 py-1 rounded-full bg-black/70 border border-green-700 text-green-400 font-mono text-xs tracking-wide transition hover:bg-green-900/60 hover:text-green-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
            tabIndex={0}
        >
            RESET
        </a>
        <a
            onClick={(e) => {
                onBS(e);
                onRefocus();
            }}
            href="#"
            className="inline-block px-4 py-1 rounded-full bg-black/70 border border-green-700 text-green-400 font-mono text-xs tracking-wide transition hover:bg-green-900/60 hover:text-green-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
            tabIndex={0}
        >
            SUPPORT BACKSPACE [{supportBS ? 'ON' : 'OFF'}]
        </a>
        <a
            onClick={(e) => {
                onSaveState(e);
                onRefocus();
            }}
            href="#"
            className="inline-block px-4 py-1 rounded-full bg-black/70 border border-blue-700 text-blue-400 font-mono text-xs tracking-wide transition hover:bg-blue-900/60 hover:text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
            tabIndex={0}
        >
            SAVE STATE
        </a>
        <label
            className="inline-block px-4 py-1 rounded-full bg-black/70 border border-yellow-700 text-yellow-400 font-mono text-xs tracking-wide transition hover:bg-yellow-900/60 hover:text-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 cursor-pointer"
            tabIndex={0}
        >
            LOAD STATE
            <input
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                onChange={(e) => {
                    onLoadState(e);
                    onRefocus();
                }}
            />
        </label>
        <a
            onClick={(e) => {
                onPauseResume(e);
                onRefocus();
            }}
            href="#"
            className="inline-block px-4 py-1 rounded-full bg-black/70 border border-purple-700 text-purple-400 font-mono text-xs tracking-wide transition hover:bg-purple-900/60 hover:text-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
            tabIndex={0}
        >
            {isPaused ? 'RESUME' : 'PAUSE'}
        </a>
        <a
            onClick={(e) => {
                onCycleAccurateTiming(e);
                onRefocus();
            }}
            href="#"
            className="inline-block px-4 py-1 rounded-full bg-black/70 border border-orange-700 text-orange-400 font-mono text-xs tracking-wide transition hover:bg-orange-900/60 hover:text-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
            tabIndex={0}
        >
            CYCLE TIMING [{cycleAccurateTiming ? 'ACCURATE' : 'FAST'}]
        </a>
    </nav>
);

export default Actions;
