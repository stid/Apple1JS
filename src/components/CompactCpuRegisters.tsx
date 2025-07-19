import React, { memo } from 'react';
import { FilteredDebugData } from '../apple1/types/worker-messages';
import AddressLink from './AddressLink';
import { Formatters } from '../utils/formatters';
import { getDebugValueOrDefault } from '../utils/debug-helpers';
import type { WorkerManager } from '../services/WorkerManager';

interface CompactCpuRegistersProps {
    debugInfo: FilteredDebugData;
    workerManager?: WorkerManager;
}

// Use unified formatter
const { formatHex } = Formatters;

const CompactCpuRegistersComponent: React.FC<CompactCpuRegistersProps> = ({ debugInfo, workerManager }) => {
    const cpu = debugInfo.cpu || {};
    
    // Extract register values with defaults
    const registers = {
        pc: formatHex(getDebugValueOrDefault(cpu.REG_PC || cpu.PC, 0), 4),
        a: formatHex(getDebugValueOrDefault(cpu.REG_A || cpu.A, 0), 2),
        x: formatHex(getDebugValueOrDefault(cpu.REG_X || cpu.X, 0), 2),
        y: formatHex(getDebugValueOrDefault(cpu.REG_Y || cpu.Y, 0), 2),
        sp: formatHex(getDebugValueOrDefault(cpu.REG_S || cpu.S, 0), 2),
    };
    
    // Extract flag values
    const flags = {
        n: cpu.FLAG_N === 'SET' || cpu.N === 'SET',
        v: cpu.FLAG_V === 'SET' || cpu.V === 'SET',
        d: cpu.FLAG_D === 'SET' || cpu.D === 'SET',
        i: cpu.FLAG_I === 'SET' || cpu.I === 'SET',
        z: cpu.FLAG_Z === 'SET' || cpu.Z === 'SET',
        c: cpu.FLAG_C === 'SET' || cpu.C === 'SET',
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
    const prevCpu = prevProps.debugInfo.cpu || {};
    const nextCpu = nextProps.debugInfo.cpu || {};
    
    // Compare register values with consistent formatting
    const prevRegs = {
        pc: formatHex(getDebugValueOrDefault(prevCpu.REG_PC || prevCpu.PC, 0), 4),
        a: formatHex(getDebugValueOrDefault(prevCpu.REG_A || prevCpu.A, 0), 2),
        x: formatHex(getDebugValueOrDefault(prevCpu.REG_X || prevCpu.X, 0), 2),
        y: formatHex(getDebugValueOrDefault(prevCpu.REG_Y || prevCpu.Y, 0), 2),
        sp: formatHex(getDebugValueOrDefault(prevCpu.REG_S || prevCpu.S, 0), 2),
        flagN: prevCpu.FLAG_N === 'SET' || prevCpu.N === 'SET',
        flagV: prevCpu.FLAG_V === 'SET' || prevCpu.V === 'SET',
        flagD: prevCpu.FLAG_D === 'SET' || prevCpu.D === 'SET',
        flagI: prevCpu.FLAG_I === 'SET' || prevCpu.I === 'SET',
        flagZ: prevCpu.FLAG_Z === 'SET' || prevCpu.Z === 'SET',
        flagC: prevCpu.FLAG_C === 'SET' || prevCpu.C === 'SET',
    };
    
    const nextRegs = {
        pc: formatHex(getDebugValueOrDefault(nextCpu.REG_PC || nextCpu.PC, 0), 4),
        a: formatHex(getDebugValueOrDefault(nextCpu.REG_A || nextCpu.A, 0), 2),
        x: formatHex(getDebugValueOrDefault(nextCpu.REG_X || nextCpu.X, 0), 2),
        y: formatHex(getDebugValueOrDefault(nextCpu.REG_Y || nextCpu.Y, 0), 2),
        sp: formatHex(getDebugValueOrDefault(nextCpu.REG_S || nextCpu.S, 0), 2),
        flagN: nextCpu.FLAG_N === 'SET' || nextCpu.N === 'SET',
        flagV: nextCpu.FLAG_V === 'SET' || nextCpu.V === 'SET',
        flagD: nextCpu.FLAG_D === 'SET' || nextCpu.D === 'SET',
        flagI: nextCpu.FLAG_I === 'SET' || nextCpu.I === 'SET',
        flagZ: nextCpu.FLAG_Z === 'SET' || nextCpu.Z === 'SET',
        flagC: nextCpu.FLAG_C === 'SET' || nextCpu.C === 'SET',
    };
    
    // Return true if all values are equal (prevents re-render)
    return (
        prevRegs.pc === nextRegs.pc &&
        prevRegs.a === nextRegs.a &&
        prevRegs.x === nextRegs.x &&
        prevRegs.y === nextRegs.y &&
        prevRegs.sp === nextRegs.sp &&
        prevRegs.flagN === nextRegs.flagN &&
        prevRegs.flagV === nextRegs.flagV &&
        prevRegs.flagD === nextRegs.flagD &&
        prevRegs.flagI === nextRegs.flagI &&
        prevRegs.flagZ === nextRegs.flagZ &&
        prevRegs.flagC === nextRegs.flagC
    );
};

// Memoized component that only re-renders when register values actually change
const CompactCpuRegisters = memo(CompactCpuRegistersComponent, areRegistersEqual);

export default CompactCpuRegisters;