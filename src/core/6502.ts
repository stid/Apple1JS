import Bus from 'core/Bus';

////////////////////////////////////////////////////////////////////////////////
// Opcode table
////////////////////////////////////////////////////////////////////////////////

const CPU6502op: Array<(m: CPU6502) => void> = [];

/*  BRK     */ CPU6502op[0x00] = (m: CPU6502) => {
    m.imp();
    m.brk();
};
/*  ORA izx */ CPU6502op[0x01] = (m: CPU6502) => {
    m.izx();
    m.ora();
};
/* *KIL     */ CPU6502op[0x02] = (m: CPU6502) => {
    m.imp();
    m.kil();
};
/* *SLO izx */ CPU6502op[0x03] = (m: CPU6502) => {
    m.izx();
    m.slo();
    m.rmw();
};
/* *NOP zp  */ CPU6502op[0x04] = (m: CPU6502) => {
    m.zp();
    m.nop();
};
/*  ORA zp  */ CPU6502op[0x05] = (m: CPU6502) => {
    m.zp();
    m.ora();
};
/*  ASL zp  */ CPU6502op[0x06] = (m: CPU6502) => {
    m.zp();
    m.asl();
    m.rmw();
};
/* *SLO zp  */ CPU6502op[0x07] = (m: CPU6502) => {
    m.zp();
    m.slo();
    m.rmw();
};
/*  PHP     */ CPU6502op[0x08] = (m: CPU6502) => {
    m.imp();
    m.php();
};
/*  ORA imm */ CPU6502op[0x09] = (m: CPU6502) => {
    m.imm();
    m.ora();
};
/*  ASL     */ CPU6502op[0x0a] = (m: CPU6502) => {
    m.imp();
    m.asla();
};
/* *ANC imm */ CPU6502op[0x0b] = (m: CPU6502) => {
    m.imm();
    m.anc();
};
/* *NOP abs */ CPU6502op[0x0c] = (m: CPU6502) => {
    m.abs();
    m.nop();
};
/*  ORA abs */ CPU6502op[0x0d] = (m: CPU6502) => {
    m.abs();
    m.ora();
};
/*  ASL abs */ CPU6502op[0x0e] = (m: CPU6502) => {
    m.abs();
    m.asl();
    m.rmw();
};
/* *SLO abs */ CPU6502op[0x0f] = (m: CPU6502) => {
    m.abs();
    m.slo();
    m.rmw();
};

/*  BPL rel */ CPU6502op[0x10] = (m: CPU6502) => {
    m.rel();
    m.bpl();
};
/*  ORA izy */ CPU6502op[0x11] = (m: CPU6502) => {
    m.izy();
    m.ora();
};
/* *KIL     */ CPU6502op[0x12] = (m: CPU6502) => {
    m.imp();
    m.kil();
};
/* *SLO izy */ CPU6502op[0x13] = (m: CPU6502) => {
    m.izy();
    m.slo();
    m.rmw();
};
/* *NOP zpx */ CPU6502op[0x14] = (m: CPU6502) => {
    m.zpx();
    m.nop();
};
/*  ORA zpx */ CPU6502op[0x15] = (m: CPU6502) => {
    m.zpx();
    m.ora();
};
/*  ASL zpx */ CPU6502op[0x16] = (m: CPU6502) => {
    m.zpx();
    m.asl();
    m.rmw();
};
/* *SLO zpx */ CPU6502op[0x17] = (m: CPU6502) => {
    m.zpx();
    m.slo();
    m.rmw();
};
/*  CLC     */ CPU6502op[0x18] = (m: CPU6502) => {
    m.imp();
    m.clc();
};
/*  ORA aby */ CPU6502op[0x19] = (m: CPU6502) => {
    m.aby();
    m.ora();
};
/* *NOP     */ CPU6502op[0x1a] = (m: CPU6502) => {
    m.imp();
    m.nop();
};
/* *SLO aby */ CPU6502op[0x1b] = (m: CPU6502) => {
    m.aby();
    m.slo();
    m.rmw();
};
/* *NOP abx */ CPU6502op[0x1c] = (m: CPU6502) => {
    m.abx();
    m.nop();
};
/*  ORA abx */ CPU6502op[0x1d] = (m: CPU6502) => {
    m.abx();
    m.ora();
};
/*  ASL abx */ CPU6502op[0x1e] = (m: CPU6502) => {
    m.abx();
    m.asl();
    m.rmw();
};
/* *SLO abx */ CPU6502op[0x1f] = (m: CPU6502) => {
    m.abx();
    m.slo();
    m.rmw();
};

/*  JSR abs */ CPU6502op[0x20] = (m: CPU6502) => {
    m.abs();
    m.jsr();
};
/*  AND izx */ CPU6502op[0x21] = (m: CPU6502) => {
    m.izx();
    m.and();
};
/* *KIL     */ CPU6502op[0x22] = (m: CPU6502) => {
    m.imp();
    m.kil();
};
/* *RLA izx */ CPU6502op[0x23] = (m: CPU6502) => {
    m.izx();
    m.rla();
    m.rmw();
};
/*  BIT zp  */ CPU6502op[0x24] = (m: CPU6502) => {
    m.zp();
    m.bit();
};
/*  AND zp  */ CPU6502op[0x25] = (m: CPU6502) => {
    m.zp();
    m.and();
};
/*  ROL zp  */ CPU6502op[0x26] = (m: CPU6502) => {
    m.zp();
    m.rol();
    m.rmw();
};
/* *RLA zp  */ CPU6502op[0x27] = (m: CPU6502) => {
    m.zp();
    m.rla();
    m.rmw();
};
/*  PLP     */ CPU6502op[0x28] = (m: CPU6502) => {
    m.imp();
    m.plp();
};
/*  AND imm */ CPU6502op[0x29] = (m: CPU6502) => {
    m.imm();
    m.and();
};
/*  ROL     */ CPU6502op[0x2a] = (m: CPU6502) => {
    m.imp();
    m.rola();
};
/* *ANC imm */ CPU6502op[0x2b] = (m: CPU6502) => {
    m.imm();
    m.anc();
};
/*  BIT abs */ CPU6502op[0x2c] = (m: CPU6502) => {
    m.abs();
    m.bit();
};
/*  AND abs */ CPU6502op[0x2d] = (m: CPU6502) => {
    m.abs();
    m.and();
};
/*  ROL abs */ CPU6502op[0x2e] = (m: CPU6502) => {
    m.abs();
    m.rol();
    m.rmw();
};
/* *RLA abs */ CPU6502op[0x2f] = (m: CPU6502) => {
    m.abs();
    m.rla();
    m.rmw();
};

