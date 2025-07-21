/**
 * 6502 CPU Instructions
 * 
 * This module implements all instructions for the 6502 processor.
 * Instructions are responsible for executing operations and setting flags.
 */

import type { CPU6502Interface } from './types';

// Helper functions for flag setting
function setNZFlags(cpu: CPU6502Interface, value: number): void {
    cpu.Z = (value & 0xff) === 0 ? 1 : 0;
    cpu.N = (value & 0x80) !== 0 ? 1 : 0;
}

function setNZCFlags(cpu: CPU6502Interface, value: number): void {
    cpu.Z = (value & 0xff) === 0 ? 1 : 0;
    cpu.N = (value & 0x80) !== 0 ? 1 : 0;
    cpu.C = (value & 0x100) !== 0 ? 1 : 0;
}

// Arithmetic Instructions

export function adc(this: CPU6502Interface): void {
    const v: number = this.read(this.addr);
    const c: number = this.C ? 1 : 0;
    const r: number = this.A + v + c;
    if (this.D) {
        let al: number = (this.A & 0x0f) + (v & 0x0f) + c;
        if (al > 9) al += 6;
        let ah: number = (this.A >> 4) + (v >> 4) + (al > 15 ? 1 : 0);
        this.Z = (r & 0xff) === 0 ? 1 : 0;
        this.N = (ah & 8) !== 0 ? 1 : 0;
        this.V = (~(this.A ^ v) & (this.A ^ (ah << 4)) & 0x80) !== 0 ? 1 : 0;
        if (ah > 9) ah += 6;
        this.C = ah > 15 ? 1 : 0;
        this.A = ((ah << 4) | (al & 15)) & 0xff;
    } else {
        this.Z = (r & 0xff) === 0 ? 1 : 0;
        this.N = (r & 0x80) !== 0 ? 1 : 0;
        this.V = (~(this.A ^ v) & (this.A ^ r) & 0x80) !== 0 ? 1 : 0;
        this.C = (r & 0x100) !== 0 ? 1 : 0;
        this.A = r & 0xff;
    }
}

export function sbc(this: CPU6502Interface): void {
    const v: number = this.read(this.addr);
    const c: number = 1 - (this.C ? 1 : 0);
    const r: number = this.A - v - c;
    if (this.D) {
        let al: number = (this.A & 0x0f) - (v & 0x0f) - c;
        if (al < 0) al -= 6;
        let ah: number = (this.A >> 4) - (v >> 4) - (al < 0 ? 1 : 0);
        this.Z = (r & 0xff) === 0 ? 1 : 0;
        this.N = (r & 0x80) !== 0 ? 1 : 0;
        this.V = ((this.A ^ v) & (this.A ^ r) & 0x80) !== 0 ? 1 : 0;
        this.C = (r & 0x100) !== 0 ? 0 : 1;
        if (ah < 0) ah -= 6;
        this.A = ((ah << 4) | (al & 15)) & 0xff;
    } else {
        this.Z = (r & 0xff) === 0 ? 1 : 0;
        this.N = (r & 0x80) !== 0 ? 1 : 0;
        this.V = ((this.A ^ v) & (this.A ^ r) & 0x80) !== 0 ? 1 : 0;
        this.C = (r & 0x100) !== 0 ? 0 : 1;
        this.A = r & 0xff;
    }
}

// Logical Instructions

export function and(this: CPU6502Interface): void {
    this.A &= this.read(this.addr);
    setNZFlags(this, this.A);
}

export function ora(this: CPU6502Interface): void {
    this.A |= this.read(this.addr);
    setNZFlags(this, this.A);
}

export function eor(this: CPU6502Interface): void {
    this.A ^= this.read(this.addr);
    setNZFlags(this, this.A);
}

export function bit(this: CPU6502Interface): void {
    this.tmp = this.read(this.addr);
    // Optimized flag setting using bit operations
    this.N = (this.tmp >> 7) & 1;        // Extract bit 7 directly
    this.V = (this.tmp >> 6) & 1;        // Extract bit 6 directly
    this.Z = (this.tmp & this.A) === 0 ? 1 : 0;  // Z flag logic unchanged
}

// Shift and Rotate Instructions

export function asl(this: CPU6502Interface): void {
    this.tmp = this.read(this.addr) << 1;
    setNZCFlags(this, this.tmp);
    this.tmp &= 0xff;
}

