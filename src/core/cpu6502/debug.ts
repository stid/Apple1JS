/**
 * 6502 CPU Debug Functionality
 * 
 * This module provides debugging support including:
 * - State inspection
 * - Performance profiling
 * - Cycle-accurate timing
 * - Execution hooks
 */

import type { CPU6502WithDebug, DisassemblyLine, TraceEntry, InspectableData } from '../types';
import type { CPU6502Interface } from './types';
import { Formatters } from '../../utils/formatters';

/**
 * Get inspectable data for the CPU
 */
export function getInspectable(cpu: CPU6502Interface & { 
    enableProfiling: boolean;
    profileData: Map<number, { count: number; cycles: number }>;
    instructionCount: number;
    cycleAccurateMode: boolean;
    id: string;
    type: string;
    name?: string;
}): InspectableData {
    const self = cpu as CPU6502WithDebug<typeof cpu>;
    
    // Stack dump (top 8 bytes)
    let stack: Array<{ addr: string; value: number }> | undefined = undefined;
    if (typeof cpu.S === 'number' && cpu.bus && typeof cpu.bus.read === 'function') {
        stack = [];
        for (let i = 0; i < 8; ++i) {
            const addr = 0x0100 + ((cpu.S - i) & 0xff);
            stack.push({ 
                addr: Formatters.hexWord(addr), 
                value: cpu.bus.read(addr) 
            });
        }
    }
    
    // Disassemble current and next instruction (if possible)
    let disasm: DisassemblyLine[] | undefined = undefined;
    if (typeof self.disassemble === 'function') {
        try {
            disasm = self.disassemble(cpu.PC, 3);
        } catch {
            // Disassembly errors are expected at memory boundaries
            // Continue without disassembly data
        }
    }
    
    // Recent instruction trace (if available)
    let trace: TraceEntry[] | undefined = undefined;
    if (Array.isArray(self.trace)) {
        trace = self.trace.slice(-8);
    }
    
    const data: InspectableData = {
        id: cpu.id,
        type: cpu.type,
        name: cpu.name ?? '',
        state: {
            PC: Formatters.hexWord(cpu.PC),
            A: Formatters.hexByte(cpu.A),
            X: Formatters.hexByte(cpu.X),
            Y: Formatters.hexByte(cpu.Y),
            S: Formatters.hexByte(cpu.S),
            // Flags (combined into P register display)
            P: Formatters.hexByte(
                (cpu.N ? 0x80 : 0) |
                (cpu.V ? 0x40 : 0) |
                0x20 | // unused, always 1
                0x10 | // B flag always set except on stack
                (cpu.D ? 0x08 : 0) |
                (cpu.I ? 0x04 : 0) |
                (cpu.Z ? 0x02 : 0) |
                (cpu.C ? 0x01 : 0)
            ),
            // Individual flags
            N: cpu.N,
            V: cpu.V,
            D: cpu.D,
            I: cpu.I,
            Z: cpu.Z,
            C: cpu.C,
            // Performance
            cycles: cpu.cycles,
            profiling: cpu.enableProfiling
        },
        debug: {
            ...(stack !== undefined && { stack }),
            ...(disasm !== undefined && { disasm }),
            ...(trace !== undefined && { trace })
        },
        children: []
    };
    
    if (cpu.enableProfiling) {
        data.stats = {
            instructions: cpu.instructionCount,
            uniqueOpcodes: cpu.profileData.size,
            cycleAccurate: cpu.cycleAccurateMode ? 'Enabled' : 'Disabled'
        };
    }
    
    return data;
}

/**
 * Get debug information for the CPU
 */