/*  BMI rel */ CPU6502op[0x30] = (m: CPU6502) => {
    m.rel();
    m.bmi();
};
/*  AND izy */ CPU6502op[0x31] = (m: CPU6502) => {
    m.izy();
    m.and();
};
/* *KIL     */ CPU6502op[0x32] = (m: CPU6502) => {
    m.imp();
    m.kil();
};
/* *RLA izy */ CPU6502op[0x33] = (m: CPU6502) => {
    m.izy();
    m.rla();
    m.rmw();
};
/* *NOP zpx */ CPU6502op[0x34] = (m: CPU6502) => {
    m.zpx();
    m.nop();
};
/*  AND zpx */ CPU6502op[0x35] = (m: CPU6502) => {
    m.zpx();
    m.and();
};
/*  ROL zpx */ CPU6502op[0x36] = (m: CPU6502) => {
    m.zpx();
    m.rol();
    m.rmw();
};
/* *RLA zpx */ CPU6502op[0x37] = (m: CPU6502) => {
    m.zpx();
    m.rla();
    m.rmw();
};
/*  SEC     */ CPU6502op[0x38] = (m: CPU6502) => {
    m.imp();
    m.sec();
};
/*  AND aby */ CPU6502op[0x39] = (m: CPU6502) => {
    m.aby();
    m.and();
};
/* *NOP     */ CPU6502op[0x3a] = (m: CPU6502) => {
    m.imp();
    m.nop();
};
/* *RLA aby */ CPU6502op[0x3b] = (m: CPU6502) => {
    m.aby();
    m.rla();
    m.rmw();
};
/* *NOP abx */ CPU6502op[0x3c] = (m: CPU6502) => {
    m.abx();
    m.nop();
};
/*  AND abx */ CPU6502op[0x3d] = (m: CPU6502) => {
    m.abx();
    m.and();
};
/*  ROL abx */ CPU6502op[0x3e] = (m: CPU6502) => {
    m.abx();
    m.rol();
    m.rmw();
};
/* *RLA abx */ CPU6502op[0x3f] = (m: CPU6502) => {
    m.abx();
    m.rla();
    m.rmw();
};

/*  RTI     */ CPU6502op[0x40] = (m: CPU6502) => {
    m.imp();
    m.rti();
};
/*  EOR izx */ CPU6502op[0x41] = (m: CPU6502) => {
    m.izx();
    m.eor();
};
/* *KIL     */ CPU6502op[0x42] = (m: CPU6502) => {
    m.imp();
    m.kil();
};
/* *SRE izx */ CPU6502op[0x43] = (m: CPU6502) => {
    m.izx();
    m.sre();
    m.rmw();
};
/* *NOP zp  */ CPU6502op[0x44] = (m: CPU6502) => {
    m.zp();
    m.nop();
};
/*  EOR zp  */ CPU6502op[0x45] = (m: CPU6502) => {
    m.zp();
    m.eor();
};
/*  LSR zp  */ CPU6502op[0x46] = (m: CPU6502) => {
    m.zp();
    m.lsr();
    m.rmw();
};
/* *SRE zp  */ CPU6502op[0x47] = (m: CPU6502) => {
    m.zp();
    m.sre();
    m.rmw();
};
/*  PHA     */ CPU6502op[0x48] = (m: CPU6502) => {
    m.imp();
    m.pha();
};
/*  EOR imm */ CPU6502op[0x49] = (m: CPU6502) => {
    m.imm();
    m.eor();
};
/*  LSR     */ CPU6502op[0x4a] = (m: CPU6502) => {
    m.imp();
    m.lsra();
};
/* *ALR imm */ CPU6502op[0x4b] = (m: CPU6502) => {
    m.imm();
    m.alr();
};
/*  JMP abs */ CPU6502op[0x4c] = (m: CPU6502) => {
    m.abs();
    m.jmp();
};
/*  EOR abs */ CPU6502op[0x4d] = (m: CPU6502) => {
    m.abs();
    m.eor();
};
/*  LSR abs */ CPU6502op[0x4e] = (m: CPU6502) => {
    m.abs();
    m.lsr();
    m.rmw();
};
/* *SRE abs */ CPU6502op[0x4f] = (m: CPU6502) => {
    m.abs();
    m.sre();
    m.rmw();
};

/*  BVC rel */ CPU6502op[0x50] = (m: CPU6502) => {
    m.rel();
    m.bvc();
};
/*  EOR izy */ CPU6502op[0x51] = (m: CPU6502) => {
    m.izy();
    m.eor();
};
/* *KIL     */ CPU6502op[0x52] = (m: CPU6502) => {
    m.imp();
    m.kil();
};
/* *SRE izy */ CPU6502op[0x53] = (m: CPU6502) => {
    m.izy();
    m.sre();
    m.rmw();
};
/* *NOP zpx */ CPU6502op[0x54] = (m: CPU6502) => {
    m.zpx();
    m.nop();
};
/*  EOR zpx */ CPU6502op[0x55] = (m: CPU6502) => {
    m.zpx();
    m.eor();
};
/*  LSR zpx */ CPU6502op[0x56] = (m: CPU6502) => {
    m.zpx();
    m.lsr();
    m.rmw();
};
/* *SRE zpx */ CPU6502op[0x57] = (m: CPU6502) => {
    m.zpx();
    m.sre();
    m.rmw();
};
/*  CLI     */ CPU6502op[0x58] = (m: CPU6502) => {
    m.imp();
    m.cli();
};
/*  EOR aby */ CPU6502op[0x59] = (m: CPU6502) => {
    m.aby();
    m.eor();
};
/* *NOP     */ CPU6502op[0x5a] = (m: CPU6502) => {
    m.imp();
    m.nop();
};
/* *SRE aby */ CPU6502op[0x5b] = (m: CPU6502) => {
    m.aby();
    m.sre();
    m.rmw();
};
/* *NOP abx */ CPU6502op[0x5c] = (m: CPU6502) => {
    m.abx();
    m.nop();
};
/*  EOR abx */ CPU6502op[0x5d] = (m: CPU6502) => {
    m.abx();
    m.eor();
};
/*  LSR abx */ CPU6502op[0x5e] = (m: CPU6502) => {
    m.abx();
    m.lsr();
    m.rmw();
};
/* *SRE abx */ CPU6502op[0x5f] = (m: CPU6502) => {
    m.abx();
    m.sre();
    m.rmw();
};

