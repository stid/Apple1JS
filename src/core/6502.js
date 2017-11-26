class CPU6502 {

    constructor(addressSpace) {
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

    reset() {
        this.A = 0; this.X = 0; this.Y = 0; this.S = 0;
        this.N = 0; this.Z = 1; this.C = 0; this.V = 0;
        this.I = 0; this.D = 0;

        this.PC = (this.read(0xFFFD) << 8) | this.read(0xFFFC);
    }

    step() {
        this.opcode = this.read( this.PC++ );
        CPU6502op[ this.opcode ]( this );
    }

    read(address) {
        return this.addressSpace.read(address);
    }

    write(address, value) {
        this.addressSpace.write(address, value);
    }

    log() {
        let msg = "nPC=" + this.PC.toString(16);
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

    izx() {
        let a = (this.read(this.PC++) + this.X) & 0xFF;
        this.addr = (this.read(a+1) << 8) | this.read(a);
        this.cycles += 6;
    }

    izy() {
        let a = this.read(this.PC++);
        let paddr = (this.read((a+1) & 0xFF) << 8) | this.read(a);
        this.addr = (paddr + this.Y);
        if ( (paddr & 0x100) != (this.addr & 0x100) ) {
            this.cycles += 6;
        } else {
            this.cycles += 5;
        }
    }

    ind() {
        let a = this.read(this.PC);
        a |= this.read( (this.PC & 0xFF00) | ((this.PC + 1) & 0xFF) ) << 8;
        this.addr = this.read(a);
        this.addr |= (this.read(a+1) << 8);
        this.cycles += 5;
    }

    zp() {
        this.addr = this.read(this.PC++);
        this.cycles += 3;
    }

    zpx() {
        this.addr = (this.read(this.PC++) + this.X) & 0xFF;
        this.cycles += 4;
    }

    zpy() {
        this.addr = (this.read(this.PC++) + this.Y) & 0xFF;
        this.cycles += 4;
    }

    imp() {
        this.cycles += 2;
    }

    imm() {
        this.addr = this.PC++;
        this.cycles += 2;
    }

    abs() {
        this.addr = this.read(this.PC++);
        this.addr |= (this.read(this.PC++) << 8);
        this.cycles += 4;
    }

    abx() {
        let paddr = this.read(this.PC++);
        paddr |= (this.read(this.PC++) << 8);
        this.addr = (paddr + this.X);
        if ( (paddr & 0x100) != (this.addr & 0x100) ) {
            this.cycles += 5;
        } else {
            this.cycles += 4;
        }
    }

    aby() {
        let paddr = this.read(this.PC++);
        paddr |= (this.read(this.PC++) << 8);
        this.addr = (paddr + this.Y);
        if ( (paddr & 0x100) != (this.addr & 0x100) ) {
            this.cycles += 5;
        } else {
            this.cycles += 4;
        }
    }

    rel() {
        this.addr = this.read(this.PC++);
        if (this.addr & 0x80) {
            this.addr -= 0x100;
        }
        this.addr += this.PC;
        this.cycles += 2;
    }

    ////////////////////////////////////////////////////////////////////////////////

    rmw() {
        this.write(this.addr, this.tmp & 0xFF);
        this.cycles += 2;
    }

    ////////////////////////////////////////////////////////////////////////////////

    fnz(v) {
        this.Z = ((v & 0xFF) == 0) ? 1 : 0;
        this.N = ((v & 0x80) != 0) ? 1 : 0;
    }

    // Borrow
    fnzb(v) {
        this.Z = ((v & 0xFF) == 0) ? 1 : 0;
        this.N = ((v & 0x80) != 0) ? 1 : 0;
        this.C = ((v & 0x100) != 0) ? 0 : 1;
    }

    // Carry
    fnzc(v) {
        this.Z = ((v & 0xFF) == 0) ? 1 : 0;
        this.N = ((v & 0x80) != 0) ? 1 : 0;
        this.C = ((v & 0x100) != 0) ? 1 : 0;
    }

    branch(v) {
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
    adc() {
        let v = this.read(this.addr);
        let c = this.C;
        let r = this.A + v + c;
        if (this.D) {
            let al = (this.A & 0x0F) + (v & 0x0F) + c;
            if (al > 9) al += 6;
            let ah = (this.A >> 4) + (v >> 4) + ((al > 15) ? 1 : 0);
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

    and() {
        this.A &= this.read(this.addr);
        this.fnz(this.A);
    }

    asl() {
        this.tmp = this.read(this.addr) << 1;
        this.fnzc(this.tmp);
        this.tmp &= 0xFF;
    }
    asla() {
        this.tmp = this.A << 1;
        this.fnzc(this.tmp);
        this.A = this.tmp & 0xFF;
    }

    bit() {
        this.tmp = this.read(this.addr);
        this.N = ((this.tmp & 0x80) != 0) ? 1 : 0;
        this.V = ((this.tmp & 0x40) != 0) ? 1 : 0;
        this.Z = ((this.tmp & this.A) == 0) ? 1 : 0;
    }

    brk() {
        this.PC++;
        this.write(this.S + 0x100, this.PC >> 8);
        this.S = (this.S - 1) & 0xFF;
        this.write(this.S + 0x100, this.PC & 0xFF);
        this.S = (this.S - 1) & 0xFF;
        let v = this.N << 7;
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

    bcc() { this.branch( this.C == 0 ); }
    bcs() { this.branch( this.C == 1 ); }
    beq() { this.branch( this.Z == 1 ); }
    bne() { this.branch( this.Z == 0 ); }
    bmi() { this.branch( this.N == 1 ); }
    bpl() { this.branch( this.N == 0 ); }
    bvc() { this.branch( this.V == 0 ); }
    bvs() { this.branch( this.V == 1 ); }


    clc() { this.C = 0; }
    cld() { this.D = 0; }
    cli() { this.I = 0; }
    clv() { this.V = 0; }

    cmp() {
        this.fnzb( this.A - this.read(this.addr) );
    }

    cpx() {
        this.fnzb( this.X - this.read(this.addr) );
    }

    cpy() {
        this.fnzb( this.Y - this.read(this.addr) );
    }

    dec() {
        this.tmp = (this.read(this.addr) - 1) & 0xFF;
        this.fnz(this.tmp);
    }

    dex() {
        this.X = (this.X - 1) & 0xFF;
        this.fnz(this.X);
    }

    dey() {
        this.Y = (this.Y - 1) & 0xFF;
        this.fnz(this.Y);
    }

    eor() {
        this.A ^= this.read(this.addr);
        this.fnz(this.A);
    }

    inc() {
        this.tmp = (this.read(this.addr) + 1) & 0xFF;
        this.fnz(this.tmp);
    }

    inx() {
        this.X = (this.X + 1) & 0xFF;
        this.fnz(this.X);
    }

    iny() {
        this.Y = (this.Y + 1) & 0xFF;
        this.fnz(this.Y);
    }

    jmp() {
        this.PC = this.addr;
        this.cycles--;
    }

    jsr() {
        this.write(this.S + 0x100, (this.PC - 1) >> 8);
        this.S = (this.S - 1) & 0xFF;
        this.write(this.S + 0x100, (this.PC - 1) & 0xFF);
        this.S = (this.S - 1) & 0xFF;
        this.PC = this.addr;
        this.cycles += 2;
    }

    lda() {
        this.A = this.read(this.addr);
        this.fnz(this.A);
    }

    ldx() {
        this.X = this.read(this.addr);
        this.fnz(this.X);
    }

    ldy() {
        this.Y = this.read(this.addr);
        this.fnz(this.Y);
    }

    ora() {
        this.A |= this.read(this.addr);
        this.fnz(this.A);
    }

    rol() {
        this.tmp = (this.read(this.addr) << 1) | this.C;
        this.fnzc(this.tmp);
        this.tmp &= 0xFF;
    }
    rola() {
        this.tmp = (this.A << 1) | this.C;
        this.fnzc(this.tmp);
        this.A = this.tmp & 0xFF;
    }

    ror() {
        this.tmp = this.read(this.addr);
        this.tmp = ((this.tmp & 1) << 8) | (this.C << 7) | (this.tmp >> 1);
        this.fnzc(this.tmp);
        this.tmp &= 0xFF;
    }
    rora() {
        this.tmp = ((this.A & 1) << 8) | (this.C << 7) | (this.A >> 1);
        this.fnzc(this.tmp);
        this.A = this.tmp & 0xFF;
    }


    lsr() {
        this.tmp = this.read(this.addr);
        this.tmp = ((this.tmp & 1) << 8) | (this.tmp >> 1);
        this.fnzc(this.tmp);
        this.tmp &= 0xFF;
    }
    lsra() {
        this.tmp = ((this.A & 1) << 8) | (this.A >> 1);
        this.fnzc(this.tmp);
        this.A = this.tmp & 0xFF;
    }


    nop() { }

    pha() {
        this.write(this.S + 0x100, this.A);
        this.S = (this.S - 1) & 0xFF;
        this.cycles++;
    }

    php() {
        let v = this.N << 7;
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

    pla() {
        this.S = (this.S + 1) & 0xFF;
        this.A = this.read(this.S + 0x100);
        this.fnz(this.A);
        this.cycles += 2;
    }

    plp() {
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

    rti() {
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

    rts() {
        this.S = (this.S + 1) & 0xFF;
        this.PC = this.read(this.S + 0x100);
        this.S = (this.S + 1) & 0xFF;
        this.PC |= this.read(this.S + 0x100) << 8;
        this.PC++;
        this.cycles += 4;
    }

    sbc() {
        let v = this.read(this.addr);
        let c = 1 - this.C;
        let r = this.A - v - c;
        if (this.D) {
            let al = (this.A & 0x0F) - (v & 0x0F) - c;
            if (al < 0) al -= 6;
            let ah = (this.A >> 4) - (v >> 4) - ((al < 0) ? 1 : 0);
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


    sec() { this.C = 1; }
    sed() { this.D = 1; }
    sei() { this.I = 1; }


    slo() {
        this.tmp = this.read(this.addr) << 1;
        this.tmp |= this.A;
        this.fnzc(this.tmp);
        this.A = this.tmp & 0xFF;
    }

    sta() {
        this.write(this.addr, this.A);
    }

    stx() {
        this.write(this.addr, this.X);
    }

    sty() {
        this.write(this.addr, this.Y);
    }

    tax() {
        this.X = this.A;
        this.fnz(this.X);
    }

    tay() {
        this.Y = this.A;
        this.fnz(this.Y);
    }

    tsx() {
        this.X = this.S;
        this.fnz(this.X);
    }

    txa() {
        this.A = this.X;
        this.fnz(this.A);
    }

    txs() {
        this.S = this.X;
    }

    tya() {
        this.A = this.Y;
        this.fnz(this.A);
    }
}



////////////////////////////////////////////////////////////////////////////////
// Opcode table
////////////////////////////////////////////////////////////////////////////////

let CPU6502op = new Array();

/*  BRK     */ CPU6502op[0x00] = (m) => { m.imp(); m.brk(); };
/*  ORA izx */ CPU6502op[0x01] = (m) => { m.izx(); m.ora(); };
/* *KIL     */ CPU6502op[0x02] = (m) => { m.imp(); m.kil(); };
/* *SLO izx */ CPU6502op[0x03] = (m) => { m.izx(); m.slo(); m.rmw(); };
/* *NOP zp  */ CPU6502op[0x04] = (m) => { m.zp(); m.nop(); };
/*  ORA zp  */ CPU6502op[0x05] = (m) => { m.zp(); m.ora(); };
/*  ASL zp  */ CPU6502op[0x06] = (m) => { m.zp(); m.asl(); m.rmw(); };
/* *SLO zp  */ CPU6502op[0x07] = (m) => { m.zp(); m.slo(); m.rmw(); };
/*  PHP     */ CPU6502op[0x08] = (m) => { m.imp(); m.php(); };
/*  ORA imm */ CPU6502op[0x09] = (m) => { m.imm(); m.ora(); };
/*  ASL     */ CPU6502op[0x0A] = (m) => { m.imp(); m.asla(); };
/* *ANC imm */ CPU6502op[0x0B] = (m) => { m.imm(); m.anc(); };
/* *NOP abs */ CPU6502op[0x0C] = (m) => { m.abs(); m.nop(); };
/*  ORA abs */ CPU6502op[0x0D] = (m) => { m.abs(); m.ora(); };
/*  ASL abs */ CPU6502op[0x0E] = (m) => { m.abs(); m.asl(); m.rmw(); };
/* *SLO abs */ CPU6502op[0x0F] = (m) => { m.abs(); m.slo(); m.rmw(); };

/*  BPL rel */ CPU6502op[0x10] = (m) => { m.rel(); m.bpl(); };
/*  ORA izy */ CPU6502op[0x11] = (m) => { m.izy(); m.ora(); };
/* *KIL     */ CPU6502op[0x12] = (m) => { m.imp(); m.kil(); };
/* *SLO izy */ CPU6502op[0x13] = (m) => { m.izy(); m.slo(); m.rmw(); };
/* *NOP zpx */ CPU6502op[0x14] = (m) => { m.zpx(); m.nop(); };
/*  ORA zpx */ CPU6502op[0x15] = (m) => { m.zpx(); m.ora(); };
/*  ASL zpx */ CPU6502op[0x16] = (m) => { m.zpx(); m.asl(); m.rmw(); };
/* *SLO zpx */ CPU6502op[0x17] = (m) => { m.zpx(); m.slo(); m.rmw(); };
/*  CLC     */ CPU6502op[0x18] = (m) => { m.imp(); m.clc(); };
/*  ORA aby */ CPU6502op[0x19] = (m) => { m.aby(); m.ora(); };
/* *NOP     */ CPU6502op[0x1A] = (m) => { m.imp(); m.nop(); };
/* *SLO aby */ CPU6502op[0x1B] = (m) => { m.aby(); m.slo(); m.rmw(); };
/* *NOP abx */ CPU6502op[0x1C] = (m) => { m.abx(); m.nop(); };
/*  ORA abx */ CPU6502op[0x1D] = (m) => { m.abx(); m.ora(); };
/*  ASL abx */ CPU6502op[0x1E] = (m) => { m.abx(); m.asl(); m.rmw(); };
/* *SLO abx */ CPU6502op[0x1F] = (m) => { m.abx(); m.slo(); m.rmw(); };

/*  JSR abs */ CPU6502op[0x20] = (m) => { m.abs(); m.jsr(); };
/*  AND izx */ CPU6502op[0x21] = (m) => { m.izx(); m.and(); };
/* *KIL     */ CPU6502op[0x22] = (m) => { m.imp(); m.kil(); };
/* *RLA izx */ CPU6502op[0x23] = (m) => { m.izx(); m.rla(); m.rmw(); };
/*  BIT zp  */ CPU6502op[0x24] = (m) => { m.zp(); m.bit(); };
/*  AND zp  */ CPU6502op[0x25] = (m) => { m.zp(); m.and(); };
/*  ROL zp  */ CPU6502op[0x26] = (m) => { m.zp(); m.rol(); m.rmw(); };
/* *RLA zp  */ CPU6502op[0x27] = (m) => { m.zp(); m.rla(); m.rmw(); };
/*  PLP     */ CPU6502op[0x28] = (m) => { m.imp(); m.plp(); };
/*  AND imm */ CPU6502op[0x29] = (m) => { m.imm(); m.and(); };
/*  ROL     */ CPU6502op[0x2A] = (m) => { m.imp(); m.rola(); };
/* *ANC imm */ CPU6502op[0x2B] = (m) => { m.imm(); m.anc(); };
/*  BIT abs */ CPU6502op[0x2C] = (m) => { m.abs(); m.bit(); };
/*  AND abs */ CPU6502op[0x2D] = (m) => { m.abs(); m.and(); };
/*  ROL abs */ CPU6502op[0x2E] = (m) => { m.abs(); m.rol(); m.rmw(); };
/* *RLA abs */ CPU6502op[0x2F] = (m) => { m.abs(); m.rla(); m.rmw(); };

/*  BMI rel */ CPU6502op[0x30] = (m) => { m.rel(); m.bmi(); };
/*  AND izy */ CPU6502op[0x31] = (m) => { m.izy(); m.and(); };
/* *KIL     */ CPU6502op[0x32] = (m) => { m.imp(); m.kil(); };
/* *RLA izy */ CPU6502op[0x33] = (m) => { m.izy(); m.rla(); m.rmw(); };
/* *NOP zpx */ CPU6502op[0x34] = (m) => { m.zpx(); m.nop(); };
/*  AND zpx */ CPU6502op[0x35] = (m) => { m.zpx(); m.and(); };
/*  ROL zpx */ CPU6502op[0x36] = (m) => { m.zpx(); m.rol(); m.rmw(); };
/* *RLA zpx */ CPU6502op[0x37] = (m) => { m.zpx(); m.rla(); m.rmw(); };
/*  SEC     */ CPU6502op[0x38] = (m) => { m.imp(); m.sec(); };
/*  AND aby */ CPU6502op[0x39] = (m) => { m.aby(); m.and(); };
/* *NOP     */ CPU6502op[0x3A] = (m) => { m.imp(); m.nop(); };
/* *RLA aby */ CPU6502op[0x3B] = (m) => { m.aby(); m.rla(); m.rmw(); };
/* *NOP abx */ CPU6502op[0x3C] = (m) => { m.abx(); m.nop(); };
/*  AND abx */ CPU6502op[0x3D] = (m) => { m.abx(); m.and(); };
/*  ROL abx */ CPU6502op[0x3E] = (m) => { m.abx(); m.rol(); m.rmw(); };
/* *RLA abx */ CPU6502op[0x3F] = (m) => { m.abx(); m.rla(); m.rmw(); };

/*  RTI     */ CPU6502op[0x40] = (m) => { m.imp(); m.rti(); };
/*  EOR izx */ CPU6502op[0x41] = (m) => { m.izx(); m.eor(); };
/* *KIL     */ CPU6502op[0x42] = (m) => { m.imp(); m.kil(); };
/* *SRE izx */ CPU6502op[0x43] = (m) => { m.izx(); m.sre(); m.rmw(); };
/* *NOP zp  */ CPU6502op[0x44] = (m) => { m.zp(); m.nop(); };
/*  EOR zp  */ CPU6502op[0x45] = (m) => { m.zp(); m.eor(); };
/*  LSR zp  */ CPU6502op[0x46] = (m) => { m.zp(); m.lsr(); m.rmw(); };
/* *SRE zp  */ CPU6502op[0x47] = (m) => { m.zp(); m.sre(); m.rmw(); };
/*  PHA     */ CPU6502op[0x48] = (m) => { m.imp(); m.pha(); };
/*  EOR imm */ CPU6502op[0x49] = (m) => { m.imm(); m.eor(); };
/*  LSR     */ CPU6502op[0x4A] = (m) => { m.imp(); m.lsra(); };
/* *ALR imm */ CPU6502op[0x4B] = (m) => { m.imm(); m.alr(); };
/*  JMP abs */ CPU6502op[0x4C] = (m) => { m.abs(); m.jmp(); };
/*  EOR abs */ CPU6502op[0x4D] = (m) => { m.abs(); m.eor(); };
/*  LSR abs */ CPU6502op[0x4E] = (m) => { m.abs(); m.lsr(); m.rmw(); };
/* *SRE abs */ CPU6502op[0x4F] = (m) => { m.abs(); m.sre(); m.rmw(); };

/*  BVC rel */ CPU6502op[0x50] = (m) => { m.rel(); m.bvc(); };
/*  EOR izy */ CPU6502op[0x51] = (m) => { m.izy(); m.eor(); };
/* *KIL     */ CPU6502op[0x52] = (m) => { m.imp(); m.kil(); };
/* *SRE izy */ CPU6502op[0x53] = (m) => { m.izy(); m.sre(); m.rmw(); };
/* *NOP zpx */ CPU6502op[0x54] = (m) => { m.zpx(); m.nop(); };
/*  EOR zpx */ CPU6502op[0x55] = (m) => { m.zpx(); m.eor(); };
/*  LSR zpx */ CPU6502op[0x56] = (m) => { m.zpx(); m.lsr(); m.rmw(); };
/* *SRE zpx */ CPU6502op[0x57] = (m) => { m.zpx(); m.sre(); m.rmw(); };
/*  CLI     */ CPU6502op[0x58] = (m) => { m.imp(); m.cli(); };
/*  EOR aby */ CPU6502op[0x59] = (m) => { m.aby(); m.eor(); };
/* *NOP     */ CPU6502op[0x5A] = (m) => { m.imp(); m.nop(); };
/* *SRE aby */ CPU6502op[0x5B] = (m) => { m.aby(); m.sre(); m.rmw(); };
/* *NOP abx */ CPU6502op[0x5C] = (m) => { m.abx(); m.nop(); };
/*  EOR abx */ CPU6502op[0x5D] = (m) => { m.abx(); m.eor(); };
/*  LSR abx */ CPU6502op[0x5E] = (m) => { m.abx(); m.lsr(); m.rmw(); };
/* *SRE abx */ CPU6502op[0x5F] = (m) => { m.abx(); m.sre(); m.rmw(); };

/*  RTS     */ CPU6502op[0x60] = (m) => { m.imp(); m.rts(); };
/*  ADC izx */ CPU6502op[0x61] = (m) => { m.izx(); m.adc(); };
/* *KIL     */ CPU6502op[0x62] = (m) => { m.imp(); m.kil(); };
/* *RRA izx */ CPU6502op[0x63] = (m) => { m.izx(); m.rra(); m.rmw(); };
/* *NOP zp  */ CPU6502op[0x64] = (m) => { m.zp(); m.nop(); };
/*  ADC zp  */ CPU6502op[0x65] = (m) => { m.zp(); m.adc(); };
/*  ROR zp  */ CPU6502op[0x66] = (m) => { m.zp(); m.ror(); m.rmw(); };
/* *RRA zp  */ CPU6502op[0x67] = (m) => { m.zp(); m.rra(); m.rmw(); };
/*  PLA     */ CPU6502op[0x68] = (m) => { m.imp(); m.pla(); };
/*  ADC imm */ CPU6502op[0x69] = (m) => { m.imm(); m.adc(); };
/*  ROR     */ CPU6502op[0x6A] = (m) => { m.imp(); m.rora(); };
/* *ARR imm */ CPU6502op[0x6B] = (m) => { m.imm(); m.arr(); };
/*  JMP ind */ CPU6502op[0x6C] = (m) => { m.ind(); m.jmp(); };
/*  ADC abs */ CPU6502op[0x6D] = (m) => { m.abs(); m.adc(); };
/*  ROR abs */ CPU6502op[0x6E] = (m) => { m.abs(); m.ror(); m.rmw(); };
/* *RRA abs */ CPU6502op[0x6F] = (m) => { m.abs(); m.rra(); m.rmw(); };

/*  BVS rel */ CPU6502op[0x70] = (m) => { m.rel(); m.bvs(); };
/*  ADC izy */ CPU6502op[0x71] = (m) => { m.izy(); m.adc(); };
/* *KIL     */ CPU6502op[0x72] = (m) => { m.imp(); m.kil(); };
/* *RRA izy */ CPU6502op[0x73] = (m) => { m.izy(); m.rra(); m.rmw(); };
/* *NOP zpx */ CPU6502op[0x74] = (m) => { m.zpx(); m.nop(); };
/*  ADC zpx */ CPU6502op[0x75] = (m) => { m.zpx(); m.adc(); };
/*  ROR zpx */ CPU6502op[0x76] = (m) => { m.zpx(); m.ror(); m.rmw(); };
/* *RRA zpx */ CPU6502op[0x77] = (m) => { m.zpx(); m.rra(); m.rmw(); };
/*  SEI     */ CPU6502op[0x78] = (m) => { m.imp(); m.sei(); };
/*  ADC aby */ CPU6502op[0x79] = (m) => { m.aby(); m.adc(); };
/* *NOP     */ CPU6502op[0x7A] = (m) => { m.imp(); m.nop(); };
/* *RRA aby */ CPU6502op[0x7B] = (m) => { m.aby(); m.rra(); m.rmw(); };
/* *NOP abx */ CPU6502op[0x7C] = (m) => { m.abx(); m.nop(); };
/*  ADC abx */ CPU6502op[0x7D] = (m) => { m.abx(); m.adc(); };
/*  ROR abx */ CPU6502op[0x7E] = (m) => { m.abx(); m.ror(); m.rmw(); };
/* *RRA abx */ CPU6502op[0x7F] = (m) => { m.abx(); m.rra(); m.rmw(); };

/* *NOP imm */ CPU6502op[0x80] = (m) => { m.imm(); m.nop(); };
/*  STA izx */ CPU6502op[0x81] = (m) => { m.izx(); m.sta(); };
/* *NOP imm */ CPU6502op[0x82] = (m) => { m.imm(); m.nop(); };
/* *SAX izx */ CPU6502op[0x83] = (m) => { m.izx(); m.sax(); };
/*  STY zp  */ CPU6502op[0x84] = (m) => { m.zp(); m.sty(); };
/*  STA zp  */ CPU6502op[0x85] = (m) => { m.zp(); m.sta(); };
/*  STX zp  */ CPU6502op[0x86] = (m) => { m.zp(); m.stx(); };
/* *SAX zp  */ CPU6502op[0x87] = (m) => { m.zp(); m.sax(); };
/*  DEY     */ CPU6502op[0x88] = (m) => { m.imp(); m.dey(); };
/* *NOP imm */ CPU6502op[0x89] = (m) => { m.imm(); m.nop(); };
/*  TXA     */ CPU6502op[0x8A] = (m) => { m.imp(); m.txa(); };
/* *XAA imm */ CPU6502op[0x8B] = (m) => { m.imm(); m.xaa(); };
/*  STY abs */ CPU6502op[0x8C] = (m) => { m.abs(); m.sty(); };
/*  STA abs */ CPU6502op[0x8D] = (m) => { m.abs(); m.sta(); };
/*  STX abs */ CPU6502op[0x8E] = (m) => { m.abs(); m.stx(); };
/* *SAX abs */ CPU6502op[0x8F] = (m) => { m.abs(); m.sax(); };

/*  BCC rel */ CPU6502op[0x90] = (m) => { m.rel(); m.bcc(); };
/*  STA izy */ CPU6502op[0x91] = (m) => { m.izy(); m.sta(); };
/* *KIL     */ CPU6502op[0x92] = (m) => { m.imp(); m.kil(); };
/* *AHX izy */ CPU6502op[0x93] = (m) => { m.izy(); m.ahx(); };
/*  STY zpx */ CPU6502op[0x94] = (m) => { m.zpx(); m.sty(); };
/*  STA zpx */ CPU6502op[0x95] = (m) => { m.zpx(); m.sta(); };
/*  STX zpy */ CPU6502op[0x96] = (m) => { m.zpy(); m.stx(); };
/* *SAX zpy */ CPU6502op[0x97] = (m) => { m.zpy(); m.sax(); };
/*  TYA     */ CPU6502op[0x98] = (m) => { m.imp(); m.tya(); };
/*  STA aby */ CPU6502op[0x99] = (m) => { m.aby(); m.sta(); };
/*  TXS     */ CPU6502op[0x9A] = (m) => { m.imp(); m.txs(); };
/* *TAS aby */ CPU6502op[0x9B] = (m) => { m.aby(); m.tas(); };
/* *SHY abx */ CPU6502op[0x9C] = (m) => { m.abx(); m.shy(); };
/*  STA abx */ CPU6502op[0x9D] = (m) => { m.abx(); m.sta(); };
/* *SHX aby */ CPU6502op[0x9E] = (m) => { m.aby(); m.shx(); };
/* *AHX aby */ CPU6502op[0x9F] = (m) => { m.aby(); m.ahx(); };

/*  LDY imm */ CPU6502op[0xA0] = (m) => { m.imm(); m.ldy(); };
/*  LDA izx */ CPU6502op[0xA1] = (m) => { m.izx(); m.lda(); };
/*  LDX imm */ CPU6502op[0xA2] = (m) => { m.imm(); m.ldx(); };
/* *LAX izx */ CPU6502op[0xA3] = (m) => { m.izx(); m.lax(); };
/*  LDY zp  */ CPU6502op[0xA4] = (m) => { m.zp(); m.ldy(); };
/*  LDA zp  */ CPU6502op[0xA5] = (m) => { m.zp(); m.lda(); };
/*  LDX zp  */ CPU6502op[0xA6] = (m) => { m.zp(); m.ldx(); };
/* *LAX zp  */ CPU6502op[0xA7] = (m) => { m.zp(); m.lax(); };
/*  TAY     */ CPU6502op[0xA8] = (m) => { m.imp(); m.tay(); };
/*  LDA imm */ CPU6502op[0xA9] = (m) => { m.imm(); m.lda(); };
/*  TAX     */ CPU6502op[0xAA] = (m) => { m.imp(); m.tax(); };
/* *LAX imm */ CPU6502op[0xAB] = (m) => { m.imm(); m.lax(); };
/*  LDY abs */ CPU6502op[0xAC] = (m) => { m.abs(); m.ldy(); };
/*  LDA abs */ CPU6502op[0xAD] = (m) => { m.abs(); m.lda(); };
/*  LDX abs */ CPU6502op[0xAE] = (m) => { m.abs(); m.ldx(); };
/* *LAX abs */ CPU6502op[0xAF] = (m) => { m.abs(); m.lax(); };

/*  BCS rel */ CPU6502op[0xB0] = (m) => { m.rel(); m.bcs(); };
/*  LDA izy */ CPU6502op[0xB1] = (m) => { m.izy(); m.lda(); };
/* *KIL     */ CPU6502op[0xB2] = (m) => { m.imp(); m.kil(); };
/* *LAX izy */ CPU6502op[0xB3] = (m) => { m.izy(); m.lax(); };
/*  LDY zpx */ CPU6502op[0xB4] = (m) => { m.zpx(); m.ldy(); };
/*  LDA zpx */ CPU6502op[0xB5] = (m) => { m.zpx(); m.lda(); };
/*  LDX zpy */ CPU6502op[0xB6] = (m) => { m.zpy(); m.ldx(); };
/* *LAX zpy */ CPU6502op[0xB7] = (m) => { m.zpy(); m.lax(); };
/*  CLV     */ CPU6502op[0xB8] = (m) => { m.imp(); m.clv(); };
/*  LDA aby */ CPU6502op[0xB9] = (m) => { m.aby(); m.lda(); };
/*  TSX     */ CPU6502op[0xBA] = (m) => { m.imp(); m.tsx(); };
/* *LAS aby */ CPU6502op[0xBB] = (m) => { m.aby(); m.las(); };
/*  LDY abx */ CPU6502op[0xBC] = (m) => { m.abx(); m.ldy(); };
/*  LDA abx */ CPU6502op[0xBD] = (m) => { m.abx(); m.lda(); };
/*  LDX aby */ CPU6502op[0xBE] = (m) => { m.aby(); m.ldx(); };
/* *LAX aby */ CPU6502op[0xBF] = (m) => { m.aby(); m.lax(); };

/*  CPY imm */ CPU6502op[0xC0] = (m) => { m.imm(); m.cpy(); };
/*  CMP izx */ CPU6502op[0xC1] = (m) => { m.izx(); m.cmp(); };
/* *NOP imm */ CPU6502op[0xC2] = (m) => { m.imm(); m.nop(); };
/* *DCP izx */ CPU6502op[0xC3] = (m) => { m.izx(); m.dcp(); m.rmw(); };
/*  CPY zp  */ CPU6502op[0xC4] = (m) => { m.zp(); m.cpy(); };
/*  CMP zp  */ CPU6502op[0xC5] = (m) => { m.zp(); m.cmp(); };
/*  DEC zp  */ CPU6502op[0xC6] = (m) => { m.zp(); m.dec(); m.rmw(); };
/* *DCP zp  */ CPU6502op[0xC7] = (m) => { m.zp(); m.dcp(); m.rmw(); };
/*  INY     */ CPU6502op[0xC8] = (m) => { m.imp(); m.iny(); };
/*  CMP imm */ CPU6502op[0xC9] = (m) => { m.imm(); m.cmp(); };
/*  DEX     */ CPU6502op[0xCA] = (m) => { m.imp(); m.dex(); };
/* *AXS imm */ CPU6502op[0xCB] = (m) => { m.imm(); m.axs(); };
/*  CPY abs */ CPU6502op[0xCC] = (m) => { m.abs(); m.cpy(); };
/*  CMP abs */ CPU6502op[0xCD] = (m) => { m.abs(); m.cmp(); };
/*  DEC abs */ CPU6502op[0xCE] = (m) => { m.abs(); m.dec(); m.rmw(); };
/* *DCP abs */ CPU6502op[0xCF] = (m) => { m.abs(); m.dcp(); m.rmw(); };

/*  BNE rel */ CPU6502op[0xD0] = (m) => { m.rel(); m.bne(); };
/*  CMP izy */ CPU6502op[0xD1] = (m) => { m.izy(); m.cmp(); };
/* *KIL     */ CPU6502op[0xD2] = (m) => { m.imp(); m.kil(); };
/* *DCP izy */ CPU6502op[0xD3] = (m) => { m.izy(); m.dcp(); m.rmw(); };
/* *NOP zpx */ CPU6502op[0xD4] = (m) => { m.zpx(); m.nop(); };
/*  CMP zpx */ CPU6502op[0xD5] = (m) => { m.zpx(); m.cmp(); };
/*  DEC zpx */ CPU6502op[0xD6] = (m) => { m.zpx(); m.dec(); m.rmw(); };
/* *DCP zpx */ CPU6502op[0xD7] = (m) => { m.zpx(); m.dcp(); m.rmw(); };
/*  CLD     */ CPU6502op[0xD8] = (m) => { m.imp(); m.cld(); };
/*  CMP aby */ CPU6502op[0xD9] = (m) => { m.aby(); m.cmp(); };
/* *NOP     */ CPU6502op[0xDA] = (m) => { m.imp(); m.nop(); };
/* *DCP aby */ CPU6502op[0xDB] = (m) => { m.aby(); m.dcp(); m.rmw(); };
/* *NOP abx */ CPU6502op[0xDC] = (m) => { m.abx(); m.nop(); };
/*  CMP abx */ CPU6502op[0xDD] = (m) => { m.abx(); m.cmp(); };
/*  DEC abx */ CPU6502op[0xDE] = (m) => { m.abx(); m.dec(); m.rmw(); };
/* *DCP abx */ CPU6502op[0xDF] = (m) => { m.abx(); m.dcp(); m.rmw(); };

/*  CPX imm */ CPU6502op[0xE0] = (m) => { m.imm(); m.cpx(); };
/*  SBC izx */ CPU6502op[0xE1] = (m) => { m.izx(); m.sbc(); };
/* *NOP imm */ CPU6502op[0xE2] = (m) => { m.imm(); m.nop(); };
/* *ISC izx */ CPU6502op[0xE3] = (m) => { m.izx(); m.isc(); m.rmw(); };
/*  CPX zp  */ CPU6502op[0xE4] = (m) => { m.zp(); m.cpx(); };
/*  SBC zp  */ CPU6502op[0xE5] = (m) => { m.zp(); m.sbc(); };
/*  INC zp  */ CPU6502op[0xE6] = (m) => { m.zp(); m.inc(); m.rmw(); };
/* *ISC zp  */ CPU6502op[0xE7] = (m) => { m.zp(); m.isc(); m.rmw(); };
/*  INX     */ CPU6502op[0xE8] = (m) => { m.imp(); m.inx(); };
/*  SBC imm */ CPU6502op[0xE9] = (m) => { m.imm(); m.sbc(); };
/*  NOP     */ CPU6502op[0xEA] = (m) => { m.imp(); m.nop(); };
/* *SBC imm */ CPU6502op[0xEB] = (m) => { m.imm(); m.sbc(); };
/*  CPX abs */ CPU6502op[0xEC] = (m) => { m.abs(); m.cpx(); };
/*  SBC abs */ CPU6502op[0xED] = (m) => { m.abs(); m.sbc(); };
/*  INC abs */ CPU6502op[0xEE] = (m) => { m.abs(); m.inc(); m.rmw(); };
/* *ISC abs */ CPU6502op[0xEF] = (m) => { m.abs(); m.isc(); m.rmw(); };

/*  BEQ rel */ CPU6502op[0xF0] = (m) => { m.rel(); m.beq(); };
/*  SBC izy */ CPU6502op[0xF1] = (m) => { m.izy(); m.sbc(); };
/* *KIL     */ CPU6502op[0xF2] = (m) => { m.imp(); m.kil(); };
/* *ISC izy */ CPU6502op[0xF3] = (m) => { m.izy(); m.isc(); m.rmw(); };
/* *NOP zpx */ CPU6502op[0xF4] = (m) => { m.zpx(); m.nop(); };
/*  SBC zpx */ CPU6502op[0xF5] = (m) => { m.zpx(); m.sbc(); };
/*  INC zpx */ CPU6502op[0xF6] = (m) => { m.zpx(); m.inc(); m.rmw(); };
/* *ISC zpx */ CPU6502op[0xF7] = (m) => { m.zpx(); m.isc(); m.rmw(); };
/*  SED     */ CPU6502op[0xF8] = (m) => { m.imp(); m.sed(); };
/*  SBC aby */ CPU6502op[0xF9] = (m) => { m.aby(); m.sbc(); };
/* *NOP     */ CPU6502op[0xFA] = (m) => { m.imp(); m.nop(); };
/* *ISC aby */ CPU6502op[0xFB] = (m) => { m.aby(); m.isc(); m.rmw(); };
/* *NOP abx */ CPU6502op[0xFC] = (m) => { m.abx(); m.nop(); };
/*  SBC abx */ CPU6502op[0xFD] = (m) => { m.abx(); m.sbc(); };
/*  INC abx */ CPU6502op[0xFE] = (m) => { m.abx(); m.inc(); m.rmw(); };
/* *ISC abx */ CPU6502op[0xFF] = (m) => { m.abx(); m.isc(); m.rmw(); };


export default CPU6502;