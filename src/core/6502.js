// @flow
import type AddressSpaces from './AddressSpaces'

class CPU6502 {
    addressSpace: AddressSpaces;
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

    cycles: number;

    constructor(addressSpace: AddressSpaces) {
        this.addressSpace=addressSpace;

        this.PC = 0; // Program counter
        this.A = 0; this.X = 0; this.Y = 0; this.S = 0; // Registers
        this.N = 0; this.Z = 1; this.C = 0; this.V = 0; // ALU flags
        this.I = 0; this.D = 0; // Other flags

        this.irq = 0; this.nmi = 0; // IRQ lines

        this.tmp = 0; this.addr = 0; // Temporary registers
        this.opcode = 0; // Current opcode
        this.cycles = 0; // Cycles counter
    }

    ////////////////////////////////////////////////////////////////////////////////
    // CPU control
    ////////////////////////////////////////////////////////////////////////////////

    reset(): void {
        this.A = 0; this.X = 0; this.Y = 0; this.S = 0;
        this.N = 0; this.Z = 1; this.C = 0; this.V = 0;
        this.I = 0; this.D = 0;

        this.PC = (this.read(0xFFFD) << 8) | this.read(0xFFFC);
    }

    step(): void {
        this.opcode = this.read( this.PC++ );
        CPU6502op[ this.opcode ]( this );
    }

    read(address: number): number {
        return this.addressSpace.read(address);
    }

    write(address: number, value: number): void {
        this.addressSpace.write(address, value);
    }

    log(): void {
        let msg: string = "nPC=" + this.PC.toString(16);
        msg += " cyc=" + this.cycles;
        msg += " [" + this.opcode.toString(16) + "] ";
        msg += ( this.C ? "C" : "-");
        msg += ( this.N ? "N" : "-");
        msg += ( this.Z ? "Z" : "-");
        msg += ( this.V ? "V" : "-");
        msg += ( this.D ? "D" : "-");
        msg += ( this.I ? "I" : "-");
        msg += " A=" + this.A.toString(16);
        msg += " X=" + this.X.toString(16);
        msg += " Y=" + this.Y.toString(16);
        msg += " S=" + this.S.toString(16);
        console.log(msg);
    }

    ////////////////////////////////////////////////////////////////////////////////
    // Subroutines - addressing modes & flags
    ////////////////////////////////////////////////////////////////////////////////

    izx(): void {
        let a: number = (this.read(this.PC++) + this.X) & 0xFF;
        this.addr = (this.read(a+1) << 8) | this.read(a);
        this.cycles += 6;
    }

    izy(): void {
        let a: number = this.read(this.PC++);
        let paddr: number = (this.read((a+1) & 0xFF) << 8) | this.read(a);
        this.addr = (paddr + this.Y);
        if ( (paddr & 0x100) != (this.addr & 0x100) ) {
            this.cycles += 6;
        } else {
            this.cycles += 5;
        }
    }

    ind(): void {
        let a: number = this.read(this.PC);
        a |= this.read( (this.PC & 0xFF00) | ((this.PC + 1) & 0xFF) ) << 8;
        this.addr = this.read(a);
        this.addr |= (this.read(a+1) << 8);
        this.cycles += 5;
    }

    zp(): void {
        this.addr = this.read(this.PC++);
        this.cycles += 3;
    }

    zpx(): void {
        this.addr = (this.read(this.PC++) + this.X) & 0xFF;
        this.cycles += 4;
    }

    zpy(): void {
        this.addr = (this.read(this.PC++) + this.Y) & 0xFF;
        this.cycles += 4;
    }

    imp(): void {
        this.cycles += 2;
    }

    imm(): void {
        this.addr = this.PC++;
        this.cycles += 2;
    }

    abs(): void {
        this.addr = this.read(this.PC++);
        this.addr |= (this.read(this.PC++) << 8);
        this.cycles += 4;
    }

    abx(): void {
        let paddr: number = this.read(this.PC++);
        paddr |= (this.read(this.PC++) << 8);
        this.addr = (paddr + this.X);
        if ( (paddr & 0x100) != (this.addr & 0x100) ) {
            this.cycles += 5;
        } else {
            this.cycles += 4;
        }
    }

    aby(): void {
        let paddr: number = this.read(this.PC++);
        paddr |= (this.read(this.PC++) << 8);
        this.addr = (paddr + this.Y);
        if ( (paddr & 0x100) != (this.addr & 0x100) ) {
            this.cycles += 5;
        } else {
            this.cycles += 4;
        }
    }

    rel(): void {
        this.addr = this.read(this.PC++);
        if (this.addr & 0x80) {
            this.addr -= 0x100;
        }
        this.addr += this.PC;
        this.cycles += 2;
    }

    ////////////////////////////////////////////////////////////////////////////////

    rmw(): void {
        this.write(this.addr, this.tmp & 0xFF);
        this.cycles += 2;
    }

    ////////////////////////////////////////////////////////////////////////////////

    fnz(v: number): void {
        this.Z = ((v & 0xFF) == 0) ? 1 : 0;
        this.N = ((v & 0x80) != 0) ? 1 : 0;
    }

    // Borrow
    fnzb(v: number): void {
        this.Z = ((v & 0xFF) == 0) ? 1 : 0;
        this.N = ((v & 0x80) != 0) ? 1 : 0;
        this.C = ((v & 0x100) != 0) ? 0 : 1;
    }

    // Carry
    fnzc(v: number): void {
        this.Z = ((v & 0xFF) == 0) ? 1 : 0;
        this.N = ((v & 0x80) != 0) ? 1 : 0;
        this.C = ((v & 0x100) != 0) ? 1 : 0;
    }

    branch(v: number): void {
        if (v) {
            if ( (this.addr & 0x100) != (this.PC & 0x100) ) {
                this.cycles += 2;
            } else {
                this.cycles += 1;
            }
            this.PC = this.addr;
        }
    }