/*  RTS     */ CPU6502op[0x60] = (m: CPU6502) => {
    m.imp();
    m.rts();
};
/*  ADC izx */ CPU6502op[0x61] = (m: CPU6502) => {
    m.izx();
    m.adc();
};
/* *KIL     */ CPU6502op[0x62] = (m: CPU6502) => {
    m.imp();
    m.kil();
};
/* *RRA izx */ CPU6502op[0x63] = (m: CPU6502) => {
    m.izx();
    m.rra();
    m.rmw();
};
/* *NOP zp  */ CPU6502op[0x64] = (m: CPU6502) => {
    m.zp();
    m.nop();
};
/*  ADC zp  */ CPU6502op[0x65] = (m: CPU6502) => {
    m.zp();
    m.adc();
};
/*  ROR zp  */ CPU6502op[0x66] = (m: CPU6502) => {
    m.zp();
    m.ror();
    m.rmw();
};
/* *RRA zp  */ CPU6502op[0x67] = (m: CPU6502) => {
    m.zp();
    m.rra();
    m.rmw();
};
/*  PLA     */ CPU6502op[0x68] = (m: CPU6502) => {
    m.imp();
    m.pla();
};
/*  ADC imm */ CPU6502op[0x69] = (m: CPU6502) => {
    m.imm();
    m.adc();
};
/*  ROR     */ CPU6502op[0x6a] = (m: CPU6502) => {
    m.imp();
    m.rora();
};
/* *ARR imm */ CPU6502op[0x6b] = (m: CPU6502) => {
    m.imm();
    m.arr();
};
/*  JMP ind */ CPU6502op[0x6c] = (m: CPU6502) => {
    m.ind();
    m.jmp();
};
/*  ADC abs */ CPU6502op[0x6d] = (m: CPU6502) => {
    m.abs();
    m.adc();
};
/*  ROR abs */ CPU6502op[0x6e] = (m: CPU6502) => {
    m.abs();
    m.ror();
    m.rmw();
};
/* *RRA abs */ CPU6502op[0x6f] = (m: CPU6502) => {
    m.abs();
    m.rra();
    m.rmw();
};

/*  BVS rel */ CPU6502op[0x70] = (m: CPU6502) => {
    m.rel();
    m.bvs();
};
/*  ADC izy */ CPU6502op[0x71] = (m: CPU6502) => {
    m.izy();
    m.adc();
};
/* *KIL     */ CPU6502op[0x72] = (m: CPU6502) => {
    m.imp();
    m.kil();
};
/* *RRA izy */ CPU6502op[0x73] = (m: CPU6502) => {
    m.izy();
    m.rra();
    m.rmw();
};
/* *NOP zpx */ CPU6502op[0x74] = (m: CPU6502) => {
    m.zpx();
    m.nop();
};
/*  ADC zpx */ CPU6502op[0x75] = (m: CPU6502) => {
    m.zpx();
    m.adc();
};
/*  ROR zpx */ CPU6502op[0x76] = (m: CPU6502) => {
    m.zpx();
    m.ror();
    m.rmw();
};
/* *RRA zpx */ CPU6502op[0x77] = (m: CPU6502) => {
    m.zpx();
    m.rra();
    m.rmw();
};
/*  SEI     */ CPU6502op[0x78] = (m: CPU6502) => {
    m.imp();
    m.sei();
};
/*  ADC aby */ CPU6502op[0x79] = (m: CPU6502) => {
    m.aby();
    m.adc();
};
/* *NOP     */ CPU6502op[0x7a] = (m: CPU6502) => {
    m.imp();
    m.nop();
};
/* *RRA aby */ CPU6502op[0x7b] = (m: CPU6502) => {
    m.aby();
    m.rra();
    m.rmw();
};
/* *NOP abx */ CPU6502op[0x7c] = (m: CPU6502) => {
    m.abx();
    m.nop();
};
/*  ADC abx */ CPU6502op[0x7d] = (m: CPU6502) => {
    m.abx();
    m.adc();
};
/*  ROR abx */ CPU6502op[0x7e] = (m: CPU6502) => {
    m.abx();
    m.ror();
    m.rmw();
};
/* *RRA abx */ CPU6502op[0x7f] = (m: CPU6502) => {
    m.abx();
    m.rra();
    m.rmw();
};

/* *NOP imm */ CPU6502op[0x80] = (m: CPU6502) => {
    m.imm();
    m.nop();
};
/*  STA izx */ CPU6502op[0x81] = (m: CPU6502) => {
    m.izx();
    m.sta();
};
/* *NOP imm */ CPU6502op[0x82] = (m: CPU6502) => {
    m.imm();
    m.nop();
};
/* *SAX izx */ CPU6502op[0x83] = (m: CPU6502) => {
    m.izx();
    m.sax();
};
/*  STY zp  */ CPU6502op[0x84] = (m: CPU6502) => {
    m.zp();
    m.sty();
};
/*  STA zp  */ CPU6502op[0x85] = (m: CPU6502) => {
    m.zp();
    m.sta();
};
/*  STX zp  */ CPU6502op[0x86] = (m: CPU6502) => {
    m.zp();
    m.stx();
};
/* *SAX zp  */ CPU6502op[0x87] = (m: CPU6502) => {
    m.zp();
    m.sax();
};
/*  DEY     */ CPU6502op[0x88] = (m: CPU6502) => {
    m.imp();
    m.dey();
};
/* *NOP imm */ CPU6502op[0x89] = (m: CPU6502) => {
    m.imm();
    m.nop();
};
/*  TXA     */ CPU6502op[0x8a] = (m: CPU6502) => {
    m.imp();
    m.txa();
};
/* *XAA imm */ CPU6502op[0x8b] = (m: CPU6502) => {
    m.imm();
    m.xaa();
};
/*  STY abs */ CPU6502op[0x8c] = (m: CPU6502) => {
    m.abs();
    m.sty();
};
/*  STA abs */ CPU6502op[0x8d] = (m: CPU6502) => {
    m.abs();
    m.sta();
};
/*  STX abs */ CPU6502op[0x8e] = (m: CPU6502) => {
    m.abs();
    m.stx();
};
/* *SAX abs */ CPU6502op[0x8f] = (m: CPU6502) => {
    m.abs();
    m.sax();
};