export function asla(this: CPU6502Interface): void {
    this.tmp = this.A << 1;
    setNZCFlags(this, this.tmp);
    this.A = this.tmp & 0xff;
}

export function lsr(this: CPU6502Interface): void {
    this.tmp = this.read(this.addr);
    this.tmp = ((this.tmp & 1) << 8) | (this.tmp >> 1);
    setNZCFlags(this, this.tmp);
    this.tmp &= 0xff;
}

export function lsra(this: CPU6502Interface): void {
    this.tmp = ((this.A & 1) << 8) | (this.A >> 1);
    setNZCFlags(this, this.tmp);
    this.A = this.tmp & 0xff;
}

export function rol(this: CPU6502Interface): void {
    this.tmp = (this.read(this.addr) << 1) | (this.C ? 1 : 0);
    setNZCFlags(this, this.tmp);
    this.tmp &= 0xff;
}

export function rola(this: CPU6502Interface): void {
    this.tmp = (this.A << 1) | (this.C ? 1 : 0);
    setNZCFlags(this, this.tmp);
    this.A = this.tmp & 0xff;
}

export function ror(this: CPU6502Interface): void {
    this.tmp = this.read(this.addr);
    this.tmp = ((this.tmp & 1) << 8) | ((this.C ? 1 : 0) << 7) | (this.tmp >> 1);
    setNZCFlags(this, this.tmp);
    this.tmp &= 0xff;
}

export function rora(this: CPU6502Interface): void {
    this.tmp = ((this.A & 1) << 8) | ((this.C ? 1 : 0) << 7) | (this.A >> 1);
    setNZCFlags(this, this.tmp);
    this.A = this.tmp & 0xff;
}

// Increment and Decrement Instructions

export function inc(this: CPU6502Interface): void {
    this.tmp = (this.read(this.addr) + 1) & 0xff;
    setNZFlags(this, this.tmp);
}

export function inx(this: CPU6502Interface): void {
    this.X = (this.X + 1) & 0xff;
    setNZFlags(this, this.X);
}

export function iny(this: CPU6502Interface): void {
    this.Y = (this.Y + 1) & 0xff;
    setNZFlags(this, this.Y);
}

export function dec(this: CPU6502Interface): void {
    this.tmp = (this.read(this.addr) - 1) & 0xff;
    setNZFlags(this, this.tmp);
}

export function dex(this: CPU6502Interface): void {
    this.X = (this.X - 1) & 0xff;
    setNZFlags(this, this.X);
}

export function dey(this: CPU6502Interface): void {
    this.Y = (this.Y - 1) & 0xff;
    setNZFlags(this, this.Y);
}

// Compare Instructions

export function cmp(this: CPU6502Interface): void {
    const result = this.A - this.read(this.addr);
    setNZFlags(this, result);
    this.C = (result & 0x100) === 0 ? 1 : 0;
}

export function cpx(this: CPU6502Interface): void {
    const result = this.X - this.read(this.addr);
    setNZFlags(this, result);
    this.C = (result & 0x100) === 0 ? 1 : 0;
}

export function cpy(this: CPU6502Interface): void {
    const result = this.Y - this.read(this.addr);
    setNZFlags(this, result);
    this.C = (result & 0x100) === 0 ? 1 : 0;
}

// Branch Instructions

export function bcc(this: CPU6502Interface): void {
    this.branch(this.C === 0);
}

export function bcs(this: CPU6502Interface): void {
    this.branch(this.C !== 0);
}

export function beq(this: CPU6502Interface): void {
    this.branch(this.Z !== 0);
}

export function bne(this: CPU6502Interface): void {
    this.branch(this.Z === 0);
}

export function bmi(this: CPU6502Interface): void {
    this.branch(this.N !== 0);
}

export function bpl(this: CPU6502Interface): void {
    this.branch(this.N === 0);
}

export function bvc(this: CPU6502Interface): void {
    this.branch(this.V === 0);
}

export function bvs(this: CPU6502Interface): void {
    this.branch(this.V !== 0);
}

// Jump and Subroutine Instructions

export function jmp(this: CPU6502Interface): void {
    this.PC = this.addr;
    this.cycles--;
}