    ////////////////////////////////////////////////////////////////////////////////
    // Subroutines - instructions
    ////////////////////////////////////////////////////////////////////////////////
    adc(): void {
        let v: number = this.read(this.addr);
        let c: number = this.C;
        let r: number = this.A + v + c;
        if (this.D) {
            let al: number = (this.A & 0x0F) + (v & 0x0F) + c;
            if (al > 9) al += 6;
            let ah: number = (this.A >> 4) + (v >> 4) + ((al > 15) ? 1 : 0);
            this.Z = ((r & 0xFF) == 0) ? 1 : 0;
            this.N = ((ah & 8) != 0) ? 1 : 0;
            this.V = ((~(this.A ^ v) & (this.A ^ (ah << 4)) & 0x80) != 0) ? 1 : 0;
            if (ah > 9) ah += 6;
            this.C = (ah > 15) ? 1 : 0;
            this.A = ((ah << 4) | (al & 15)) & 0xFF;
        } else {
            this.Z = ((r & 0xFF) == 0) ? 1 : 0;
            this.N = ((r & 0x80) != 0) ? 1 : 0;
            this.V = ((~(this.A ^ v) & (this.A ^ r) & 0x80) != 0) ? 1 : 0;
            this.C = ((r & 0x100) != 0) ? 1 : 0;
            this.A = r & 0xFF;
        }
    }

    and(): void {
        this.A &= this.read(this.addr);
        this.fnz(this.A);
    }

    asl(): void {
        this.tmp = this.read(this.addr) << 1;
        this.fnzc(this.tmp);
        this.tmp &= 0xFF;
    }
    asla(): void {
        this.tmp = this.A << 1;
        this.fnzc(this.tmp);
        this.A = this.tmp & 0xFF;
    }

    bit(): void {
        this.tmp = this.read(this.addr);
        this.N = ((this.tmp & 0x80) != 0) ? 1 : 0;
        this.V = ((this.tmp & 0x40) != 0) ? 1 : 0;
        this.Z = ((this.tmp & this.A) == 0) ? 1 : 0;
    }

    brk(): void {
        this.PC++;
        this.write(this.S + 0x100, this.PC >> 8);
        this.S = (this.S - 1) & 0xFF;
        this.write(this.S + 0x100, this.PC & 0xFF);
        this.S = (this.S - 1) & 0xFF;
        let v: number = this.N << 7;
        v |= this.V << 6;
        v |= 3 << 4;
        v |= this.D << 3;
        v |= this.I << 2;
        v |= this.Z << 1;
        v |= this.C;
        this.write(this.S + 0x100, v);
        this.S = (this.S - 1) & 0xFF;
        this.I = 1;
        this.D = 0;
        this.PC = (this.read(0xFFFF) << 8) | this.read(0xFFFE);
        this.cycles += 5;
    }

    bcc(): void { this.branch( this.C == 0 ? 1 : 0 ); }
    bcs(): void { this.branch( this.C == 1 ? 1 : 0  ); }
    beq(): void { this.branch( this.Z == 1 ? 1 : 0  ); }
    bne(): void { this.branch( this.Z == 0 ? 1 : 0  ); }
    bmi(): void { this.branch( this.N == 1 ? 1 : 0  ); }
    bpl(): void { this.branch( this.N == 0 ? 1 : 0  ); }
    bvc(): void { this.branch( this.V == 0 ? 1 : 0  ); }
    bvs(): void { this.branch( this.V == 1 ? 1 : 0  ); }


    clc(): void { this.C = 0; }
    cld(): void { this.D = 0; }
    cli(): void { this.I = 0; }
    clv(): void { this.V = 0; }

    cmp(): void {
        this.fnzb( this.A - this.read(this.addr) );
    }

    cpx(): void {
        this.fnzb( this.X - this.read(this.addr) );
    }

    cpy(): void {
        this.fnzb( this.Y - this.read(this.addr) );
    }

    dec(): void {
        this.tmp = (this.read(this.addr) - 1) & 0xFF;
        this.fnz(this.tmp);
    }

    dex(): void {
        this.X = (this.X - 1) & 0xFF;
        this.fnz(this.X);
    }

    dey(): void {
        this.Y = (this.Y - 1) & 0xFF;
        this.fnz(this.Y);
    }

    eor(): void {
        this.A ^= this.read(this.addr);
        this.fnz(this.A);
    }

    inc(): void {
        this.tmp = (this.read(this.addr) + 1) & 0xFF;
        this.fnz(this.tmp);
    }

    inx() {
        this.X = (this.X + 1) & 0xFF;
        this.fnz(this.X);
    }

    iny(): void {
        this.Y = (this.Y + 1) & 0xFF;
        this.fnz(this.Y);
    }

    jmp(): void {
        this.PC = this.addr;
        this.cycles--;
    }

    jsr(): void {
        this.write(this.S + 0x100, (this.PC - 1) >> 8);
        this.S = (this.S - 1) & 0xFF;
        this.write(this.S + 0x100, (this.PC - 1) & 0xFF);
        this.S = (this.S - 1) & 0xFF;
        this.PC = this.addr;
        this.cycles += 2;
    }

    lda(): void {
        this.A = this.read(this.addr);
        this.fnz(this.A);
    }

    ldx(): void {
        this.X = this.read(this.addr);
        this.fnz(this.X);
    }

    ldy(): void {
        this.Y = this.read(this.addr);
        this.fnz(this.Y);
    }

    ora(): void {
        this.A |= this.read(this.addr);
        this.fnz(this.A);
    }

    rol(): void {
        this.tmp = (this.read(this.addr) << 1) | this.C;
        this.fnzc(this.tmp);
        this.tmp &= 0xFF;
    }
    rola(): void {
        this.tmp = (this.A << 1) | this.C;
        this.fnzc(this.tmp);
        this.A = this.tmp & 0xFF;
    }

    ror(): void {
        this.tmp = this.read(this.addr);
        this.tmp = ((this.tmp & 1) << 8) | (this.C << 7) | (this.tmp >> 1);
        this.fnzc(this.tmp);
        this.tmp &= 0xFF;
    }
    rora(): void {
        this.tmp = ((this.A & 1) << 8) | (this.C << 7) | (this.A >> 1);
        this.fnzc(this.tmp);
        this.A = this.tmp & 0xFF;
    }