/*  BCC rel */ CPU6502op[0x90] = (m: CPU6502) => {
    m.rel();
    m.bcc();
};
/*  STA izy */ CPU6502op[0x91] = (m: CPU6502) => {
    m.izy();
    m.sta();
};
/* *KIL     */ CPU6502op[0x92] = (m: CPU6502) => {
    m.imp();
    m.kil();
};
/* *AHX izy */ CPU6502op[0x93] = (m: CPU6502) => {
    m.izy();
    m.ahx();
};
/*  STY zpx */ CPU6502op[0x94] = (m: CPU6502) => {
    m.zpx();
    m.sty();
};
/*  STA zpx */ CPU6502op[0x95] = (m: CPU6502) => {
    m.zpx();
    m.sta();
};
/*  STX zpy */ CPU6502op[0x96] = (m: CPU6502) => {
    m.zpy();
    m.stx();
};
/* *SAX zpy */ CPU6502op[0x97] = (m: CPU6502) => {
    m.zpy();
    m.sax();
};
/*  TYA     */ CPU6502op[0x98] = (m: CPU6502) => {
    m.imp();
    m.tya();
};
/*  STA aby */ CPU6502op[0x99] = (m: CPU6502) => {
    m.aby();
    m.sta();
};
/*  TXS     */ CPU6502op[0x9a] = (m: CPU6502) => {
    m.imp();
    m.txs();
};
/* *TAS aby */ CPU6502op[0x9b] = (m: CPU6502) => {
    m.aby();
    m.tas();
};
/* *SHY abx */ CPU6502op[0x9c] = (m: CPU6502) => {
    m.abx();
    m.shy();
};
/*  STA abx */ CPU6502op[0x9d] = (m: CPU6502) => {
    m.abx();
    m.sta();
};
/* *SHX aby */ CPU6502op[0x9e] = (m: CPU6502) => {
    m.aby();
    m.shx();
};
/* *AHX aby */ CPU6502op[0x9f] = (m: CPU6502) => {
    m.aby();
    m.ahx();
};

/*  LDY imm */ CPU6502op[0xa0] = (m: CPU6502) => {
    m.imm();
    m.ldy();
};
/*  LDA izx */ CPU6502op[0xa1] = (m: CPU6502) => {
    m.izx();
    m.lda();
};
/*  LDX imm */ CPU6502op[0xa2] = (m: CPU6502) => {
    m.imm();
    m.ldx();
};
/* *LAX izx */ CPU6502op[0xa3] = (m: CPU6502) => {
    m.izx();
    m.lax();
};
/*  LDY zp  */ CPU6502op[0xa4] = (m: CPU6502) => {
    m.zp();
    m.ldy();
};
/*  LDA zp  */ CPU6502op[0xa5] = (m: CPU6502) => {
    m.zp();
    m.lda();
};
/*  LDX zp  */ CPU6502op[0xa6] = (m: CPU6502) => {
    m.zp();
    m.ldx();
};
/* *LAX zp  */ CPU6502op[0xa7] = (m: CPU6502) => {
    m.zp();
    m.lax();
};
/*  TAY     */ CPU6502op[0xa8] = (m: CPU6502) => {
    m.imp();
    m.tay();
};
/*  LDA imm */ CPU6502op[0xa9] = (m: CPU6502) => {
    m.imm();
    m.lda();
};
/*  TAX     */ CPU6502op[0xaa] = (m: CPU6502) => {
    m.imp();
    m.tax();
};
/* *LAX imm */ CPU6502op[0xab] = (m: CPU6502) => {
    m.imm();
    m.lax();
};
/*  LDY abs */ CPU6502op[0xac] = (m: CPU6502) => {
    m.abs();
    m.ldy();
};
/*  LDA abs */ CPU6502op[0xad] = (m: CPU6502) => {
    m.abs();
    m.lda();
};
/*  LDX abs */ CPU6502op[0xae] = (m: CPU6502) => {
    m.abs();
    m.ldx();
};
/* *LAX abs */ CPU6502op[0xaf] = (m: CPU6502) => {
    m.abs();
    m.lax();
};

/*  BCS rel */ CPU6502op[0xb0] = (m: CPU6502) => {
    m.rel();
    m.bcs();
};
/*  LDA izy */ CPU6502op[0xb1] = (m: CPU6502) => {
    m.izy();
    m.lda();
};
/* *KIL     */ CPU6502op[0xb2] = (m: CPU6502) => {
    m.imp();
    m.kil();
};
/* *LAX izy */ CPU6502op[0xb3] = (m: CPU6502) => {
    m.izy();
    m.lax();
};
/*  LDY zpx */ CPU6502op[0xb4] = (m: CPU6502) => {
    m.zpx();
    m.ldy();
};
/*  LDA zpx */ CPU6502op[0xb5] = (m: CPU6502) => {
    m.zpx();
    m.lda();
};
/*  LDX zpy */ CPU6502op[0xb6] = (m: CPU6502) => {
    m.zpy();
    m.ldx();
};
/* *LAX zpy */ CPU6502op[0xb7] = (m: CPU6502) => {
    m.zpy();
    m.lax();
};
/*  CLV     */ CPU6502op[0xb8] = (m: CPU6502) => {
    m.imp();
    m.clv();
};
/*  LDA aby */ CPU6502op[0xb9] = (m: CPU6502) => {
    m.aby();
    m.lda();
};
/*  TSX     */ CPU6502op[0xba] = (m: CPU6502) => {
    m.imp();
    m.tsx();
};
/* *LAS aby */ CPU6502op[0xbb] = (m: CPU6502) => {
    m.aby();
    m.las();
};
/*  LDY abx */ CPU6502op[0xbc] = (m: CPU6502) => {
    m.abx();
    m.ldy();
};
/*  LDA abx */ CPU6502op[0xbd] = (m: CPU6502) => {
    m.abx();
    m.lda();
};
/*  LDX aby */ CPU6502op[0xbe] = (m: CPU6502) => {
    m.aby();
    m.ldx();
};
/* *LAX aby */ CPU6502op[0xbf] = (m: CPU6502) => {
    m.aby();
    m.lax();
};

/*  CPY imm */ CPU6502op[0xc0] = (m: CPU6502) => {
    m.imm();
    m.cpy();
};
/*  CMP izx */ CPU6502op[0xc1] = (m: CPU6502) => {
    m.izx();
    m.cmp();
};
/* *NOP imm */ CPU6502op[0xc2] = (m: CPU6502) => {
    m.imm();
    m.nop();
};
/* *DCP izx */ CPU6502op[0xc3] = (m: CPU6502) => {
    m.izx();
    m.dcp();
    m.rmw();
};
/*  CPY zp  */ CPU6502op[0xc4] = (m: CPU6502) => {
    m.zp();
    m.cpy();
};
/*  CMP zp  */ CPU6502op[0xc5] = (m: CPU6502) => {
    m.zp();
    m.cmp();
};
/*  DEC zp  */ CPU6502op[0xc6] = (m: CPU6502) => {
    m.zp();
    m.dec();
    m.rmw();
};
/* *DCP zp  */ CPU6502op[0xc7] = (m: CPU6502) => {
    m.zp();
    m.dcp();
    m.rmw();
};
/*  INY     */ CPU6502op[0xc8] = (m: CPU6502) => {
    m.imp();
    m.iny();
};
/*  CMP imm */ CPU6502op[0xc9] = (m: CPU6502) => {
    m.imm();
    m.cmp();
};
/*  DEX     */ CPU6502op[0xca] = (m: CPU6502) => {
    m.imp();
    m.dex();
};
/* *AXS imm */ CPU6502op[0xcb] = (m: CPU6502) => {
    m.imm();
    m.axs();
};
/*  CPY abs */ CPU6502op[0xcc] = (m: CPU6502) => {
    m.abs();
    m.cpy();
};
/*  CMP abs */ CPU6502op[0xcd] = (m: CPU6502) => {
    m.abs();
    m.cmp();
};
/*  DEC abs */ CPU6502op[0xce] = (m: CPU6502) => {
    m.abs();
    m.dec();
    m.rmw();
};
/* *DCP abs */ CPU6502op[0xcf] = (m: CPU6502) => {
    m.abs();
    m.dcp();
    m.rmw();
};