export function jsr(this: CPU6502Interface): void {
    this.write((this.stackBase || 0x100) + this.S, (this.PC - 1) >> 8);
    this.S = (this.S - 1) & 0xff;
    this.write((this.stackBase || 0x100) + this.S, (this.PC - 1) & 0xff);
    this.S = (this.S - 1) & 0xff;
    this.PC = this.addr;
    this.cycles += 2;
}

export function rts(this: CPU6502Interface): void {
    this.S = (this.S + 1) & 0xff;
    this.PC = this.read((this.stackBase || 0x100) + this.S);
    this.S = (this.S + 1) & 0xff;
    this.PC |= this.read((this.stackBase || 0x100) + this.S) << 8;
    this.PC++;
    this.cycles += 4;
}

export function brk(this: CPU6502Interface): void {
    this.PC++;
    this.write((this.stackBase || 0x100) + this.S, this.PC >> 8);
    this.S = (this.S - 1) & 0xff;
    this.write((this.stackBase || 0x100) + this.S, this.PC & 0xff);
    this.S = (this.S - 1) & 0xff;
    let v: number = this.N ? 1 << 7 : 0;
    v |= this.V ? 1 << 6 : 0;
    v |= 3 << 4;
    v |= this.D ? 1 << 3 : 0;
    v |= this.I ? 1 << 2 : 0;
    v |= this.Z ? 1 << 1 : 0;
    v |= this.C ? 1 : 0;
    this.write((this.stackBase || 0x100) + this.S, v);
    this.S = (this.S - 1) & 0xff;
    this.I = 1;
    this.D = 0;
    this.PC = (this.read(0xffff) << 8) | this.read(0xfffe);
    this.cycles += 5;
}

export function rti(this: CPU6502Interface): void {
    this.S = (this.S + 1) & 0xff;
    this.tmp = this.read((this.stackBase || 0x100) + this.S);
    this.N = (this.tmp & 0x80) !== 0 ? 1 : 0;
    this.V = (this.tmp & 0x40) !== 0 ? 1 : 0;
    this.D = (this.tmp & 0x08) !== 0 ? 1 : 0;
    this.I = (this.tmp & 0x04) !== 0 ? 1 : 0;
    this.Z = (this.tmp & 0x02) !== 0 ? 1 : 0;
    this.C = (this.tmp & 0x01) !== 0 ? 1 : 0;
    this.S = (this.S + 1) & 0xff;
    this.PC = this.read((this.stackBase || 0x100) + this.S);
    this.S = (this.S + 1) & 0xff;
    this.PC |= this.read((this.stackBase || 0x100) + this.S) << 8;
    this.cycles += 4;
}

// Stack Instructions

export function pha(this: CPU6502Interface): void {
    this.write(this.S + 0x100, this.A);
    this.S = (this.S - 1) & 0xff;
    this.cycles++;
}

export function php(this: CPU6502Interface): void {
    let v: number = this.N ? 1 << 7 : 0;
    v |= this.V ? 1 << 6 : 0;
    v |= 3 << 4;
    v |= this.D ? 1 << 3 : 0;
    v |= this.I ? 1 << 2 : 0;
    v |= this.Z ? 1 << 1 : 0;
    v |= this.C ? 1 : 0;
    this.write((this.stackBase || 0x100) + this.S, v);
    this.S = (this.S - 1) & 0xff;
    this.cycles++;
}

export function pla(this: CPU6502Interface): void {
    this.S = (this.S + 1) & 0xff;
    this.A = this.read((this.stackBase || 0x100) + this.S);
    setNZFlags(this, this.A);
    this.cycles += 2;
}

export function plp(this: CPU6502Interface): void {
    this.S = (this.S + 1) & 0xff;
    this.tmp = this.read((this.stackBase || 0x100) + this.S);
    this.N = (this.tmp & 0x80) !== 0 ? 1 : 0;
    this.V = (this.tmp & 0x40) !== 0 ? 1 : 0;
    this.D = (this.tmp & 0x08) !== 0 ? 1 : 0;
    this.I = (this.tmp & 0x04) !== 0 ? 1 : 0;
    this.Z = (this.tmp & 0x02) !== 0 ? 1 : 0;
    this.C = (this.tmp & 0x01) !== 0 ? 1 : 0;
    this.cycles += 2;
}

// Transfer Instructions

export function tax(this: CPU6502Interface): void {
    this.X = this.A;
    setNZFlags(this, this.X);
}