    lsr(): void {
        this.tmp = this.read(this.addr);
        this.tmp = ((this.tmp & 1) << 8) | (this.tmp >> 1);
        this.fnzc(this.tmp);
        this.tmp &= 0xFF;
    }
    lsra(): void {
        this.tmp = ((this.A & 1) << 8) | (this.A >> 1);
        this.fnzc(this.tmp);
        this.A = this.tmp & 0xFF;
    }


    nop(): void { }

    pha(): void {
        this.write(this.S + 0x100, this.A);
        this.S = (this.S - 1) & 0xFF;
        this.cycles++;
    }

    php(): void {
        let v: number = this.N << 7;
        v |= this.V << 6;
        v |= 3 << 4;
        v |= this.D << 3;
        v |= this.I << 2;
        v |= this.Z << 1;
        v |= this.C;
        this.write(this.S + 0x100, v);
        this.S = (this.S - 1) & 0xFF;
        this.cycles++;
    }

    pla(): void {
        this.S = (this.S + 1) & 0xFF;
        this.A = this.read(this.S + 0x100);
        this.fnz(this.A);
        this.cycles += 2;
    }

    plp(): void {
        this.S = (this.S + 1) & 0xFF;
        this.tmp = this.read(this.S + 0x100);
        this.N = ((this.tmp & 0x80) != 0) ? 1 : 0;
        this.V = ((this.tmp & 0x40) != 0) ? 1 : 0;
        this.D = ((this.tmp & 0x08) != 0) ? 1 : 0;
        this.I = ((this.tmp & 0x04) != 0) ? 1 : 0;
        this.Z = ((this.tmp & 0x02) != 0) ? 1 : 0;
        this.C = ((this.tmp & 0x01) != 0) ? 1 : 0;
        this.cycles += 2;
    }

    rti(): void {
        this.S = (this.S + 1) & 0xFF;
        this.tmp = this.read(this.S + 0x100);
        this.N = ((this.tmp & 0x80) != 0) ? 1 : 0;
        this.V = ((this.tmp & 0x40) != 0) ? 1 : 0;
        this.D = ((this.tmp & 0x08) != 0) ? 1 : 0;
        this.I = ((this.tmp & 0x04) != 0) ? 1 : 0;
        this.Z = ((this.tmp & 0x02) != 0) ? 1 : 0;
        this.C = ((this.tmp & 0x01) != 0) ? 1 : 0;
        this.S = (this.S + 1) & 0xFF;
        this.PC = this.read(this.S + 0x100);
        this.S = (this.S + 1) & 0xFF;
        this.PC |= this.read(this.S + 0x100) << 8;
        this.cycles += 4;
    }

    rts(): void {
        this.S = (this.S + 1) & 0xFF;
        this.PC = this.read(this.S + 0x100);
        this.S = (this.S + 1) & 0xFF;
        this.PC |= this.read(this.S + 0x100) << 8;
        this.PC++;
        this.cycles += 4;
    }

    sbc(): void {
        let v: number = this.read(this.addr);
        let c: number = 1 - this.C;
        let r: number = this.A - v - c;
        if (this.D) {
            let al: number = (this.A & 0x0F) - (v & 0x0F) - c;
            if (al < 0) al -= 6;
            let ah: number = (this.A >> 4) - (v >> 4) - ((al < 0) ? 1 : 0);
            this.Z = ((r & 0xFF) == 0) ? 1 : 0;
            this.N = ((r & 0x80) != 0) ? 1 : 0;
            this.V = (((this.A ^ v) & (this.A ^ r) & 0x80) != 0) ? 1 : 0;
            this.C = ((r & 0x100) != 0) ? 0 : 1;
            if (ah < 0) ah -= 6;
            this.A = ((ah << 4) | (al & 15)) & 0xFF;
        } else {
            this.Z = ((r & 0xFF) == 0) ? 1 : 0;
            this.N = ((r & 0x80) != 0) ? 1 : 0;
            this.V = (((this.A ^ v) & (this.A ^ r) & 0x80) != 0) ? 1 : 0;
            this.C = ((r & 0x100) != 0) ? 0 : 1;
            this.A = r & 0xFF;
        }
    }


    sec(): void { this.C = 1; }
    sed(): void { this.D = 1; }
    sei(): void { this.I = 1; }


    slo(): void {
        this.tmp = this.read(this.addr) << 1;
        this.tmp |= this.A;
        this.fnzc(this.tmp);
        this.A = this.tmp & 0xFF;
    }

    sta(): void {
        this.write(this.addr, this.A);
    }

    stx(): void {
        this.write(this.addr, this.X);
    }

    sty(): void {
        this.write(this.addr, this.Y);
    }

    tax(): void {
        this.X = this.A;
        this.fnz(this.X);
    }

    tay(): void {
        this.Y = this.A;
        this.fnz(this.Y);
    }

    tsx(): void {
        this.X = this.S;
        this.fnz(this.X);
    }

    txa(): void {
        this.A = this.X;
        this.fnz(this.A);
    }

    txs(): void {
        this.S = this.X;
    }

    tya(): void {
        this.A = this.Y;
        this.fnz(this.A);
    }
}



////////////////////////////////////////////////////////////////////////////////
// Opcode table
////////////////////////////////////////////////////////////////////////////////

let CPU6502op: Array<Function> = [];

