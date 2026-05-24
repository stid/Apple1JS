import React, { useRef } from 'react';

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
    currentEngine: 'JS' | 'WASM';
    wasmAvailable: boolean;
    isSwitchingEngine: boolean;
    onEngineSwitch: React.MouseEventHandler<HTMLAnchorElement>;
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
    // Informational: the active engine is a neutral choice, not a success or a warning.
    info: 'bg-info/10 hover:bg-info/20 border-info/30 hover:border-info text-info hover:text-info',
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
    currentEngine,
    wasmAvailable,
    isSwitchingEngine,
    onEngineSwitch,
}: ActionsProps) => {
    // Nothing to toggle to when WASM is unavailable, and mid-switch clicks are ignored.
    const engineToggleDisabled = !wasmAvailable || isSwitchingEngine;
    // Both engines are valid choices, so the engine reads as informational (blue), not
    // success/warning. Amber is reserved for the one genuine problem: WASM failed to
    // load, so we're stuck on JS. A mid-switch is transient — just dim the info colour.
    const engineVariant = !wasmAvailable ? actionButtonVariant.warning : actionButtonVariant.info;
    const engineClassName = `${actionButtonBase} ${engineVariant}${engineToggleDisabled ? ' opacity-50 cursor-not-allowed' : ''}`;

    const fileInputRef = useRef<HTMLInputElement>(null);
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
            <a
                onClick={(e) => {
                    e.preventDefault();
                    if (engineToggleDisabled) return;
                    onEngineSwitch(e);
                    onRefocus();
                }}
                href="#"
                className={engineClassName}
                tabIndex={0}
            >
                ENGINE [{currentEngine}]
            </a>
        </nav>
    );
};

export default Actions;
