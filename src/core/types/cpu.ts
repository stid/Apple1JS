/**
 * CPU 6502 type definitions
 */

import type { StateBase } from './state';

/**
 * Complete state representation of the 6502 CPU
 */
export interface CPU6502State extends StateBase {
    // Registers
    PC: number;  // Program Counter
    A: number;   // Accumulator
    X: number;   // X Index Register
    Y: number;   // Y Index Register
    S: number;   // Stack Pointer
    
    // Status flags
    N: number;   // Negative
    Z: number;   // Zero
    C: number;   // Carry
    V: number;   // Overflow
    I: number;   // Interrupt Disable
    D: number;   // Decimal Mode
    
    // Interrupt lines
    irq: number;
    nmi: number;
    
    // Execution state
    cycles: number;
    opcode: number;
    address: number;
    data: number;
    
    // Interrupt handling state
    pendingIrq: number;
    pendingNmi: number;
    
    // Cycle-accurate timing state (optional)
    cycleAccurateMode?: boolean;
    currentInstructionCycles?: number;
}

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
 * Instruction trace entry for debugging
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