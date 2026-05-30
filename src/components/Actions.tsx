import React, { useRef } from 'react';

export type ActionsProps = {
    onBS: React.MouseEventHandler<HTMLAnchorElement>;
    supportBS: boolean;
    onSaveState: React.MouseEventHandler<HTMLAnchorElement>;
    onLoadState: React.ChangeEventHandler<HTMLInputElement>;
    onRefocus: () => void;
    onCycleAccurateTiming: React.MouseEventHandler<HTMLAnchorElement>;
    cycleAccurateTiming: boolean;
};

// Shared action-button styling, token-backed via Tailwind classes.
// Hover states are pure CSS (no JS hover tracking needed).
const actionButtonBase =
    'inline-block py-sm px-md rounded-lg text-xs font-mono tracking-wide ' +
    'transition-all duration-150 ease-in-out no-underline cursor-pointer border outline-hidden';

const actionButtonVariant = {
    success: 'bg-success/10 hover:bg-success/20 border-success/30 hover:border-success text-success',
    // Address actions are green (data-address token) — fixes the prior blue/green split.
    address:
        'bg-data-address/10 hover:bg-data-address/20 border-data-address/30 hover:border-data-address text-data-address',
    // hover:text-* pins the on-token colour: the global `a:hover` rule in index.css
    // (phosphor green) otherwise out-specifies the plain text utility and turns these
    // non-green buttons green under the cursor, defeating the semantic.
    warning: 'bg-warning/10 hover:bg-warning/20 border-warning/30 hover:border-warning text-warning hover:text-warning',
    // Stateful toggles: blue when the feature is ON, neutral gray when OFF, so the
    // colour itself reads the state at a glance (text label is now confirmation).
    toggleOn:
        'bg-toggle-active/10 hover:bg-toggle-active/20 border-toggle-active/30 hover:border-toggle-active text-toggle-active hover:text-toggle-active',
    toggleOff:
        'bg-toggle-inactive/10 hover:bg-toggle-inactive/20 border-toggle-inactive/30 hover:border-toggle-inactive text-toggle-inactive hover:text-toggle-inactive',
} as const;

const Actions = ({
    onBS,
    supportBS,
    onSaveState,
    onLoadState,
    onRefocus,
    onCycleAccurateTiming,
    cycleAccurateTiming,
}: ActionsProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    return (
        <nav className="flex flex-wrap gap-sm justify-center">
            {/* State Management Group — execution + engine controls now live in the
                always-visible execution bar (see ExecutionControlsCluster). */}
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
            <button
                type="button"
                className={`${actionButtonBase} ${actionButtonVariant.address}`}
                onClick={() => fileInputRef.current?.click()}
            >
                LOAD STATE
            </button>
            <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                aria-label="Load state from file"
                onChange={(e) => {
                    onLoadState(e);
                    onRefocus();
                }}
            />

            {/* Configuration Group */}
            <a
                onClick={(e) => {
                    onBS(e);
                    onRefocus();
                }}
                href="#"
                className={`${actionButtonBase} ${supportBS ? actionButtonVariant.toggleOn : actionButtonVariant.toggleOff}`}
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
                className={`${actionButtonBase} ${cycleAccurateTiming ? actionButtonVariant.toggleOn : actionButtonVariant.toggleOff}`}
                tabIndex={0}
            >
                CYCLE TIMING [{cycleAccurateTiming ? 'ACCURATE' : 'FAST'}]
            </a>
        </nav>
    );
};

export default Actions;