export function tay(this: CPU6502Interface): void {
    this.Y = this.A;
    setNZFlags(this, this.Y);
}

export function tsx(this: CPU6502Interface): void {
    this.X = this.S;
    setNZFlags(this, this.X);
}

export function txa(this: CPU6502Interface): void {
    this.A = this.X;
    setNZFlags(this, this.A);
}

export function txs(this: CPU6502Interface): void {
    this.S = this.X;
}

export function tya(this: CPU6502Interface): void {
    this.A = this.Y;
    setNZFlags(this, this.A);
}

// Load and Store Instructions

export function lda(this: CPU6502Interface): void {
    this.A = this.read(this.addr);
    setNZFlags(this, this.A);
}

export function ldx(this: CPU6502Interface): void {
    this.X = this.read(this.addr);
    setNZFlags(this, this.X);
}

export function ldy(this: CPU6502Interface): void {
    this.Y = this.read(this.addr);
    setNZFlags(this, this.Y);
}

export function sta(this: CPU6502Interface): void {
    this.write(this.addr, this.A);
}

export function stx(this: CPU6502Interface): void {
    this.write(this.addr, this.X);
}

export function sty(this: CPU6502Interface): void {
    this.write(this.addr, this.Y);
}

// Flag Instructions

export function clc(this: CPU6502Interface): void {
    this.C = 0;
}

export function cld(this: CPU6502Interface): void {
    this.D = 0;
}

export function cli(this: CPU6502Interface): void {
    this.I = 0;
    if (this.updateIrqPending) this.updateIrqPending();
}

export function clv(this: CPU6502Interface): void {
    this.V = 0;
}

export function sec(this: CPU6502Interface): void {
    this.C = 1;
}

export function sed(this: CPU6502Interface): void {
    this.D = 1;
}

export function sei(this: CPU6502Interface): void {
    this.I = 1;
    if (this.updateIrqPending) this.updateIrqPending();
}

// Miscellaneous Instructions

export function nop(this: CPU6502Interface): void {
    // No operation
}

// Illegal/Undocumented Instructions

export function slo(this: CPU6502Interface): void {
    this.tmp = this.read(this.addr) << 1;
    this.tmp |= this.A;
    setNZCFlags(this, this.tmp);
    this.A = this.tmp & 0xff;
}

export function isc(this: CPU6502Interface): void {
    const v = (this.read(this.addr) + 1) & 0xff;
    const c = 1 - (this.C ? 1 : 0);
    const r = this.A - v - c;
    if (this.D) {
        let al = (this.A & 0x0f) - (v & 0x0f) - c;
        if (al > 0x80) al -= 6;
        let ah = (this.A >> 4) - (v >> 4) - (al > 0x80 ? 1 : 0);
        this.Z = (r & 0xff) === 0 ? 1 : 0;
        this.N = (r & 0x80) !== 0 ? 1 : 0;
        this.V = ((this.A ^ v) & (this.A ^ r) & 0x80) !== 0 ? 1 : 0;
        this.C = (r & 0x100) !== 0 ? 0 : 1;
        if (ah > 0x80) ah -= 6;
        this.A = ((ah << 4) | (al & 15)) & 0xff;
    } else {
        this.Z = (r & 0xff) === 0 ? 1 : 0;
        this.N = (r & 0x80) !== 0 ? 1 : 0;
        this.V = ((this.A ^ v) & (this.A ^ r) & 0x80) !== 0 ? 1 : 0;
        this.C = (r & 0x100) !== 0 ? 0 : 1;
        this.A = r & 0xff;
    }
}

export function anc(this: CPU6502Interface): void {
    this.tmp = this.read(this.addr);
    this.tmp |= (this.tmp & 0x80 & (this.A & 0x80)) << 1;
    this.Z = (this.tmp & 0xff) === 0 ? 1 : 0;
    this.N = (this.tmp & 0x80) !== 0 ? 1 : 0;
    this.C = (this.tmp & 0x100) !== 0 ? 1 : 0;
    this.A = this.tmp & 0xff;
}

export function rla(this: CPU6502Interface): void {
    this.tmp = (this.A << 1) | (this.C ? 1 : 0);
    setNZCFlags(this, this.tmp);
    this.A = this.tmp & 0xff;
}