/*  BRK     */ CPU6502op[0x00] = (m: CPU6502) => { m.imp(); m.brk(); };
/*  ORA izx */ CPU6502op[0x01] = (m: CPU6502) => { m.izx(); m.ora(); };
/* *KIL     */ CPU6502op[0x02] = (m: CPU6502) => { m.imp(); m.kil(); };
/* *SLO izx */ CPU6502op[0x03] = (m: CPU6502) => { m.izx(); m.slo(); m.rmw(); };
/* *NOP zp  */ CPU6502op[0x04] = (m: CPU6502) => { m.zp(); m.nop(); };
/*  ORA zp  */ CPU6502op[0x05] = (m: CPU6502) => { m.zp(); m.ora(); };
/*  ASL zp  */ CPU6502op[0x06] = (m: CPU6502) => { m.zp(); m.asl(); m.rmw(); };
/* *SLO zp  */ CPU6502op[0x07] = (m: CPU6502) => { m.zp(); m.slo(); m.rmw(); };
/*  PHP     */ CPU6502op[0x08] = (m: CPU6502) => { m.imp(); m.php(); };
/*  ORA imm */ CPU6502op[0x09] = (m: CPU6502) => { m.imm(); m.ora(); };
/*  ASL     */ CPU6502op[0x0A] = (m: CPU6502) => { m.imp(); m.asla(); };
/* *ANC imm */ CPU6502op[0x0B] = (m: CPU6502) => { m.imm(); m.anc(); };
/* *NOP abs */ CPU6502op[0x0C] = (m: CPU6502) => { m.abs(); m.nop(); };
/*  ORA abs */ CPU6502op[0x0D] = (m: CPU6502) => { m.abs(); m.ora(); };
/*  ASL abs */ CPU6502op[0x0E] = (m: CPU6502) => { m.abs(); m.asl(); m.rmw(); };
/* *SLO abs */ CPU6502op[0x0F] = (m: CPU6502) => { m.abs(); m.slo(); m.rmw(); };

/*  BPL rel */ CPU6502op[0x10] = (m: CPU6502) => { m.rel(); m.bpl(); };
/*  ORA izy */ CPU6502op[0x11] = (m: CPU6502) => { m.izy(); m.ora(); };
/* *KIL     */ CPU6502op[0x12] = (m: CPU6502) => { m.imp(); m.kil(); };
/* *SLO izy */ CPU6502op[0x13] = (m: CPU6502) => { m.izy(); m.slo(); m.rmw(); };
/* *NOP zpx */ CPU6502op[0x14] = (m: CPU6502) => { m.zpx(); m.nop(); };
/*  ORA zpx */ CPU6502op[0x15] = (m: CPU6502) => { m.zpx(); m.ora(); };
/*  ASL zpx */ CPU6502op[0x16] = (m: CPU6502) => { m.zpx(); m.asl(); m.rmw(); };
/* *SLO zpx */ CPU6502op[0x17] = (m: CPU6502) => { m.zpx(); m.slo(); m.rmw(); };
/*  CLC     */ CPU6502op[0x18] = (m: CPU6502) => { m.imp(); m.clc(); };
/*  ORA aby */ CPU6502op[0x19] = (m: CPU6502) => { m.aby(); m.ora(); };
/* *NOP     */ CPU6502op[0x1A] = (m: CPU6502) => { m.imp(); m.nop(); };
/* *SLO aby */ CPU6502op[0x1B] = (m: CPU6502) => { m.aby(); m.slo(); m.rmw(); };
/* *NOP abx */ CPU6502op[0x1C] = (m: CPU6502) => { m.abx(); m.nop(); };
/*  ORA abx */ CPU6502op[0x1D] = (m: CPU6502) => { m.abx(); m.ora(); };
/*  ASL abx */ CPU6502op[0x1E] = (m: CPU6502) => { m.abx(); m.asl(); m.rmw(); };
/* *SLO abx */ CPU6502op[0x1F] = (m: CPU6502) => { m.abx(); m.slo(); m.rmw(); };

/*  JSR abs */ CPU6502op[0x20] = (m: CPU6502) => { m.abs(); m.jsr(); };
/*  AND izx */ CPU6502op[0x21] = (m: CPU6502) => { m.izx(); m.and(); };
/* *KIL     */ CPU6502op[0x22] = (m: CPU6502) => { m.imp(); m.kil(); };
/* *RLA izx */ CPU6502op[0x23] = (m: CPU6502) => { m.izx(); m.rla(); m.rmw(); };
/*  BIT zp  */ CPU6502op[0x24] = (m: CPU6502) => { m.zp(); m.bit(); };
/*  AND zp  */ CPU6502op[0x25] = (m: CPU6502) => { m.zp(); m.and(); };
/*  ROL zp  */ CPU6502op[0x26] = (m: CPU6502) => { m.zp(); m.rol(); m.rmw(); };
/* *RLA zp  */ CPU6502op[0x27] = (m: CPU6502) => { m.zp(); m.rla(); m.rmw(); };
/*  PLP     */ CPU6502op[0x28] = (m: CPU6502) => { m.imp(); m.plp(); };
/*  AND imm */ CPU6502op[0x29] = (m: CPU6502) => { m.imm(); m.and(); };
/*  ROL     */ CPU6502op[0x2A] = (m: CPU6502) => { m.imp(); m.rola(); };
/* *ANC imm */ CPU6502op[0x2B] = (m: CPU6502) => { m.imm(); m.anc(); };
/*  BIT abs */ CPU6502op[0x2C] = (m: CPU6502) => { m.abs(); m.bit(); };
/*  AND abs */ CPU6502op[0x2D] = (m: CPU6502) => { m.abs(); m.and(); };
/*  ROL abs */ CPU6502op[0x2E] = (m: CPU6502) => { m.abs(); m.rol(); m.rmw(); };
/* *RLA abs */ CPU6502op[0x2F] = (m: CPU6502) => { m.abs(); m.rla(); m.rmw(); };

/*  BMI rel */ CPU6502op[0x30] = (m: CPU6502) => { m.rel(); m.bmi(); };
/*  AND izy */ CPU6502op[0x31] = (m: CPU6502) => { m.izy(); m.and(); };
/* *KIL     */ CPU6502op[0x32] = (m: CPU6502) => { m.imp(); m.kil(); };
/* *RLA izy */ CPU6502op[0x33] = (m: CPU6502) => { m.izy(); m.rla(); m.rmw(); };
/* *NOP zpx */ CPU6502op[0x34] = (m: CPU6502) => { m.zpx(); m.nop(); };
/*  AND zpx */ CPU6502op[0x35] = (m: CPU6502) => { m.zpx(); m.and(); };
/*  ROL zpx */ CPU6502op[0x36] = (m: CPU6502) => { m.zpx(); m.rol(); m.rmw(); };
/* *RLA zpx */ CPU6502op[0x37] = (m: CPU6502) => { m.zpx(); m.rla(); m.rmw(); };
/*  SEC     */ CPU6502op[0x38] = (m: CPU6502) => { m.imp(); m.sec(); };
/*  AND aby */ CPU6502op[0x39] = (m: CPU6502) => { m.aby(); m.and(); };
/* *NOP     */ CPU6502op[0x3A] = (m: CPU6502) => { m.imp(); m.nop(); };
/* *RLA aby */ CPU6502op[0x3B] = (m: CPU6502) => { m.aby(); m.rla(); m.rmw(); };
/* *NOP abx */ CPU6502op[0x3C] = (m: CPU6502) => { m.abx(); m.nop(); };
/*  AND abx */ CPU6502op[0x3D] = (m: CPU6502) => { m.abx(); m.and(); };
/*  ROL abx */ CPU6502op[0x3E] = (m: CPU6502) => { m.abx(); m.rol(); m.rmw(); };
/* *RLA abx */ CPU6502op[0x3F] = (m: CPU6502) => { m.abx(); m.rla(); m.rmw(); };

