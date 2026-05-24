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

// Shared action-button styling, token-backed via Tailwind classes.
// Hover states are pure CSS (no JS hover tracking needed).
const actionButtonBase =
    'inline-block py-sm px-md rounded-lg text-xs font-mono tracking-wide ' +
    'transition-all duration-150 ease-in-out no-underline cursor-pointer border outline-none';

const actionButtonVariant = {
    success: 'bg-success/10 hover:bg-success/20 border-success/30 hover:border-success text-success',
    // Address actions are green (data-address token) — fixes the prior blue/green split.
    address:
        'bg-data-address/10 hover:bg-data-address/20 border-data-address/30 hover:border-data-address text-data-address',
    warning: 'bg-warning/10 hover:bg-warning/20 border-warning/30 hover:border-warning text-warning',
} as const;

const Actions = ({
    onReset,
    onBS,
    supportBS,
    onSaveState,
    onLoadState,
    onPauseResume,
    isPaused,
    onRefocus,
    onCycleAccurateTiming,
    cycleAccurateTiming,
}: ActionsProps) => {
    return (
        <nav className="flex flex-wrap gap-sm justify-center">
            {/* Control Actions Group */}
            <a
                onClick={(e) => {
                    onReset(e);
                    onRefocus();
                }}
                href="#"
                className={`${actionButtonBase} ${actionButtonVariant.success}`}
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
                className={`${actionButtonBase} ${actionButtonVariant.success}`}
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
                className={`${actionButtonBase} ${actionButtonVariant.address}`}
                tabIndex={0}
            >
                SAVE STATE
            </a>
            <label className={`${actionButtonBase} ${actionButtonVariant.address}`} tabIndex={0}>
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
                className={`${actionButtonBase} ${actionButtonVariant.warning}`}
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
                className={`${actionButtonBase} ${actionButtonVariant.warning}`}
                tabIndex={0}
            >
                CYCLE TIMING [{cycleAccurateTiming ? 'ACCURATE' : 'FAST'}]
            </a>
        </nav>
    );
};

export default Actions;
