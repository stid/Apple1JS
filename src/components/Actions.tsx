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
    <nav className="flex flex-wrap gap-sm justify-center">
        {/* Control Actions Group */}
        <a
            onClick={(e) => {
                onReset(e);
                onRefocus();
            }}
            href="#"
            className="inline-block px-md py-sm rounded-lg bg-success/10 border border-success/30 text-success font-mono text-xs tracking-wide transition-colors hover:bg-success/20 hover:border-success hover:text-success focus:outline-none focus:ring-2 focus:ring-success focus:ring-offset-2"
            tabIndex={0}
        >
            RESET
        </a>
        <a
            onClick={(e) => {
                onPauseResume(e);
                onRefocus();
            }}
            href="#"
            className="inline-block px-md py-sm rounded-lg bg-success/10 border border-success/30 text-success font-mono text-xs tracking-wide transition-colors hover:bg-success/20 hover:border-success hover:text-success focus:outline-none focus:ring-2 focus:ring-success focus:ring-offset-2"
            tabIndex={0}
        >
            {isPaused ? 'RESUME' : 'PAUSE'}
        </a>
        
        {/* State Management Group */}
        <a
            onClick={(e) => {
                onSaveState(e);
                onRefocus();
            }}
            href="#"
            className="inline-block px-md py-sm rounded-lg bg-data-address/10 border border-data-address/30 text-data-address font-mono text-xs tracking-wide transition-colors hover:bg-data-address/20 hover:border-data-address hover:text-data-address focus:outline-none focus:ring-2 focus:ring-data-address focus:ring-offset-2 no-underline"
            style={{ color: '#60A5FA' }}
            tabIndex={0}
        >
            SAVE STATE
        </a>
        <label
            className="inline-block px-md py-sm rounded-lg bg-data-address/10 border border-data-address/30 text-data-address font-mono text-xs tracking-wide transition-colors hover:bg-data-address/20 hover:border-data-address hover:text-data-address focus:outline-none focus:ring-2 focus:ring-data-address focus:ring-offset-2 cursor-pointer"
            style={{ color: '#60A5FA' }}
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
        
        {/* Configuration Group */}
        <a
            onClick={(e) => {
                onBS(e);
                onRefocus();
            }}
            href="#"
            className="inline-block px-md py-sm rounded-lg bg-warning/10 border border-warning/30 text-warning font-mono text-xs tracking-wide transition-colors hover:bg-warning/20 hover:border-warning hover:text-warning focus:outline-none focus:ring-2 focus:ring-warning focus:ring-offset-2"
            tabIndex={0}
        >
            SUPPORT BACKSPACE [{supportBS ? 'ON' : 'OFF'}]
        </a>
        <a
            onClick={(e) => {
                onCycleAccurateTiming(e);
                onRefocus();
            }}
            href="#"
            className="inline-block px-md py-sm rounded-lg bg-warning/10 border border-warning/30 text-warning font-mono text-xs tracking-wide transition-colors hover:bg-warning/20 hover:border-warning hover:text-warning focus:outline-none focus:ring-2 focus:ring-warning focus:ring-offset-2"
            tabIndex={0}
        >
            CYCLE TIMING [{cycleAccurateTiming ? 'ACCURATE' : 'FAST'}]
        </a>
    </nav>
);

export default Actions;