/*  RTI     */ CPU6502op[0x40] = (m: CPU6502) => { m.imp(); m.rti(); };
/*  EOR izx */ CPU6502op[0x41] = (m: CPU6502) => { m.izx(); m.eor(); };
/* *KIL     */ CPU6502op[0x42] = (m: CPU6502) => { m.imp(); m.kil(); };
/* *SRE izx */ CPU6502op[0x43] = (m: CPU6502) => { m.izx(); m.sre(); m.rmw(); };
/* *NOP zp  */ CPU6502op[0x44] = (m: CPU6502) => { m.zp(); m.nop(); };
/*  EOR zp  */ CPU6502op[0x45] = (m: CPU6502) => { m.zp(); m.eor(); };
/*  LSR zp  */ CPU6502op[0x46] = (m: CPU6502) => { m.zp(); m.lsr(); m.rmw(); };
/* *SRE zp  */ CPU6502op[0x47] = (m: CPU6502) => { m.zp(); m.sre(); m.rmw(); };
/*  PHA     */ CPU6502op[0x48] = (m: CPU6502) => { m.imp(); m.pha(); };
/*  EOR imm */ CPU6502op[0x49] = (m: CPU6502) => { m.imm(); m.eor(); };
/*  LSR     */ CPU6502op[0x4A] = (m: CPU6502) => { m.imp(); m.lsra(); };
/* *ALR imm */ CPU6502op[0x4B] = (m: CPU6502) => { m.imm(); m.alr(); };
/*  JMP abs */ CPU6502op[0x4C] = (m: CPU6502) => { m.abs(); m.jmp(); };
/*  EOR abs */ CPU6502op[0x4D] = (m: CPU6502) => { m.abs(); m.eor(); };
/*  LSR abs */ CPU6502op[0x4E] = (m: CPU6502) => { m.abs(); m.lsr(); m.rmw(); };
/* *SRE abs */ CPU6502op[0x4F] = (m: CPU6502) => { m.abs(); m.sre(); m.rmw(); };

/*  BVC rel */ CPU6502op[0x50] = (m: CPU6502) => { m.rel(); m.bvc(); };
/*  EOR izy */ CPU6502op[0x51] = (m: CPU6502) => { m.izy(); m.eor(); };
/* *KIL     */ CPU6502op[0x52] = (m: CPU6502) => { m.imp(); m.kil(); };
/* *SRE izy */ CPU6502op[0x53] = (m: CPU6502) => { m.izy(); m.sre(); m.rmw(); };
/* *NOP zpx */ CPU6502op[0x54] = (m: CPU6502) => { m.zpx(); m.nop(); };
/*  EOR zpx */ CPU6502op[0x55] = (m: CPU6502) => { m.zpx(); m.eor(); };
/*  LSR zpx */ CPU6502op[0x56] = (m: CPU6502) => { m.zpx(); m.lsr(); m.rmw(); };
/* *SRE zpx */ CPU6502op[0x57] = (m: CPU6502) => { m.zpx(); m.sre(); m.rmw(); };
/*  CLI     */ CPU6502op[0x58] = (m: CPU6502) => { m.imp(); m.cli(); };
/*  EOR aby */ CPU6502op[0x59] = (m: CPU6502) => { m.aby(); m.eor(); };
/* *NOP     */ CPU6502op[0x5A] = (m: CPU6502) => { m.imp(); m.nop(); };
/* *SRE aby */ CPU6502op[0x5B] = (m: CPU6502) => { m.aby(); m.sre(); m.rmw(); };
/* *NOP abx */ CPU6502op[0x5C] = (m: CPU6502) => { m.abx(); m.nop(); };
/*  EOR abx */ CPU6502op[0x5D] = (m: CPU6502) => { m.abx(); m.eor(); };
/*  LSR abx */ CPU6502op[0x5E] = (m: CPU6502) => { m.abx(); m.lsr(); m.rmw(); };
/* *SRE abx */ CPU6502op[0x5F] = (m: CPU6502) => { m.abx(); m.sre(); m.rmw(); };

/*  RTS     */ CPU6502op[0x60] = (m: CPU6502) => { m.imp(); m.rts(); };
/*  ADC izx */ CPU6502op[0x61] = (m: CPU6502) => { m.izx(); m.adc(); };
/* *KIL     */ CPU6502op[0x62] = (m: CPU6502) => { m.imp(); m.kil(); };
/* *RRA izx */ CPU6502op[0x63] = (m: CPU6502) => { m.izx(); m.rra(); m.rmw(); };
/* *NOP zp  */ CPU6502op[0x64] = (m: CPU6502) => { m.zp(); m.nop(); };
/*  ADC zp  */ CPU6502op[0x65] = (m: CPU6502) => { m.zp(); m.adc(); };
/*  ROR zp  */ CPU6502op[0x66] = (m: CPU6502) => { m.zp(); m.ror(); m.rmw(); };
/* *RRA zp  */ CPU6502op[0x67] = (m: CPU6502) => { m.zp(); m.rra(); m.rmw(); };
/*  PLA     */ CPU6502op[0x68] = (m: CPU6502) => { m.imp(); m.pla(); };
/*  ADC imm */ CPU6502op[0x69] = (m: CPU6502) => { m.imm(); m.adc(); };
/*  ROR     */ CPU6502op[0x6A] = (m: CPU6502) => { m.imp(); m.rora(); };
/* *ARR imm */ CPU6502op[0x6B] = (m: CPU6502) => { m.imm(); m.arr(); };
/*  JMP ind */ CPU6502op[0x6C] = (m: CPU6502) => { m.ind(); m.jmp(); };
/*  ADC abs */ CPU6502op[0x6D] = (m: CPU6502) => { m.abs(); m.adc(); };
/*  ROR abs */ CPU6502op[0x6E] = (m: CPU6502) => { m.abs(); m.ror(); m.rmw(); };
/* *RRA abs */ CPU6502op[0x6F] = (m: CPU6502) => { m.abs(); m.rra(); m.rmw(); };

