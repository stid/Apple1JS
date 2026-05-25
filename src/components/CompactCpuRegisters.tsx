import React, { memo } from 'react';
import { FilteredDebugData } from '../apple1/types/worker-messages';
import AddressLink from './AddressLink';
import { Formatters } from '../utils/formatters';
import { readCpuRegisters } from '../utils/debug-helpers';
import type { WorkerManager } from '../services/WorkerManager';

interface CompactCpuRegistersProps {
    debugInfo: FilteredDebugData;
    workerManager?: WorkerManager;
}

// Use unified formatter
const { formatHex } = Formatters;

const CompactCpuRegistersComponent: React.FC<CompactCpuRegistersProps> = ({ debugInfo, workerManager }) => {
    const { pc, a, x, y, s, flags } = readCpuRegisters(debugInfo.cpu || {});

    // Format register values for display
    const registers = {
        pc: formatHex(pc, 4),
        a: formatHex(a, 2),
        x: formatHex(x, 2),
        y: formatHex(y, 2),
        sp: formatHex(s, 2),
    };

    return (
        <div className="bg-surface-secondary/50 border-t border-border-subtle px-md py-xs">
            <div className="flex items-center justify-between text-xs">
                {/* Registers */}
                <div className="flex items-center gap-md">
                    <div className="flex items-center gap-xs">
                        <span className="text-text-secondary font-medium">PC:</span>
                        <AddressLink
                            address={parseInt(registers.pc.replace('$', ''), 16)}
                            className="font-mono"
                            {...(workerManager !== undefined && { workerManager })}
                            showContextMenu={true}
                            showRunToCursor={true}
                        />
                    </div>
                    <div className="flex items-center gap-xs">
                        <span className="text-text-secondary font-medium">A:</span>
                        <span className="font-mono text-data-value">{registers.a}</span>
                    </div>
                    <div className="flex items-center gap-xs">
                        <span className="text-text-secondary font-medium">X:</span>
                        <span className="font-mono text-data-value">{registers.x}</span>
                    </div>
                    <div className="flex items-center gap-xs">
                        <span className="text-text-secondary font-medium">Y:</span>
                        <span className="font-mono text-data-value">{registers.y}</span>
                    </div>
                    <div className="flex items-center gap-xs">
                        <span className="text-text-secondary font-medium">SP:</span>
                        <span className="font-mono text-data-value">{registers.sp}</span>
                    </div>
                </div>

                {/* Flags */}
                <div className="flex items-center gap-xs">
                    <span className="text-text-secondary font-medium mr-xs">Flags:</span>
                    <div className="font-mono flex gap-[2px]">
                        <span className={flags.n ? 'text-success' : 'text-text-disabled'}>N</span>
                        <span className={flags.v ? 'text-success' : 'text-text-disabled'}>V</span>
                        <span className="text-text-disabled">-</span>
                        <span className="text-text-disabled">B</span>
                        <span className={flags.d ? 'text-success' : 'text-text-disabled'}>D</span>
                        <span className={flags.i ? 'text-success' : 'text-text-disabled'}>I</span>
                        <span className={flags.z ? 'text-success' : 'text-text-disabled'}>Z</span>
                        <span className={flags.c ? 'text-success' : 'text-text-disabled'}>C</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Custom comparison function to check if register values actually changed
const areRegistersEqual = (prevProps: CompactCpuRegistersProps, nextProps: CompactCpuRegistersProps): boolean => {
    const prev = readCpuRegisters(prevProps.debugInfo.cpu || {});
    const next = readCpuRegisters(nextProps.debugInfo.cpu || {});

    // Return true if all values are equal (prevents re-render)
    return (
        prev.pc === next.pc &&
        prev.a === next.a &&
        prev.x === next.x &&
        prev.y === next.y &&
        prev.s === next.s &&
        prev.flags.n === next.flags.n &&
        prev.flags.v === next.flags.v &&
        prev.flags.d === next.flags.d &&
        prev.flags.i === next.flags.i &&
        prev.flags.z === next.flags.z &&
        prev.flags.c === next.flags.c
    );
};

// Memoized component that only re-renders when register values actually change
const CompactCpuRegisters = memo(CompactCpuRegistersComponent, areRegistersEqual);

export default CompactCpuRegisters;
