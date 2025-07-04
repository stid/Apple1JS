/**
 * CPU-related constants for the 6502 processor
 */

// Stack constants
export const STACK_BASE = 0x0100;
export const STACK_SIZE = 0x100;

// Interrupt vectors
export const NMI_VECTOR_LOW = 0xfffa;
export const NMI_VECTOR_HIGH = 0xfffb;
export const RESET_VECTOR_LOW = 0xfffc;
export const RESET_VECTOR_HIGH = 0xfffd;
export const IRQ_VECTOR_LOW = 0xfffe;
export const IRQ_VECTOR_HIGH = 0xffff;

// Status register flag bit positions
export const FLAG_C_BIT = 0; // Carry
export const FLAG_Z_BIT = 1; // Zero
export const FLAG_I_BIT = 2; // Interrupt disable
export const FLAG_D_BIT = 3; // Decimal mode
export const FLAG_B_BIT = 4; // Break command
export const FLAG_V_BIT = 6; // Overflow
export const FLAG_N_BIT = 7; // Negative

// Status register flag masks
export const FLAG_C_MASK = 0x01;
export const FLAG_Z_MASK = 0x02;
export const FLAG_I_MASK = 0x04;
export const FLAG_D_MASK = 0x08;
export const FLAG_B_MASK = 0x10;
export const FLAG_V_MASK = 0x40;
export const FLAG_N_MASK = 0x80;

// Memory and arithmetic constants
export const WORD_MASK = 0xffff;
export const PAGE_SIZE = 0x100;
export const PAGE_MASK = 0xff00;
export const SIGN_BIT_MASK = 0x80;
export const LOW_NIBBLE_MASK = 0x0f;
export const HIGH_NIBBLE_MASK = 0xf0;

// BCD (Binary Coded Decimal) constants
export const BCD_DIGIT_MAX = 9;
export const BCD_ADJUSTMENT = 6;
export const BCD_HIGH_NIBBLE_MAX = 15;

// Carry bit position for 16-bit operations
export const CARRY_BIT_POSITION = 0x100;

// Opcodes (sample - could be expanded to include all opcodes)
export const OPCODE_BRK = 0x00;
export const OPCODE_ORA_IZX = 0x01;
export const OPCODE_JSR = 0x20;
export const OPCODE_RTI = 0x40;
export const OPCODE_RTS = 0x60;
export const OPCODE_JMP_ABS = 0x4c;
export const OPCODE_JMP_IND = 0x6c;