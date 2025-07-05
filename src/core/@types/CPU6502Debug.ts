/**
 * Disassembly result for a single instruction
 */
export interface DisassemblyLine {
    address: number;
    bytes: number[];
    mnemonic: string;
    operand?: string;
}

/**
 * Instruction trace entry
 */
export interface TraceEntry {
    pc: number;
    opcode: number;
    mnemonic: string;
    operand?: string;
    cycles: number;
    timestamp?: number;
}

/**
 * Optional debug extensions for CPU6502
 */
export interface CPU6502DebugExtensions {
    /** Disassemble instructions starting from given PC */
    disassemble?: (pc: number, count: number) => DisassemblyLine[];
    /** Recent instruction execution trace */
    trace?: TraceEntry[];
}

/**
 * CPU6502 with optional debug extensions
 */
export type CPU6502WithDebug<T> = T & Partial<CPU6502DebugExtensions>;