/*  BVS rel */ CPU6502op[0x70] = (m: CPU6502) => { m.rel(); m.bvs(); };
/*  ADC izy */ CPU6502op[0x71] = (m: CPU6502) => { m.izy(); m.adc(); };
/* *KIL     */ CPU6502op[0x72] = (m: CPU6502) => { m.imp(); m.kil(); };
/* *RRA izy */ CPU6502op[0x73] = (m: CPU6502) => { m.izy(); m.rra(); m.rmw(); };
/* *NOP zpx */ CPU6502op[0x74] = (m: CPU6502) => { m.zpx(); m.nop(); };
/*  ADC zpx */ CPU6502op[0x75] = (m: CPU6502) => { m.zpx(); m.adc(); };
/*  ROR zpx */ CPU6502op[0x76] = (m: CPU6502) => { m.zpx(); m.ror(); m.rmw(); };
/* *RRA zpx */ CPU6502op[0x77] = (m: CPU6502) => { m.zpx(); m.rra(); m.rmw(); };
/*  SEI     */ CPU6502op[0x78] = (m: CPU6502) => { m.imp(); m.sei(); };
/*  ADC aby */ CPU6502op[0x79] = (m: CPU6502) => { m.aby(); m.adc(); };
/* *NOP     */ CPU6502op[0x7A] = (m: CPU6502) => { m.imp(); m.nop(); };
/* *RRA aby */ CPU6502op[0x7B] = (m: CPU6502) => { m.aby(); m.rra(); m.rmw(); };
/* *NOP abx */ CPU6502op[0x7C] = (m: CPU6502) => { m.abx(); m.nop(); };
/*  ADC abx */ CPU6502op[0x7D] = (m: CPU6502) => { m.abx(); m.adc(); };
/*  ROR abx */ CPU6502op[0x7E] = (m: CPU6502) => { m.abx(); m.ror(); m.rmw(); };
/* *RRA abx */ CPU6502op[0x7F] = (m: CPU6502) => { m.abx(); m.rra(); m.rmw(); };

/* *NOP imm */ CPU6502op[0x80] = (m: CPU6502) => { m.imm(); m.nop(); };
/*  STA izx */ CPU6502op[0x81] = (m: CPU6502) => { m.izx(); m.sta(); };
/* *NOP imm */ CPU6502op[0x82] = (m: CPU6502) => { m.imm(); m.nop(); };
/* *SAX izx */ CPU6502op[0x83] = (m: CPU6502) => { m.izx(); m.sax(); };
/*  STY zp  */ CPU6502op[0x84] = (m: CPU6502) => { m.zp(); m.sty(); };
/*  STA zp  */ CPU6502op[0x85] = (m: CPU6502) => { m.zp(); m.sta(); };
/*  STX zp  */ CPU6502op[0x86] = (m: CPU6502) => { m.zp(); m.stx(); };
/* *SAX zp  */ CPU6502op[0x87] = (m: CPU6502) => { m.zp(); m.sax(); };
/*  DEY     */ CPU6502op[0x88] = (m: CPU6502) => { m.imp(); m.dey(); };
/* *NOP imm */ CPU6502op[0x89] = (m: CPU6502) => { m.imm(); m.nop(); };
/*  TXA     */ CPU6502op[0x8A] = (m: CPU6502) => { m.imp(); m.txa(); };
/* *XAA imm */ CPU6502op[0x8B] = (m: CPU6502) => { m.imm(); m.xaa(); };
/*  STY abs */ CPU6502op[0x8C] = (m: CPU6502) => { m.abs(); m.sty(); };
/*  STA abs */ CPU6502op[0x8D] = (m: CPU6502) => { m.abs(); m.sta(); };
/*  STX abs */ CPU6502op[0x8E] = (m: CPU6502) => { m.abs(); m.stx(); };
/* *SAX abs */ CPU6502op[0x8F] = (m: CPU6502) => { m.abs(); m.sax(); };

/*  BCC rel */ CPU6502op[0x90] = (m: CPU6502) => { m.rel(); m.bcc(); };
/*  STA izy */ CPU6502op[0x91] = (m: CPU6502) => { m.izy(); m.sta(); };
/* *KIL     */ CPU6502op[0x92] = (m: CPU6502) => { m.imp(); m.kil(); };
/* *AHX izy */ CPU6502op[0x93] = (m: CPU6502) => { m.izy(); m.ahx(); };
/*  STY zpx */ CPU6502op[0x94] = (m: CPU6502) => { m.zpx(); m.sty(); };
/*  STA zpx */ CPU6502op[0x95] = (m: CPU6502) => { m.zpx(); m.sta(); };
/*  STX zpy */ CPU6502op[0x96] = (m: CPU6502) => { m.zpy(); m.stx(); };
/* *SAX zpy */ CPU6502op[0x97] = (m: CPU6502) => { m.zpy(); m.sax(); };
/*  TYA     */ CPU6502op[0x98] = (m: CPU6502) => { m.imp(); m.tya(); };
/*  STA aby */ CPU6502op[0x99] = (m: CPU6502) => { m.aby(); m.sta(); };
/*  TXS     */ CPU6502op[0x9A] = (m: CPU6502) => { m.imp(); m.txs(); };
/* *TAS aby */ CPU6502op[0x9B] = (m: CPU6502) => { m.aby(); m.tas(); };
/* *SHY abx */ CPU6502op[0x9C] = (m: CPU6502) => { m.abx(); m.shy(); };
/*  STA abx */ CPU6502op[0x9D] = (m: CPU6502) => { m.abx(); m.sta(); };
/* *SHX aby */ CPU6502op[0x9E] = (m: CPU6502) => { m.aby(); m.shx(); };
/* *AHX aby */ CPU6502op[0x9F] = (m: CPU6502) => { m.aby(); m.ahx(); };