export function toDebug(cpu: CPU6502Interface & {
    enableProfiling: boolean;
    getPerformanceStats: () => { instructionCount: number; totalInstructions: number; profilingEnabled: boolean };
    getProfilingData: () => { [opcode: string]: { count: number; cycles: number; avgCycles: number } };
}): { [key: string]: string | number | boolean | object } {
    // Enhanced live state capture with hex formatting - no duplicates
    const debugData: { [key: string]: string | number | boolean | object } = { 
        // Registers as hex values for inspector
        REG_PC: Formatters.hexWord(cpu.PC),
        REG_A: Formatters.hexByte(cpu.A),
        REG_X: Formatters.hexByte(cpu.X),
        REG_Y: Formatters.hexByte(cpu.Y),
        REG_S: Formatters.hexByte(cpu.S),
        // Processor flags as clear indicators
        FLAG_N: Formatters.flag(cpu.N),
        FLAG_Z: Formatters.flag(cpu.Z),
        FLAG_C: Formatters.flag(cpu.C),
        FLAG_V: Formatters.flag(cpu.V),
        FLAG_I: Formatters.flag(cpu.I),
        FLAG_D: Formatters.flag(cpu.D),
        // Hardware state in hex
        HW_ADDR: Formatters.hexWord(cpu.address),
        HW_DATA: Formatters.hexByte(cpu.data),
        HW_OPCODE: Formatters.hexByte(cpu.opcode),
        HW_CYCLES: Formatters.decimal(cpu.cycles),
        // Interrupt state as clear indicators
        IRQ_LINE: cpu.irq ? 'ACTIVE' : 'INACTIVE',
        NMI_LINE: cpu.nmi ? 'ACTIVE' : 'INACTIVE',
        IRQ_PENDING: (cpu.pendingIrq && cpu.pendingIrq > 0) ? 'YES' : 'NO',
        NMI_PENDING: (cpu.pendingNmi && cpu.pendingNmi > 0) ? 'YES' : 'NO',
        // Instruction execution state in hex
        EXEC_TMP: Formatters.hexByte(cpu.tmp),
        EXEC_ADDR: Formatters.hexWord(cpu.addr)
    };

    // Add performance profiling data if enabled
    if (cpu.enableProfiling) {
        const stats = cpu.getPerformanceStats();
        const profileData = cpu.getProfilingData();
        
        // Add summary stats
        debugData.PERF_ENABLED = 'YES';
        debugData.PERF_INSTRUCTIONS = Formatters.decimal(stats.instructionCount);
        debugData.PERF_UNIQUE_OPCODES = stats.totalInstructions.toString();
        
        // Add top 5 most frequent instructions
        const sortedOpcodes = Object.entries(profileData)
            .sort(([,a], [,b]) => b.count - a.count)
            .slice(0, 5);
            
        debugData.PERF_TOP_OPCODES = sortedOpcodes.map(([opcode, data]) => 
            `${opcode}:${data.count}`
        ).join(', ');
        
        // Add performance data for detailed analysis
        debugData._PERF_DATA = {
            stats,
            topOpcodes: sortedOpcodes.map(([opcode, data]) => ({
                opcode,
                count: data.count,
                cycles: data.cycles,
                avgCycles: data.avgCycles
            }))
        };
    } else {
        debugData.PERF_ENABLED = 'NO';
    }
    
    // Add raw numeric values for backward compatibility
    debugData.PC = cpu.PC;
    debugData.A = cpu.A;
    debugData.X = cpu.X;
    debugData.Y = cpu.Y;
    debugData.S = cpu.S;

    return debugData;
}

/**
 * Performance profiling methods
 */
export function getProfilingData(profileData: Map<number, { count: number; cycles: number }>): { [opcode: string]: { count: number; cycles: number; avgCycles: number } } {
    const result: { [opcode: string]: { count: number; cycles: number; avgCycles: number } } = {};
    
    for (const [opcode, data] of profileData) {
        const opcodeHex = Formatters.hexByte(opcode);
        result[opcodeHex] = {
            count: data.count,
            cycles: data.cycles,
            avgCycles: data.count > 0 ? Math.round(data.cycles / data.count * 100) / 100 : 0
        };
    }
    
    return result;
}

export function getPerformanceStats(instructionCount: number, profileData: Map<number, { count: number; cycles: number }>, enableProfiling: boolean): { instructionCount: number; totalInstructions: number; profilingEnabled: boolean } {
    return {
        instructionCount: instructionCount,
        totalInstructions: profileData.size,
        profilingEnabled: enableProfiling
    };
}