/**
 * Shared types for CPU6502 module
 */

import type Bus from '../Bus';
import type { StateBase } from '../types/state';

/**
 * Complete state representation of the 6502 CPU for serialization
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
 * Interface for CPU6502 class that defines all methods used by opcodes and other modules
 */
export interface CPU6502Interface {
    // Core properties
    bus: Bus;
    PC: number;
    A: number;
    X: number;
    Y: number;
    S: number;
    N: number;
    Z: number;
    C: number;
    V: number;
    I: number;
    D: number;
    irq: number;
    nmi: number;
    tmp: number;
    addr: number;
    opcode: number;
    data: number;
    address: number;
    cycles: number;

    // Methods used by opcodes
    read(address: number): number;
    write(address: number, value: number): void;

    // Addressing modes
    izx(): void;
    izy(): void;
    ind(): void;
    zp(): void;
    zpx(): void;
    zpy(): void;
    imp(): void;
    imm(): void;
    abs(): void;
    abx(): void;
    aby(): void;
    rel(): void;

    // Special operations
    rmw(): void;
    branch(taken: boolean): void;

    // Instructions
    adc(): void;
    and(): void;
    asl(): void;
    asla(): void;
    bit(): void;
    brk(): void;
    bcc(): void;
    bcs(): void;
    beq(): void;
    bne(): void;
    bmi(): void;
    bpl(): void;
    bvc(): void;
    bvs(): void;
    clc(): void;
    cld(): void;
    cli(): void;
    clv(): void;
    cmp(): void;
    cpx(): void;
    cpy(): void;
    dec(): void;
    dex(): void;
    dey(): void;
    eor(): void;
    inc(): void;
    inx(): void;
    iny(): void;
    jmp(): void;
    jsr(): void;
    lda(): void;
    ldx(): void;
    ldy(): void;
    ora(): void;
    rol(): void;
    rola(): void;
    ror(): void;
    rora(): void;
    lsr(): void;
    lsra(): void;
    nop(): void;
    pha(): void;
    php(): void;
    pla(): void;
    plp(): void;
    rti(): void;
    rts(): void;
    sbc(): void;
    sec(): void;
    sed(): void;
    sei(): void;
    slo(): void;
    sta(): void;
    stx(): void;
    sty(): void;
    tax(): void;
    tay(): void;
    tsx(): void;
    txa(): void;
    txs(): void;
    tya(): void;

    // Illegal/undocumented instructions
    isc(): void;
    anc(): void;
    rla(): void;
    sre(): void;
    alr(): void;
    rra(): void;
    sax(): void;
    lax(): void;
    arr(): void;
    shy(): void;
    dcp(): void;
    las(): void;
    ahx(): void;
    shx(): void;
    kil(): void;
    tas(): void;
    axs(): void;
    xaa(): void;

    // Optional properties that may exist on CPU implementations
    cycleAccurateMode?: boolean;
    stackBase?: number;
    updateIrqPending?: () => void;
    pendingIrq?: number;
    pendingNmi?: number;
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