/*  BNE rel */ CPU6502op[0xd0] = (m: CPU6502) => {
    m.rel();
    m.bne();
};
/*  CMP izy */ CPU6502op[0xd1] = (m: CPU6502) => {
    m.izy();
    m.cmp();
};
/* *KIL     */ CPU6502op[0xd2] = (m: CPU6502) => {
    m.imp();
    m.kil();
};
/* *DCP izy */ CPU6502op[0xd3] = (m: CPU6502) => {
    m.izy();
    m.dcp();
    m.rmw();
};
/* *NOP zpx */ CPU6502op[0xd4] = (m: CPU6502) => {
    m.zpx();
    m.nop();
};
/*  CMP zpx */ CPU6502op[0xd5] = (m: CPU6502) => {
    m.zpx();
    m.cmp();
};
/*  DEC zpx */ CPU6502op[0xd6] = (m: CPU6502) => {
    m.zpx();
    m.dec();
    m.rmw();
};
/* *DCP zpx */ CPU6502op[0xd7] = (m: CPU6502) => {
    m.zpx();
    m.dcp();
    m.rmw();
};
/*  CLD     */ CPU6502op[0xd8] = (m: CPU6502) => {
    m.imp();
    m.cld();
};
/*  CMP aby */ CPU6502op[0xd9] = (m: CPU6502) => {
    m.aby();
    m.cmp();
};
/* *NOP     */ CPU6502op[0xda] = (m: CPU6502) => {
    m.imp();
    m.nop();
};
/* *DCP aby */ CPU6502op[0xdb] = (m: CPU6502) => {
    m.aby();
    m.dcp();
    m.rmw();
};
/* *NOP abx */ CPU6502op[0xdc] = (m: CPU6502) => {
    m.abx();
    m.nop();
};
/*  CMP abx */ CPU6502op[0xdd] = (m: CPU6502) => {
    m.abx();
    m.cmp();
};
/*  DEC abx */ CPU6502op[0xde] = (m: CPU6502) => {
    m.abx();
    m.dec();
    m.rmw();
};
/* *DCP abx */ CPU6502op[0xdf] = (m: CPU6502) => {
    m.abx();
    m.dcp();
    m.rmw();
};

/*  CPX imm */ CPU6502op[0xe0] = (m: CPU6502) => {
    m.imm();
    m.cpx();
};
/*  SBC izx */ CPU6502op[0xe1] = (m: CPU6502) => {
    m.izx();
    m.sbc();
};
/* *NOP imm */ CPU6502op[0xe2] = (m: CPU6502) => {
    m.imm();
    m.nop();
};
/* *ISC izx */ CPU6502op[0xe3] = (m: CPU6502) => {
    m.izx();
    m.isc();
    m.rmw();
};
/*  CPX zp  */ CPU6502op[0xe4] = (m: CPU6502) => {
    m.zp();
    m.cpx();
};
/*  SBC zp  */ CPU6502op[0xe5] = (m: CPU6502) => {
    m.zp();
    m.sbc();
};
/*  INC zp  */ CPU6502op[0xe6] = (m: CPU6502) => {
    m.zp();
    m.inc();
    m.rmw();
};
/* *ISC zp  */ CPU6502op[0xe7] = (m: CPU6502) => {
    m.zp();
    m.isc();
    m.rmw();
};
/*  INX     */ CPU6502op[0xe8] = (m: CPU6502) => {
    m.imp();
    m.inx();
};
/*  SBC imm */ CPU6502op[0xe9] = (m: CPU6502) => {
    m.imm();
    m.sbc();
};
/*  NOP     */ CPU6502op[0xea] = (m: CPU6502) => {
    m.imp();
    m.nop();
};
/* *SBC imm */ CPU6502op[0xeb] = (m: CPU6502) => {
    m.imm();
    m.sbc();
};
/*  CPX abs */ CPU6502op[0xec] = (m: CPU6502) => {
    m.abs();
    m.cpx();
};
/*  SBC abs */ CPU6502op[0xed] = (m: CPU6502) => {
    m.abs();
    m.sbc();
};
/*  INC abs */ CPU6502op[0xee] = (m: CPU6502) => {
    m.abs();
    m.inc();
    m.rmw();
};
/* *ISC abs */ CPU6502op[0xef] = (m: CPU6502) => {
    m.abs();
    m.isc();
    m.rmw();
};

/*  BEQ rel */ CPU6502op[0xf0] = (m: CPU6502) => {
    m.rel();
    m.beq();
};
/*  SBC izy */ CPU6502op[0xf1] = (m: CPU6502) => {
    m.izy();
    m.sbc();
};
/* *KIL     */ CPU6502op[0xf2] = (m: CPU6502) => {
    m.imp();
    m.kil();
};
/* *ISC izy */ CPU6502op[0xf3] = (m: CPU6502) => {
    m.izy();
    m.isc();
    m.rmw();
};
/* *NOP zpx */ CPU6502op[0xf4] = (m: CPU6502) => {
    m.zpx();
    m.nop();
};
/*  SBC zpx */ CPU6502op[0xf5] = (m: CPU6502) => {
    m.zpx();
    m.sbc();
};
/*  INC zpx */ CPU6502op[0xf6] = (m: CPU6502) => {
    m.zpx();
    m.inc();
    m.rmw();
};
/* *ISC zpx */ CPU6502op[0xf7] = (m: CPU6502) => {
    m.zpx();
    m.isc();
    m.rmw();
};
/*  SED     */ CPU6502op[0xf8] = (m: CPU6502) => {
    m.imp();
    m.sed();
};
/*  SBC aby */ CPU6502op[0xf9] = (m: CPU6502) => {
    m.aby();
    m.sbc();
};
/* *NOP     */ CPU6502op[0xfa] = (m: CPU6502) => {
    m.imp();
    m.nop();
};
/* *ISC aby */ CPU6502op[0xfb] = (m: CPU6502) => {
    m.aby();
    m.isc();
    m.rmw();
};
/* *NOP abx */ CPU6502op[0xfc] = (m: CPU6502) => {
    m.abx();
    m.nop();
};
/*  SBC abx */ CPU6502op[0xfd] = (m: CPU6502) => {
    m.abx();
    m.sbc();
};
/*  INC abx */ CPU6502op[0xfe] = (m: CPU6502) => {
    m.abx();
    m.inc();
    m.rmw();
};
/* *ISC abx */ CPU6502op[0xff] = (m: CPU6502) => {
    m.abx();
    m.isc();
    m.rmw();
};