/*  LDY imm */ CPU6502op[0xA0] = (m: CPU6502) => { m.imm(); m.ldy(); };
/*  LDA izx */ CPU6502op[0xA1] = (m: CPU6502) => { m.izx(); m.lda(); };
/*  LDX imm */ CPU6502op[0xA2] = (m: CPU6502) => { m.imm(); m.ldx(); };
/* *LAX izx */ CPU6502op[0xA3] = (m: CPU6502) => { m.izx(); m.lax(); };
/*  LDY zp  */ CPU6502op[0xA4] = (m: CPU6502) => { m.zp(); m.ldy(); };
/*  LDA zp  */ CPU6502op[0xA5] = (m: CPU6502) => { m.zp(); m.lda(); };
/*  LDX zp  */ CPU6502op[0xA6] = (m: CPU6502) => { m.zp(); m.ldx(); };
/* *LAX zp  */ CPU6502op[0xA7] = (m: CPU6502) => { m.zp(); m.lax(); };
/*  TAY     */ CPU6502op[0xA8] = (m: CPU6502) => { m.imp(); m.tay(); };
/*  LDA imm */ CPU6502op[0xA9] = (m: CPU6502) => { m.imm(); m.lda(); };
/*  TAX     */ CPU6502op[0xAA] = (m: CPU6502) => { m.imp(); m.tax(); };
/* *LAX imm */ CPU6502op[0xAB] = (m: CPU6502) => { m.imm(); m.lax(); };
/*  LDY abs */ CPU6502op[0xAC] = (m: CPU6502) => { m.abs(); m.ldy(); };
/*  LDA abs */ CPU6502op[0xAD] = (m: CPU6502) => { m.abs(); m.lda(); };
/*  LDX abs */ CPU6502op[0xAE] = (m: CPU6502) => { m.abs(); m.ldx(); };
/* *LAX abs */ CPU6502op[0xAF] = (m: CPU6502) => { m.abs(); m.lax(); };

/*  BCS rel */ CPU6502op[0xB0] = (m: CPU6502) => { m.rel(); m.bcs(); };
/*  LDA izy */ CPU6502op[0xB1] = (m: CPU6502) => { m.izy(); m.lda(); };
/* *KIL     */ CPU6502op[0xB2] = (m: CPU6502) => { m.imp(); m.kil(); };
/* *LAX izy */ CPU6502op[0xB3] = (m: CPU6502) => { m.izy(); m.lax(); };
/*  LDY zpx */ CPU6502op[0xB4] = (m: CPU6502) => { m.zpx(); m.ldy(); };
/*  LDA zpx */ CPU6502op[0xB5] = (m: CPU6502) => { m.zpx(); m.lda(); };
/*  LDX zpy */ CPU6502op[0xB6] = (m: CPU6502) => { m.zpy(); m.ldx(); };
/* *LAX zpy */ CPU6502op[0xB7] = (m: CPU6502) => { m.zpy(); m.lax(); };
/*  CLV     */ CPU6502op[0xB8] = (m: CPU6502) => { m.imp(); m.clv(); };
/*  LDA aby */ CPU6502op[0xB9] = (m: CPU6502) => { m.aby(); m.lda(); };
/*  TSX     */ CPU6502op[0xBA] = (m: CPU6502) => { m.imp(); m.tsx(); };
/* *LAS aby */ CPU6502op[0xBB] = (m: CPU6502) => { m.aby(); m.las(); };
/*  LDY abx */ CPU6502op[0xBC] = (m: CPU6502) => { m.abx(); m.ldy(); };
/*  LDA abx */ CPU6502op[0xBD] = (m: CPU6502) => { m.abx(); m.lda(); };
/*  LDX aby */ CPU6502op[0xBE] = (m: CPU6502) => { m.aby(); m.ldx(); };
/* *LAX aby */ CPU6502op[0xBF] = (m: CPU6502) => { m.aby(); m.lax(); };

/*  CPY imm */ CPU6502op[0xC0] = (m: CPU6502) => { m.imm(); m.cpy(); };
/*  CMP izx */ CPU6502op[0xC1] = (m: CPU6502) => { m.izx(); m.cmp(); };
/* *NOP imm */ CPU6502op[0xC2] = (m: CPU6502) => { m.imm(); m.nop(); };
/* *DCP izx */ CPU6502op[0xC3] = (m: CPU6502) => { m.izx(); m.dcp(); m.rmw(); };
/*  CPY zp  */ CPU6502op[0xC4] = (m: CPU6502) => { m.zp(); m.cpy(); };
/*  CMP zp  */ CPU6502op[0xC5] = (m: CPU6502) => { m.zp(); m.cmp(); };
/*  DEC zp  */ CPU6502op[0xC6] = (m: CPU6502) => { m.zp(); m.dec(); m.rmw(); };
/* *DCP zp  */ CPU6502op[0xC7] = (m: CPU6502) => { m.zp(); m.dcp(); m.rmw(); };
/*  INY     */ CPU6502op[0xC8] = (m: CPU6502) => { m.imp(); m.iny(); };
/*  CMP imm */ CPU6502op[0xC9] = (m: CPU6502) => { m.imm(); m.cmp(); };
/*  DEX     */ CPU6502op[0xCA] = (m: CPU6502) => { m.imp(); m.dex(); };
/* *AXS imm */ CPU6502op[0xCB] = (m: CPU6502) => { m.imm(); m.axs(); };
/*  CPY abs */ CPU6502op[0xCC] = (m: CPU6502) => { m.abs(); m.cpy(); };
/*  CMP abs */ CPU6502op[0xCD] = (m: CPU6502) => { m.abs(); m.cmp(); };
/*  DEC abs */ CPU6502op[0xCE] = (m: CPU6502) => { m.abs(); m.dec(); m.rmw(); };
/* *DCP abs */ CPU6502op[0xCF] = (m: CPU6502) => { m.abs(); m.dcp(); m.rmw(); };