export function sre(this: CPU6502Interface): void {
    const v = this.read(this.addr);
    this.tmp = ((v & 1) << 8) | (v >> 1);
    this.tmp ^= this.A;
    setNZCFlags(this, this.tmp);
    this.A = this.tmp & 0xff;
}

export function alr(this: CPU6502Interface): void {
    this.tmp = this.read(this.addr) & this.A;
    this.tmp = ((this.tmp & 1) << 8) | (this.tmp >> 1);
    setNZCFlags(this, this.tmp);
    this.A = this.tmp & 0xff;
}

export function rra(this: CPU6502Interface): void {
    this.tmp = ((this.A & 1) << 8) | ((this.C ? 1 : 0) << 7) | (this.A >> 1);
    setNZCFlags(this, this.tmp);
    this.A = this.tmp & 0xff;
}

export function sax(this: CPU6502Interface): void {
    this.write(this.addr, this.A & this.X);
}

export function lax(this: CPU6502Interface): void {
    this.X = this.A = this.read(this.addr);
    setNZFlags(this, this.A);
}

export function arr(this: CPU6502Interface): void {
    this.tmp = this.read(this.addr) & this.A;
    this.C = (this.tmp & 0x80) !== 0 ? 1 : 0;
    this.V = (((this.tmp >> 7) & 1) ^ ((this.tmp >> 6) & 1)) !== 0 ? 1 : 0;
    if (this.D) {
        let al = (this.tmp & 0x0f) + (this.tmp & 1);
        if (al > 5) al += 6;
        const ah = ((this.tmp >> 4) & 0x0f) + ((this.tmp >> 4) & 1);
        if (ah > 5) {
            al += 6;
            this.C = 1;
        } else {
            this.C = 0;
        }
        this.tmp = (ah << 4) | al;
    }
    setNZFlags(this, this.tmp);
    this.A = this.tmp & 0xff;
}

export function shy(this: CPU6502Interface): void {
    this.tmp = ((this.addr >> 8) + 1) & this.Y;
    this.write(this.addr, this.tmp & 0xff);
}

export function dcp(this: CPU6502Interface): void {
    this.tmp = (this.read(this.addr) - 1) & 0xff;
    this.tmp = this.A - this.tmp;
    setNZFlags(this, this.tmp);
    this.C = (this.tmp & 0x100) === 0 ? 1 : 0;
}

export function las(this: CPU6502Interface): void {
    this.S = this.X = this.A = this.read(this.addr) & this.S;
    setNZFlags(this, this.A);
}

export function ahx(this: CPU6502Interface): void {
    this.tmp = ((this.addr >> 8) + 1) & this.A & this.X;
    this.write(this.addr, this.tmp & 0xff);
}

export function shx(this: CPU6502Interface): void {
    this.tmp = ((this.addr >> 8) + 1) & this.X;
    this.write(this.addr, this.tmp & 0xff);
}

export function kil(this: CPU6502Interface): void {
    // KIL/JAM/HLT - Halts the CPU by jamming the program counter
    // This effectively freezes execution at the current PC
    this.PC--;
    // Note: In real hardware this would require a reset, but for emulation
    // we simply prevent PC advancement to simulate the jam state
}

export function tas(this: CPU6502Interface): void {
    // TAS (Transfer A AND X to Stack pointer, Store A AND X AND (H+1))
    // S = A & X; Store A & X & (high_byte_of_address + 1) to memory
    this.S = this.A & this.X;
    this.tmp = this.A & this.X & ((this.addr >> 8) + 1);
    this.write(this.addr, this.tmp & 0xff);
}

export function axs(this: CPU6502Interface): void {
    // AXS/SBX (A AND X minus immediate, store in X)
    // X = (A & X) - immediate, set flags
    const v = this.read(this.addr);
    this.tmp = (this.A & this.X) - v;
    this.X = this.tmp & 0xff;
    setNZFlags(this, this.tmp);
    this.C = (this.tmp & 0x100) === 0 ? 1 : 0;
}

export function xaa(this: CPU6502Interface): void {
    // XAA/ANE (Transfer X to A, then AND with immediate)
    // A = X & immediate
    // Note: This opcode is highly unstable on real hardware and behavior
    // varies between different 6502 variants. This is a simplified implementation.
    this.A = this.X & this.read(this.addr);
    setNZFlags(this, this.A);
}