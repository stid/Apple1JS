/**
 * 6502 CPU Addressing Modes
 * 
 * This module implements all addressing modes for the 6502 processor.
 * Each addressing mode is responsible for calculating the effective address
 * and managing cycle counts.
 */

import type { CPU6502Interface } from './types';

/**
 * Indexed Indirect (zp,X) - 6 cycles
 * Uses zero page address + X as pointer to actual address
 */
export function izx(this: CPU6502Interface): void {
    const a: number = (this.read(this.PC++) + this.X) & 0xff;
    this.addr = (this.read(a + 1) << 8) | this.read(a);
    this.cycles += 6;
}

/**
 * Indirect Indexed (zp),Y - 5-6 cycles
 * Uses zero page pointer, then adds Y to resulting address
 * Extra cycle if page boundary crossed
 */
export function izy(this: CPU6502Interface): void {
    const a: number = this.read(this.PC++);
    const paddr: number = (this.read((a + 1) & 0xff) << 8) | this.read(a);
    this.addr = paddr + this.Y;
    if ((paddr & 0xff00) !== (this.addr & 0xff00)) {
        this.cycles += 6;
    } else {
        this.cycles += 5;
    }
}

/**
 * Indirect - JMP only - 6 cycles
 * Note: Has 6502 bug where page boundary wrap occurs at low byte
 */
export function ind(this: CPU6502Interface): void {
    let a: number = this.read(this.PC);
    a |= this.read((this.PC & 0xff00) | ((this.PC + 1) & 0xff)) << 8;
    this.addr = this.read(a);
    this.addr |= this.read(a + 1) << 8;
    this.cycles += 6;
}

/**
 * Zero Page - 3 cycles
 * Direct addressing to first 256 bytes of memory
 */
export function zp(this: CPU6502Interface): void {
    this.addr = this.read(this.PC++);
    this.cycles += 3;
}

/**
 * Zero Page,X - 4 cycles
 * Zero page address + X register (wraps within zero page)
 */
export function zpx(this: CPU6502Interface): void {
    this.addr = (this.read(this.PC++) + this.X) & 0xff;
    this.cycles += 4;
}

/**
 * Zero Page,Y - 4 cycles
 * Zero page address + Y register (wraps within zero page)
 */
export function zpy(this: CPU6502Interface): void {
    this.addr = (this.read(this.PC++) + this.Y) & 0xff;
    this.cycles += 4;
}

/**
 * Implied - 2 cycles
 * No operand needed, instruction operates on registers/flags
 */
export function imp(this: CPU6502Interface): void {
    this.cycles += 2;
}

/**
 * Immediate - 2 cycles
 * Operand is the byte following the opcode
 */
export function imm(this: CPU6502Interface): void {
    this.addr = this.PC++;
    this.cycles += 2;
}

/**
 * Absolute - 4 cycles
 * Full 16-bit address
 */
export function abs(this: CPU6502Interface): void {
    this.addr = this.read(this.PC++);
    this.addr |= this.read(this.PC++) << 8;
    this.cycles += 4;
}

/**
 * Absolute,X - 4-5 cycles
 * Absolute address + X register
 * Extra cycle if page boundary crossed
 */
export function abx(this: CPU6502Interface): void {
    let paddr: number = this.read(this.PC++);
    paddr |= this.read(this.PC++) << 8;
    this.addr = paddr + this.X;
    if ((paddr & 0xff00) !== (this.addr & 0xff00)) {
        this.cycles += 5;
    } else {
        this.cycles += 4;
    }
}

/**
 * Absolute,Y - 4-5 cycles
 * Absolute address + Y register
 * Extra cycle if page boundary crossed
 */
export function aby(this: CPU6502Interface): void {
    let paddr: number = this.read(this.PC++);
    paddr |= this.read(this.PC++) << 8;
    this.addr = paddr + this.Y;
    if ((paddr & 0xff00) !== (this.addr & 0xff00)) {
        this.cycles += 5;
    } else {
        this.cycles += 4;
    }
}

/**
 * Relative - 2 cycles
 * Used for branches, signed 8-bit offset from PC
 */
export function rel(this: CPU6502Interface): void {
    this.addr = this.read(this.PC++);
    if (this.addr & 0x80) {
        this.addr -= 0x100;
    }
    this.addr += this.PC;
    this.cycles += 2;
}

/**
 * Read-Modify-Write helper
 * Handles special timing for RMW instructions
 */
export function rmw(this: CPU6502Interface): void {
    // In cycle-accurate mode, simulate the actual RMW bus timing
    if (this.cycleAccurateMode) {
        // RMW operations have these phases:
        // 1. Write the original value back (1 cycle)
        // 2. Write the modified value (1 cycle)
        // The "read" phase was already handled in the addressing mode
        
        // Phase 1: Write original value back (internal cycle)
        this.cycles += 1;
        
        // Phase 2: Write modified value
        this.write(this.addr, this.tmp & 0xff);
        this.cycles += 1;
    } else {
        // Standard timing - simplified for performance
        this.write(this.addr, this.tmp & 0xff);
        this.cycles += 2;
    }
}

/**
 * Branch helper
 * Handles branch timing (extra cycle if page crossed)
 */
export function branch(this: CPU6502Interface, taken: boolean): void {
    if (taken) {
        this.cycles += (this.addr & 0xff00) !== (this.PC & 0xff00) ? 2 : 1;
        this.PC = this.addr;
    }
}