/*  BNE rel */ CPU6502op[0xD0] = (m: CPU6502) => { m.rel(); m.bne(); };
/*  CMP izy */ CPU6502op[0xD1] = (m: CPU6502) => { m.izy(); m.cmp(); };
/* *KIL     */ CPU6502op[0xD2] = (m: CPU6502) => { m.imp(); m.kil(); };
/* *DCP izy */ CPU6502op[0xD3] = (m: CPU6502) => { m.izy(); m.dcp(); m.rmw(); };
/* *NOP zpx */ CPU6502op[0xD4] = (m: CPU6502) => { m.zpx(); m.nop(); };
/*  CMP zpx */ CPU6502op[0xD5] = (m: CPU6502) => { m.zpx(); m.cmp(); };
/*  DEC zpx */ CPU6502op[0xD6] = (m: CPU6502) => { m.zpx(); m.dec(); m.rmw(); };
/* *DCP zpx */ CPU6502op[0xD7] = (m: CPU6502) => { m.zpx(); m.dcp(); m.rmw(); };
/*  CLD     */ CPU6502op[0xD8] = (m: CPU6502) => { m.imp(); m.cld(); };
/*  CMP aby */ CPU6502op[0xD9] = (m: CPU6502) => { m.aby(); m.cmp(); };
/* *NOP     */ CPU6502op[0xDA] = (m: CPU6502) => { m.imp(); m.nop(); };
/* *DCP aby */ CPU6502op[0xDB] = (m: CPU6502) => { m.aby(); m.dcp(); m.rmw(); };
/* *NOP abx */ CPU6502op[0xDC] = (m: CPU6502) => { m.abx(); m.nop(); };
/*  CMP abx */ CPU6502op[0xDD] = (m: CPU6502) => { m.abx(); m.cmp(); };
/*  DEC abx */ CPU6502op[0xDE] = (m: CPU6502) => { m.abx(); m.dec(); m.rmw(); };
/* *DCP abx */ CPU6502op[0xDF] = (m: CPU6502) => { m.abx(); m.dcp(); m.rmw(); };

/*  CPX imm */ CPU6502op[0xE0] = (m: CPU6502) => { m.imm(); m.cpx(); };
/*  SBC izx */ CPU6502op[0xE1] = (m: CPU6502) => { m.izx(); m.sbc(); };
/* *NOP imm */ CPU6502op[0xE2] = (m: CPU6502) => { m.imm(); m.nop(); };
/* *ISC izx */ CPU6502op[0xE3] = (m: CPU6502) => { m.izx(); m.isc(); m.rmw(); };
/*  CPX zp  */ CPU6502op[0xE4] = (m: CPU6502) => { m.zp(); m.cpx(); };
/*  SBC zp  */ CPU6502op[0xE5] = (m: CPU6502) => { m.zp(); m.sbc(); };
/*  INC zp  */ CPU6502op[0xE6] = (m: CPU6502) => { m.zp(); m.inc(); m.rmw(); };
/* *ISC zp  */ CPU6502op[0xE7] = (m: CPU6502) => { m.zp(); m.isc(); m.rmw(); };
/*  INX     */ CPU6502op[0xE8] = (m: CPU6502) => { m.imp(); m.inx(); };
/*  SBC imm */ CPU6502op[0xE9] = (m: CPU6502) => { m.imm(); m.sbc(); };
/*  NOP     */ CPU6502op[0xEA] = (m: CPU6502) => { m.imp(); m.nop(); };
/* *SBC imm */ CPU6502op[0xEB] = (m: CPU6502) => { m.imm(); m.sbc(); };
/*  CPX abs */ CPU6502op[0xEC] = (m: CPU6502) => { m.abs(); m.cpx(); };
/*  SBC abs */ CPU6502op[0xED] = (m: CPU6502) => { m.abs(); m.sbc(); };
/*  INC abs */ CPU6502op[0xEE] = (m: CPU6502) => { m.abs(); m.inc(); m.rmw(); };
/* *ISC abs */ CPU6502op[0xEF] = (m: CPU6502) => { m.abs(); m.isc(); m.rmw(); };

/*  BEQ rel */ CPU6502op[0xF0] = (m: CPU6502) => { m.rel(); m.beq(); };
/*  SBC izy */ CPU6502op[0xF1] = (m: CPU6502) => { m.izy(); m.sbc(); };
/* *KIL     */ CPU6502op[0xF2] = (m: CPU6502) => { m.imp(); m.kil(); };
/* *ISC izy */ CPU6502op[0xF3] = (m: CPU6502) => { m.izy(); m.isc(); m.rmw(); };
/* *NOP zpx */ CPU6502op[0xF4] = (m: CPU6502) => { m.zpx(); m.nop(); };
/*  SBC zpx */ CPU6502op[0xF5] = (m: CPU6502) => { m.zpx(); m.sbc(); };
/*  INC zpx */ CPU6502op[0xF6] = (m: CPU6502) => { m.zpx(); m.inc(); m.rmw(); };
/* *ISC zpx */ CPU6502op[0xF7] = (m: CPU6502) => { m.zpx(); m.isc(); m.rmw(); };
/*  SED     */ CPU6502op[0xF8] = (m: CPU6502) => { m.imp(); m.sed(); };
/*  SBC aby */ CPU6502op[0xF9] = (m: CPU6502) => { m.aby(); m.sbc(); };
/* *NOP     */ CPU6502op[0xFA] = (m: CPU6502) => { m.imp(); m.nop(); };
/* *ISC aby */ CPU6502op[0xFB] = (m: CPU6502) => { m.aby(); m.isc(); m.rmw(); };
/* *NOP abx */ CPU6502op[0xFC] = (m: CPU6502) => { m.abx(); m.nop(); };
/*  SBC abx */ CPU6502op[0xFD] = (m: CPU6502) => { m.abx(); m.sbc(); };
/*  INC abx */ CPU6502op[0xFE] = (m: CPU6502) => { m.abx(); m.inc(); m.rmw(); };
/* *ISC abx */ CPU6502op[0xFF] = (m: CPU6502) => { m.abx(); m.isc(); m.rmw(); };


export default CPU6502;