import React, { memo } from 'react';
import AddressLink from './AddressLink';
import { getDebugValueOrDefault, getNumericDebugValue } from '../utils/debug-helpers';
import type { FilteredDebugData } from '../apple1/types/worker-messages';
import type { WorkerManager } from '../services/WorkerManager';

interface CpuStateCardProps {
    debugInfo: FilteredDebugData;
    workerManager?: WorkerManager;
}

// The 8-bit registers shown as a segmented rail (label above value).
const REGISTERS: ReadonlyArray<{ label: string; field: string; def: string }> = [
    { label: 'A', field: 'REG_A', def: '$00' },
    { label: 'X', field: 'REG_X', def: '$00' },
    { label: 'Y', field: 'REG_Y', def: '$00' },
    { label: 'SP', field: 'REG_S', def: '$FF' },
];

// 6502 status bits in canonical order. `-` and `B` are placeholders (no live field) and stay dim.
const FLAGS: ReadonlyArray<{ glyph: string; field?: string }> = [
    { glyph: 'N', field: 'FLAG_N' },
    { glyph: 'V', field: 'FLAG_V' },
    { glyph: '-' },
    { glyph: 'B' },
    { glyph: 'D', field: 'FLAG_D' },
    { glyph: 'I', field: 'FLAG_I' },
    { glyph: 'Z', field: 'FLAG_Z' },
    { glyph: 'C', field: 'FLAG_C' },
];

const flagChipClass = (state: 'set' | 'clear' | 'unused'): string => {
    switch (state) {
        case 'set':
            return 'border-success bg-success/20 text-success';
        case 'unused':
            return 'border-border-subtle text-text-disabled';
        default:
            return 'border-border-primary text-text-secondary';
    }
};

const CpuStateCardComponent: React.FC<CpuStateCardProps> = ({ debugInfo, workerManager }) => {
    const cpu = debugInfo.cpu;

    return (
        <div className="bg-surface-primary rounded-lg p-md border border-border-primary">
            {/* Header: title + clickable PC pill */}
            <div className="flex items-center justify-between mb-sm">
                <h3 className="text-sm font-medium text-text-accent">CPU State</h3>
                <span className="inline-flex items-center gap-xs rounded-md border border-border-primary bg-data-value/5 px-sm py-xs text-xs font-mono">
                    <span className="text-text-secondary">PC</span>
                    {cpu?.REG_PC ? (
                        <AddressLink
                            address={getNumericDebugValue(cpu.REG_PC, 0)}
                            className="font-bold"
                            showContextMenu={true}
                            showRunToCursor={true}
                            {...(workerManager !== undefined ? { workerManager } : {})}
                        />
                    ) : (
                        <span className="text-data-address font-bold">$0000</span>
                    )}
                </span>
            </div>

            {/* Register rail */}
            <div className="grid grid-cols-4 rounded-lg border border-border-primary overflow-hidden">
                {REGISTERS.map((reg, i) => (
                    <div
                        key={reg.label}
                        className={`flex flex-col items-center gap-xs py-sm bg-surface-secondary/40 ${
                            i > 0 ? 'border-l border-border-primary' : ''
                        }`}
                    >
                        <span className="text-xs uppercase tracking-wide text-text-secondary">{reg.label}</span>
                        <span className="text-sm font-mono font-bold text-data-value">
                            {getDebugValueOrDefault(cpu?.[reg.field], reg.def)}
                        </span>
                    </div>
                ))}
            </div>

            {/* Status flags */}
            <div className="mt-sm">
                <div className="text-xs tracking-wide text-text-secondary mb-xs">FLAGS</div>
                <div className="flex gap-xs">
                    {FLAGS.map((flag, i) => {
                        const state = !flag.field ? 'unused' : cpu?.[flag.field] === 'SET' ? 'set' : 'clear';
                        return (
                            <span
                                key={`${flag.glyph}-${i}`}
                                className={`inline-flex items-center justify-center w-7 h-7 rounded-md border font-mono font-bold text-xs ${flagChipClass(
                                    state,
                                )}`}
                            >
                                {flag.glyph}
                            </span>
                        );
                    })}
                </div>
            </div>

            {/* Cycle counter (de-emphasized label, status-colored value) */}
            <div className="flex items-center justify-between mt-sm pt-sm border-t border-border-subtle">
                <span className="text-xs text-text-secondary">cycles</span>
                <span className="text-sm font-mono text-data-status">
                    {getDebugValueOrDefault(cpu?.HW_CYCLES, '0')}
                </span>
            </div>
        </div>
    );
};

const CpuStateCard = memo(CpuStateCardComponent);

export default CpuStateCard;