class CPU6502 implements Clockable {
    bus: Bus;
    PC: number;
    A: number;
    X: number;
    Y: number;
    S: number;
    N: boolean;
    Z: boolean;
    C: boolean;
    V: boolean;
    I: boolean;
    D: boolean;
    irq: boolean;
    nmi: boolean;
    tmp: number;
    addr: number;
    opcode: number;
    data: number;
    address: number;

    cycles: number;

    constructor(bus: Bus) {
        this.bus = bus;

        this.PC = 0; // Program counter
        this.A = 0;
        this.X = 0;
        this.Y = 0;
        this.S = 0; // Registers
        this.N = false;
        this.Z = false;
        this.C = false;
        this.V = false; // ALU flags
        this.I = false;
        this.D = false; // Other flags

        this.data = 0;
        this.address = 0;

        this.irq = false;
        this.nmi = false; // IRQ lines

        this.tmp = 0;
        this.addr = 0; // Temporary registers
        this.opcode = 0; // Current opcode
        this.cycles = 0; // Cycles counter
    }

    ////////////////////////////////////////////////////////////////////////////////
    // CPU control
    ////////////////////////////////////////////////////////////////////////////////

    reset(): void {
        this.A = 0;
        this.X = 0;
        this.Y = 0;
        this.S = 0;
        this.N = false;
        this.Z = true;
        this.C = false;
        this.V = false;
        this.I = false;
        this.D = false;

        this.data = 0;
        this.address = 0;

        this.PC = (this.read(0xfffd) << 8) | this.read(0xfffc);
    }

    step(): number {
        const startCycles = this.cycles;
        this.opcode = this.read(this.PC++);
        CPU6502op[this.opcode](this);
        return this.cycles - startCycles;
    }

    bulkSteps(steps: number): void {
        let currentCycleCount = 0;
        while (currentCycleCount <= steps) {
            currentCycleCount += this.step();
        }
    }

    read(address: number): number {
        this.address = address;
        this.data = this.bus.read(address);
        return this.data;
    }

    write(address: number, value: number): void {
        this.address = address;
        this.data = value;
        this.bus.write(address, value);
    }

    getCycles(): number {
        return this.cycles;
    }

    toLog(): void {
        console.log(this.toDebug());
    }

    toDebug(): { REG: string; HW: string } {
        let reg: string = 'nPC=' + this.PC.toString(16).padStart(4, '0').toUpperCase();
        reg += ' cyc=' + this.cycles;
        reg += ' [' + this.opcode.toString(16).padStart(2, '0').toUpperCase() + '] ';
        reg += this.C ? 'C' : '-';
        reg += this.N ? 'N' : '-';
        reg += this.Z ? 'Z' : '-';
        reg += this.V ? 'V' : '-';
        reg += this.D ? 'D' : '-';
        reg += this.I ? 'I' : '-';
        reg += ' A=' + this.A.toString(16).padStart(2, '0').toUpperCase();
        reg += ' X=' + this.X.toString(16).padStart(2, '0').toUpperCase();
        reg += ' Y=' + this.Y.toString(16).padStart(2, '0').toUpperCase();
        reg += ' S=' + this.S.toString(16).padStart(2, '0').toUpperCase();

        let hw = 'ADDR=' + this.address.toString(16).padStart(4, '0').toUpperCase();
        hw += ' DATA=' + this.data.toString(16).padStart(4, '0').toUpperCase();
        return { REG: reg, HW: hw };
    }

    ////////////////////////////////////////////////////////////////////////////////
    // Subroutines - addressing modes & flags
    ////////////////////////////////////////////////////////////////////////////////

    izx(): void {
        const a: number = (this.read(this.PC++) + this.X) & 0xff;
        this.addr = (this.read(a + 1) << 8) | this.read(a);
        this.cycles += 6;
    }

    izy(): void {
        const a: number = this.read(this.PC++);
        const paddr: number = (this.read((a + 1) & 0xff) << 8) | this.read(a);
        this.addr = paddr + this.Y;
        if ((paddr & 0x100) != (this.addr & 0x100)) {
            this.cycles += 6;
        } else {
            this.cycles += 5;
        }
    }

    ind(): void {
        let a: number = this.read(this.PC);
        a |= this.read((this.PC & 0xff00) | ((this.PC + 1) & 0xff)) << 8;
        this.addr = this.read(a);
        this.addr |= this.read(a + 1) << 8;
        this.cycles += 5;
    }

    zp(): void {
        this.addr = this.read(this.PC++);
        this.cycles += 3;
    }

    zpx(): void {
        this.addr = (this.read(this.PC++) + this.X) & 0xff;
        this.cycles += 4;
    }

    zpy(): void {
        this.addr = (this.read(this.PC++) + this.Y) & 0xff;
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
        this.addr |= this.read(this.PC++) << 8;
        this.cycles += 4;
    }

    abx(): void {
        let paddr: number = this.read(this.PC++);
        paddr |= this.read(this.PC++) << 8;
        this.addr = paddr + this.X;
        if ((paddr & 0x100) != (this.addr & 0x100)) {
            this.cycles += 5;
        } else {
            this.cycles += 4;
        }
    }

