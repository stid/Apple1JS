import React, { useRef } from 'react';

export type ActionsProps = {
    onBS: React.MouseEventHandler<HTMLButtonElement>;
    supportBS: boolean;
    onSaveState: React.MouseEventHandler<HTMLButtonElement>;
    onLoadState: React.ChangeEventHandler<HTMLInputElement>;
    onRefocus: () => void;
    onCycleAccurateTiming: React.MouseEventHandler<HTMLButtonElement>;
    cycleAccurateTiming: boolean;
};

type SettingSwitchProps = {
    label: string;
    checked: boolean;
    /** Short mono readout of the current mode, e.g. "accurate" / "fast". */
    state: string;
    onClick: React.MouseEventHandler<HTMLButtonElement>;
};

// A stateful setting. State is carried three ways: thumb position, accent colour
// (toggle-active / toggle-inactive tokens) and the mono readout.
const SettingSwitch = ({ label, checked, state, onClick }: SettingSwitchProps) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onClick}
        className="group inline-flex items-center gap-sm cursor-pointer select-none text-sm text-text-primary"
    >
        <span
            aria-hidden="true"
            className={`relative flex-none w-[30px] h-[18px] rounded-full border transition-colors ${
                checked ? 'bg-toggle-active border-toggle-active' : 'bg-surface-tertiary border-border-secondary'
            }`}
        >
            <span
                className={`absolute top-[2px] left-[2px] w-3 h-3 rounded-full transition-transform ${
                    checked ? 'translate-x-3 bg-text-on-accent' : 'bg-text-primary'
                }`}
            />
        </span>
        <span>{label}</span>
        <span className={`font-mono text-xs ${checked ? 'text-toggle-active' : 'text-toggle-inactive'}`}>{state}</span>
    </button>
);

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
        <nav className="flex flex-wrap items-center justify-between gap-x-md gap-y-sm" aria-label="Emulator settings">
            {/* Settings — execution + engine controls live in the always-visible
                execution bar (see ExecutionControlsCluster). */}
            <div className="flex flex-wrap items-center gap-x-md gap-y-sm">
                <SettingSwitch
                    label="Backspace"
                    checked={supportBS}
                    state={supportBS ? 'on' : 'off'}
                    onClick={(e) => {
                        onBS(e);
                        onRefocus();
                    }}
                />
                <SettingSwitch
                    label="Cycle timing"
                    checked={cycleAccurateTiming}
                    state={cycleAccurateTiming ? 'accurate' : 'fast'}
                    onClick={(e) => {
                        onCycleAccurateTiming(e);
                        onRefocus();
                    }}
                />
            </div>

            {/* Machine state files */}
            <div className="flex items-center gap-sm">
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={(e) => {
                        onSaveState(e);
                        onRefocus();
                    }}
                >
                    Save state
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
                    Load state
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
            </div>
        </nav>
    );
};

export default Actions;