    aby(): void {
        let paddr: number = this.read(this.PC++);
        paddr |= this.read(this.PC++) << 8;
        this.addr = paddr + this.Y;
        if ((paddr & 0x100) != (this.addr & 0x100)) {
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
        this.write(this.addr, this.tmp & 0xff);
        this.cycles += 2;
    }

    ////////////////////////////////////////////////////////////////////////////////

    fnz(v: number): void {
        this.Z = (v & 0xff) == 0;
        this.N = (v & 0x80) != 0;
    }

    // Borrow
    fnzb(v: number): void {
        this.Z = (v & 0xff) == 0;
        this.N = (v & 0x80) != 0;
        this.C = (v & 0x100) == 0;
    }

    // Carry
    fnzc(v: number): void {
        this.Z = (v & 0xff) == 0;
        this.N = (v & 0x80) != 0;
        this.C = (v & 0x100) != 0;
    }

    branch(taken: boolean): void {
        if (taken) {
            if ((this.addr & 0x100) != (this.PC & 0x100)) {
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
        const v: number = this.read(this.addr);
        const c: number = this.C ? 1 : 0;
        const r: number = this.A + v + c;
        if (this.D) {
            let al: number = (this.A & 0x0f) + (v & 0x0f) + c;
            if (al > 9) al += 6;
            let ah: number = (this.A >> 4) + (v >> 4) + (al > 15 ? 1 : 0);
            this.Z = (r & 0xff) == 0;
            this.N = (ah & 8) != 0;
            this.V = (~(this.A ^ v) & (this.A ^ (ah << 4)) & 0x80) != 0;
            if (ah > 9) ah += 6;
            this.C = ah > 15;
            this.A = ((ah << 4) | (al & 15)) & 0xff;
        } else {
            this.Z = (r & 0xff) == 0;
            this.N = (r & 0x80) != 0;
            this.V = (~(this.A ^ v) & (this.A ^ r) & 0x80) != 0;
            this.C = (r & 0x100) != 0;
            this.A = r & 0xff;
        }
    }

    and(): void {
        this.A &= this.read(this.addr);
        this.fnz(this.A);
    }

    asl(): void {
        this.tmp = this.read(this.addr) << 1;
        this.fnzc(this.tmp);
        this.tmp &= 0xff;
    }
    asla(): void {
        this.tmp = this.A << 1;
        this.fnzc(this.tmp);
        this.A = this.tmp & 0xff;
    }

    bit(): void {
        this.tmp = this.read(this.addr);
        this.N = (this.tmp & 0x80) != 0;
        this.V = (this.tmp & 0x40) != 0;
        this.Z = (this.tmp & this.A) == 0;
    }

    brk(): void {
        this.PC++;
        this.write(this.S + 0x100, this.PC >> 8);
        this.S = (this.S - 1) & 0xff;
        this.write(this.S + 0x100, this.PC & 0xff);
        this.S = (this.S - 1) & 0xff;
        let v: number = this.N ? 1 << 7 : 0;
        v |= this.V ? 1 << 6 : 0;
        v |= 3 << 4;
        v |= this.D ? 1 << 3 : 0;
        v |= this.I ? 1 << 2 : 0;
        v |= this.Z ? 1 << 1 : 0;
        v |= this.C ? 1 : 0;
        this.write(this.S + 0x100, v);
        this.S = (this.S - 1) & 0xff;
        this.I = true;
        this.D = false;
        this.PC = (this.read(0xffff) << 8) | this.read(0xfffe);
        this.cycles += 5;
    }

    bcc(): void {
        this.branch(!this.C);
    }
    bcs(): void {
        this.branch(this.C);
    }
    beq(): void {
        this.branch(this.Z);
    }
    bne(): void {
        this.branch(!this.Z);
    }
    bmi(): void {
        this.branch(this.N);
    }
    bpl(): void {
        this.branch(!this.N);
    }
    bvc(): void {
        this.branch(!this.V);
    }
    bvs(): void {
        this.branch(this.V);
    }

    clc(): void {
        this.C = false;
    }
    cld(): void {
        this.D = false;
    }
    cli(): void {
        this.I = false;
    }
    clv(): void {
        this.V = false;
    }

    cmp(): void {
        this.fnzb(this.A - this.read(this.addr));
    }

    cpx(): void {
        this.fnzb(this.X - this.read(this.addr));
    }

    cpy(): void {
        this.fnzb(this.Y - this.read(this.addr));
    }

    dec(): void {
        this.tmp = (this.read(this.addr) - 1) & 0xff;
        this.fnz(this.tmp);
    }

    dex(): void {
        this.X = (this.X - 1) & 0xff;
        this.fnz(this.X);
    }

    dey(): void {
        this.Y = (this.Y - 1) & 0xff;
        this.fnz(this.Y);
    }

    eor(): void {
        this.A ^= this.read(this.addr);
        this.fnz(this.A);
    }

    inc(): void {
        this.tmp = (this.read(this.addr) + 1) & 0xff;
        this.fnz(this.tmp);
    }

    inx(): void {
        this.X = (this.X + 1) & 0xff;
        this.fnz(this.X);
    }

    iny(): void {
        this.Y = (this.Y + 1) & 0xff;
        this.fnz(this.Y);
    }

    jmp(): void {
        this.PC = this.addr;
        this.cycles--;
    }

    jsr(): void {
        this.write(this.S + 0x100, (this.PC - 1) >> 8);
        this.S = (this.S - 1) & 0xff;
        this.write(this.S + 0x100, (this.PC - 1) & 0xff);
        this.S = (this.S - 1) & 0xff;
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
        this.tmp = (this.read(this.addr) << 1) | (this.C ? 1 : 0);
        this.fnzc(this.tmp);
        this.tmp &= 0xff;
    }
    rola(): void {
        this.tmp = (this.A << 1) | (this.C ? 1 : 0);
        this.fnzc(this.tmp);
        this.A = this.tmp & 0xff;
    }

    ror(): void {
        this.tmp = this.read(this.addr);
        this.tmp = ((this.tmp & 1) << 8) | ((this.C ? 1 : 0) << 7) | (this.tmp >> 1);
        this.fnzc(this.tmp);
        this.tmp &= 0xff;
    }
    rora(): void {
        this.tmp = ((this.A & 1) << 8) | ((this.C ? 1 : 0) << 7) | (this.A >> 1);
        this.fnzc(this.tmp);
        this.A = this.tmp & 0xff;
    }

    lsr(): void {
        this.tmp = this.read(this.addr);
        this.tmp = ((this.tmp & 1) << 8) | (this.tmp >> 1);
        this.fnzc(this.tmp);
        this.tmp &= 0xff;
    }
    lsra(): void {
        this.tmp = ((this.A & 1) << 8) | (this.A >> 1);
        this.fnzc(this.tmp);
        this.A = this.tmp & 0xff;
    }

    nop(): void {
        return;
    }

    pha(): void {
        this.write(this.S + 0x100, this.A);
        this.S = (this.S - 1) & 0xff;
        this.cycles++;
    }

    php(): void {
        let v: number = this.N ? 1 << 7 : 0;
        v |= this.V ? 1 << 6 : 0;
        v |= 3 << 4;
        v |= this.D ? 1 << 3 : 0;
        v |= this.I ? 1 << 2 : 0;
        v |= this.Z ? 1 << 1 : 0;
        v |= this.C ? 1 : 0;
        this.write(this.S + 0x100, v);
        this.S = (this.S - 1) & 0xff;
        this.cycles++;
    }

    pla(): void {
        this.S = (this.S + 1) & 0xff;
        this.A = this.read(this.S + 0x100);
        this.fnz(this.A);
        this.cycles += 2;
    }

    plp(): void {
        this.S = (this.S + 1) & 0xff;
        this.tmp = this.read(this.S + 0x100);
        this.N = (this.tmp & 0x80) != 0;
        this.V = (this.tmp & 0x40) != 0;
        this.D = (this.tmp & 0x08) != 0;
        this.I = (this.tmp & 0x04) != 0;
        this.Z = (this.tmp & 0x02) != 0;
        this.C = (this.tmp & 0x01) != 0;
        this.cycles += 2;
    }

    rti(): void {
        this.S = (this.S + 1) & 0xff;
        this.tmp = this.read(this.S + 0x100);
        this.N = (this.tmp & 0x80) != 0;
        this.V = (this.tmp & 0x40) != 0;
        this.D = (this.tmp & 0x08) != 0;
        this.I = (this.tmp & 0x04) != 0;
        this.Z = (this.tmp & 0x02) != 0;
        this.C = (this.tmp & 0x01) != 0;
        this.S = (this.S + 1) & 0xff;
        this.PC = this.read(this.S + 0x100);
        this.S = (this.S + 1) & 0xff;
        this.PC |= this.read(this.S + 0x100) << 8;
        this.cycles += 4;
    }

    rts(): void {
        this.S = (this.S + 1) & 0xff;
        this.PC = this.read(this.S + 0x100);
        this.S = (this.S + 1) & 0xff;
        this.PC |= this.read(this.S + 0x100) << 8;
        this.PC++;
        this.cycles += 4;
    }

    sbc(): void {
        const v: number = this.read(this.addr);
        const c: number = 1 - (this.C ? 1 : 0);
        const r: number = this.A - v - c;
        if (this.D) {
            let al: number = (this.A & 0x0f) - (v & 0x0f) - c;
            if (al < 0) al -= 6;
            let ah: number = (this.A >> 4) - (v >> 4) - (al < 0 ? 1 : 0);
            this.Z = (r & 0xff) == 0;
            this.N = (r & 0x80) != 0;
            this.V = ((this.A ^ v) & (this.A ^ r) & 0x80) != 0;
            this.C = !!((r & 0x100) != 0 ? 0 : 1);
            if (ah < 0) ah -= 6;
            this.A = ((ah << 4) | (al & 15)) & 0xff;
        } else {
            this.Z = (r & 0xff) == 0;
            this.N = (r & 0x80) != 0;
            this.V = ((this.A ^ v) & (this.A ^ r) & 0x80) != 0;
            this.C = !!((r & 0x100) != 0 ? 0 : 1);
            this.A = r & 0xff;
        }
    }

    sec(): void {
        this.C = true;
    }
    sed(): void {
        this.D = true;
    }
    sei(): void {
        this.I = true;
    }

    slo(): void {
        this.tmp = this.read(this.addr) << 1;
        this.tmp |= this.A;
        this.fnzc(this.tmp);
        this.A = this.tmp & 0xff;
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

    isc(): void {
        const v = (this.read(this.addr) + 1) & 0xff;
        const c = 1 - (this.C ? 1 : 0);
        const r = this.A - v - c;
        if (this.D) {
            let al = (this.A & 0x0f) - (v & 0x0f) - c;
            if (al > 0x80) al -= 6;
            let ah = (this.A >> 4) - (v >> 4) - (al > 0x80 ? 1 : 0);
            this.Z = (r & 0xff) == 0;
            this.N = (r & 0x80) != 0;
            this.V = ((this.A ^ v) & (this.A ^ r) & 0x80) != 0;
            this.C = !!((r & 0x100) != 0 ? 0 : 1);
            if (ah > 0x80) ah -= 6;
            this.A = ((ah << 4) | (al & 15)) & 0xff;
        } else {
            this.Z = (r & 0xff) == 0;
            this.N = (r & 0x80) != 0;
            this.V = ((this.A ^ v) & (this.A ^ r) & 0x80) != 0;
            this.C = !!((r & 0x100) != 0 ? 0 : 1);
            this.A = r & 0xff;
        }
    }

    anc(): void {
        this.tmp = this.read(this.addr);
        this.tmp |= (this.tmp & 0x80 & (this.A & 0x80)) << 1;
        this.fnzc(this.tmp);
        this.A = this.tmp & 0xff;
    }

    rla(): void {
        this.tmp = (this.A << 1) | (this.C ? 1 : 0);
        this.fnzc(this.tmp);
        this.A = this.tmp & 0xff;
    }

    sre(): void {
        const v = this.read(this.addr);
        this.tmp = ((v & 1) << 8) | (v >> 1);
        this.tmp ^= this.A;
        this.fnzc(this.tmp);
        this.A = this.tmp & 0xff;
    }

    alr(): void {
        this.tmp = this.read(this.addr) & this.A;
        this.tmp = ((this.tmp & 1) << 8) | (this.tmp >> 1);
        this.fnzc(this.tmp);
        this.A = this.tmp & 0xff;
    }

    rra(): void {
        this.tmp = ((this.A & 1) << 8) | ((this.C ? 1 : 0) << 7) | (this.A >> 1);
        this.fnzc(this.tmp);
        this.A = this.tmp & 0xff;
    }

    sax(): void {
        this.write(this.addr, this.A & this.X);
    }

    lax(): void {
        this.X = this.A = this.read(this.addr);
        this.fnz(this.A);
    }

    arr(): void {
        this.tmp = this.read(this.addr) & this.A;
        this.C = (this.tmp & 0x80) != 0;
        this.V = (((this.tmp >> 7) & 1) ^ ((this.tmp >> 6) & 1)) != 0;
        if (this.D) {
            let al = (this.tmp & 0x0f) + (this.tmp & 1);
            if (al > 5) al += 6;
            const ah = ((this.tmp >> 4) & 0x0f) + ((this.tmp >> 4) & 1);
            if (ah > 5) {
                al += 6;
                this.C = true;
            } else {
                this.C = false;
            }
            this.tmp = (ah << 4) | al;
        }
        this.fnz(this.tmp);
        this.A = this.tmp & 0xff;
    }

    shy(): void {
        this.tmp = ((this.addr >> 8) + 1) & this.Y;
        this.write(this.addr, this.tmp & 0xff);
    }

    dcp(): void {
        this.tmp = (this.read(this.addr) - 1) & 0xff;
        this.tmp = this.A - this.tmp;
        this.fnzb(this.tmp);
    }

    las(): void {
        this.S = this.X = this.A = this.read(this.addr) & this.S;
        this.fnz(this.A);
    }

    ahx(): void {
        this.tmp = ((this.addr >> 8) + 1) & this.A & this.X;
        this.write(this.addr, this.tmp & 0xff);
    }

    shx(): void {
        this.tmp = ((this.addr >> 8) + 1) & this.X;
        this.write(this.addr, this.tmp & 0xff);
    }

    // INCOMPLETE IMPLEMENTATION

    kil(): void {
        return;
    }

    tas(): void {
        return;
    }

    axs(): void {
        return;
    }

    xaa(): void {
        return;
    }
}

export default CPU6502;
