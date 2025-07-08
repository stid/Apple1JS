import type { IClockable, IInspectableComponent, InspectableData, CPU6502State, CPU6502WithDebug, DisassemblyLine, TraceEntry, IVersionedStatefulComponent, StateValidationResult, StateOptions } from './types';
import { StateError } from './types';
// formatAddress and formatByte replaced by direct use of Formatters
import type Bus from './Bus';
import { Formatters } from '../utils/formatters';

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
    // Inline rel() logic for better performance
    m.addr = m.read(m.PC++);
    if (m.addr & 0x80) {
        m.addr -= 0x100;
    }
    m.addr += m.PC;
    m.cycles += 2;
    
    // Inline BPL branch logic (branch if N flag is clear)
    if (m.N === 0) {
        m.cycles += (m.addr & 0xff00) !== (m.PC & 0xff00) ? 2 : 1;
        m.PC = m.addr;
    }
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
    // Inline rel() logic for better performance
    m.addr = m.read(m.PC++);
    if (m.addr & 0x80) {
        m.addr -= 0x100;
    }
    m.addr += m.PC;
    m.cycles += 2;
    
    // Inline BMI branch logic (branch if N flag is set)
    if (m.N !== 0) {
        m.cycles += (m.addr & 0xff00) !== (m.PC & 0xff00) ? 2 : 1;
        m.PC = m.addr;
    }
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

class CPU6502 implements IClockable, IInspectableComponent, IVersionedStatefulComponent<CPU6502State> {
    /**
     * Current state version for the CPU6502 component
     */
    private static readonly STATE_VERSION = '3.0';

    /**
     * Returns a serializable copy of the CPU state.
     */
    saveState(options?: StateOptions): CPU6502State {
        const opts = { includeDebugInfo: false, includeRuntimeState: false, ...options };
        
        const state: CPU6502State = {
            version: CPU6502.STATE_VERSION,
            PC: this.PC,
            A: this.A,
            X: this.X,
            Y: this.Y,
            S: this.S,
            N: this.N,
            Z: this.Z,
            C: this.C,
            V: this.V,
            I: this.I,
            D: this.D,
            irq: this.irq,
            nmi: this.nmi,
            cycles: this.cycles,
            opcode: this.opcode,
            address: this.address,
            data: this.data,
            pendingIrq: this.pendingIrq,
            pendingNmi: this.pendingNmi,
            cycleAccurateMode: this.cycleAccurateMode,
            currentInstructionCycles: this.currentInstructionCycles,
        };

        if (opts.includeDebugInfo) {
            Object.assign(state, {
                metadata: {
                    timestamp: Date.now(),
                    componentId: 'CPU6502',
                    instructionCount: this.instructionCount,
                    enableProfiling: this.enableProfiling
                }
            });
        }

        if (opts.includeRuntimeState) {
            // Include runtime state like execution hooks if needed
            Object.assign(state, {
                metadata: {
                    ...state.metadata,
                    hasExecutionHook: this.executionHook !== undefined
                }
            });
        }

        return state;
    }

    /**
     * Restores CPU state from a previously saved state.
     */
    loadState(state: CPU6502State, options?: StateOptions): void {
        const opts = { validate: true, migrate: true, ...options };
        
        if (opts.validate) {
            const validation = this.validateState(state);
            if (!validation.valid) {
                throw new StateError(
                    `Invalid CPU state: ${validation.errors.join(', ')}`, 
                    'CPU6502', 
                    'load'
                );
            }
        }

        // Handle version migration if needed
        let finalState = state;
        if (opts.migrate && state.version && state.version !== CPU6502.STATE_VERSION) {
            finalState = this.migrateState(state, state.version);
        }

        this.PC = finalState.PC;
        this.A = finalState.A;
        this.X = finalState.X;
        this.Y = finalState.Y;
        this.S = finalState.S;
        // Convert boolean to number for backward compatibility
        this.N = typeof finalState.N === 'boolean' ? (finalState.N ? 1 : 0) : finalState.N;
        this.Z = typeof finalState.Z === 'boolean' ? (finalState.Z ? 1 : 0) : finalState.Z;
        this.C = typeof finalState.C === 'boolean' ? (finalState.C ? 1 : 0) : finalState.C;
        this.V = typeof finalState.V === 'boolean' ? (finalState.V ? 1 : 0) : finalState.V;
        this.I = typeof finalState.I === 'boolean' ? (finalState.I ? 1 : 0) : finalState.I;
        this.D = typeof finalState.D === 'boolean' ? (finalState.D ? 1 : 0) : finalState.D;
        this.irq = typeof finalState.irq === 'boolean' ? (finalState.irq ? 1 : 0) : finalState.irq;
        this.nmi = typeof finalState.nmi === 'boolean' ? (finalState.nmi ? 1 : 0) : finalState.nmi;
        this.cycles = finalState.cycles;
        this.opcode = finalState.opcode;
        this.address = finalState.address;
        this.data = finalState.data;
        // Load interrupt state with backward compatibility
        this.pendingIrq = typeof finalState.pendingIrq === 'boolean' ? (finalState.pendingIrq ? 1 : 0) : finalState.pendingIrq;
        this.pendingNmi = typeof finalState.pendingNmi === 'boolean' ? (finalState.pendingNmi ? 1 : 0) : finalState.pendingNmi;
        // Load cycle-accurate timing state (optional, for backward compatibility)
        this.cycleAccurateMode = finalState.cycleAccurateMode ?? true;
        this.currentInstructionCycles = finalState.currentInstructionCycles ?? 0;

        // Note: markStateClean is optional from state dirty tracking mixin
    }

    getInspectable(): InspectableData {
        const self = this as CPU6502WithDebug<typeof this>;
        
        // Stack dump (top 8 bytes)
        let stack: Array<{ addr: string; value: number }> | undefined = undefined;
        if (typeof this.S === 'number' && this.bus && typeof this.bus.read === 'function') {
            stack = [];
            for (let i = 0; i < 8; ++i) {
                const addr = 0x0100 + ((this.S - i) & 0xff);
                stack.push({ 
                    addr: Formatters.hexWord(addr), 
                    value: this.bus.read(addr) 
                });
            }
        }
        
        // Disassemble current and next instruction (if possible)
        let disasm: DisassemblyLine[] | undefined = undefined;
        if (typeof self.disassemble === 'function') {
            try {
                disasm = self.disassemble(this.PC, 3);
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
            id: this.id,
            type: this.type,
            name: this.name ?? '',
            state: {
                PC: Formatters.hexWord(this.PC),
                A: Formatters.hexByte(this.A),
                X: Formatters.hexByte(this.X),
                Y: Formatters.hexByte(this.Y),
                S: Formatters.hexByte(this.S),
                // Flags (combined into P register display)
                P: Formatters.hexByte(
                    (this.N ? 0x80 : 0) |
                    (this.V ? 0x40 : 0) |
                    0x20 | // unused, always 1
                    0x10 | // B flag always set except on stack
                    (this.D ? 0x08 : 0) |
                    (this.I ? 0x04 : 0) |
                    (this.Z ? 0x02 : 0) |
                    (this.C ? 0x01 : 0)
                ),
                // Individual flags
                N: this.N,
                V: this.V,
                D: this.D,
                I: this.I,
                Z: this.Z,
                C: this.C,
                // Performance
                cycles: this.cycles,
                profiling: this.enableProfiling
            },
            debug: {
                ...(stack !== undefined && { stack }),
                ...(disasm !== undefined && { disasm }),
                ...(trace !== undefined && { trace })
            },
            children: []
        };
        
        if (this.enableProfiling) {
            data.stats = {
                instructions: this.instructionCount,
                uniqueOpcodes: this.profileData.size,
                cycleAccurate: this.cycleAccurateMode ? 'Enabled' : 'Disabled'
            };
        }
        
        return data;
    }
    id = 'cpu6502';
    type = 'CPU6502';
    name?: string;
    get children() {
        return [];
    }
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

    // Interrupt state
    private pendingIrq: number = 0;
    private pendingNmi: number = 0;
    
    // Cached values for performance
    private readonly stackBase: number = 0x100;
    
    // Performance monitoring (optional)
    private instructionCount: number = 0;
    private profileData: Map<number, { count: number; cycles: number }> = new Map();
    private enableProfiling: boolean = false;
    
    // Execution hook for debugging (breakpoints, etc)
    private executionHook: ((pc: number) => boolean) | undefined;
    
    // Cycle-accurate timing mode for debugging
    private cycleAccurateMode: boolean = false; // Disabled by default to prevent memory leaks
    private busAccesses: Array<{ address: number; type: 'read' | 'write'; value?: number }> = [];
    private currentInstructionCycles: number = 0;
    private static readonly MAX_BUS_ACCESS_HISTORY = 1000; // Limit history to prevent memory leaks

    constructor(bus: Bus) {
        this.bus = bus;

        this.PC = 0; // Program counter
        this.A = 0;
        this.X = 0;
        this.Y = 0;
        this.S = 0; // Registers
        this.N = 0;
        this.Z = 0;
        this.C = 0;
        this.V = 0; // ALU flags
        this.I = 1; // Interrupts disabled after power-on
        this.D = 0; // Other flags

        this.data = 0;
        this.address = 0;

        this.irq = 0;
        this.nmi = 0; // IRQ lines

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
        this.N = 0;
        this.Z = 1;
        this.C = 0;
        this.V = 0;
        this.I = 1; // Interrupts disabled after reset
        this.D = 0;

        this.data = 0;
        this.address = 0;
        
        // Clear interrupt state
        this.irq = 0;
        this.nmi = 0;
        this.pendingIrq = 0;
        this.pendingNmi = 0;

        this.PC = (this.read(0xfffd) << 8) | this.read(0xfffc);
        // Note: markStateClean is optional from state dirty tracking mixin
    }

    /**
     * Validate a CPU state object
     */
    validateState(state: unknown): StateValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!state || typeof state !== 'object') {
            errors.push('State must be an object');
            return { valid: false, errors, warnings };
        }

        const s = state as Record<string, unknown>;

        // Required numeric fields
        const requiredNumbers = ['PC', 'A', 'X', 'Y', 'S', 'cycles', 'opcode', 'address', 'data'];
        for (const field of requiredNumbers) {
            if (typeof s[field] !== 'number') {
                errors.push(`${field} must be a number`);
            } else {
                const value = s[field] as number;
                if (field === 'PC' && (value < 0 || value > 0xFFFF)) {
                    errors.push('PC must be between 0 and 0xFFFF');
                } else if (['A', 'X', 'Y', 'S', 'opcode', 'data'].includes(field) && (value < 0 || value > 0xFF)) {
                    errors.push(`${field} must be between 0 and 0xFF`);
                }
            }
        }

        // Flag fields (can be boolean or number)
        const flags = ['N', 'Z', 'C', 'V', 'I', 'D', 'irq', 'nmi', 'pendingIrq', 'pendingNmi'];
        for (const flag of flags) {
            if (s[flag] !== undefined && typeof s[flag] !== 'number' && typeof s[flag] !== 'boolean') {
                errors.push(`${flag} must be a number or boolean`);
            }
        }

        // Optional boolean fields
        if (s.cycleAccurateMode !== undefined && typeof s.cycleAccurateMode !== 'boolean') {
            errors.push('cycleAccurateMode must be a boolean');
        }

        // Version checking
        if (s.version && typeof s.version !== 'string') {
            warnings.push('version should be a string');
        }

        return { valid: errors.length === 0, errors, warnings };
    }

    /**
     * Reset to initial state (alias for reset for interface compliance)
     */
    resetState(): void {
        this.reset();
    }

    /**
     * Get the current state version
     */
    getStateVersion(): string {
        return CPU6502.STATE_VERSION;
    }

    /**
     * Migrate state from older versions
     */
    migrateState(oldState: unknown, fromVersion: string): CPU6502State {
        let migratedState = { ...(oldState as Record<string, unknown>) };

        // Migration from version 1.0 or 2.0 to 3.0
        if (fromVersion === '1.0' || fromVersion === '2.0') {
            // Add new fields with defaults
            migratedState.cycleAccurateMode = migratedState.cycleAccurateMode ?? true;
            migratedState.currentInstructionCycles = migratedState.currentInstructionCycles ?? 0;
            migratedState.version = CPU6502.STATE_VERSION;
        }

        // Convert boolean flags to numbers if needed (legacy format)
        const flags = ['N', 'Z', 'C', 'V', 'I', 'D', 'irq', 'nmi', 'pendingIrq', 'pendingNmi'];
        for (const flag of flags) {
            if (typeof migratedState[flag] === 'boolean') {
                migratedState[flag] = migratedState[flag] ? 1 : 0;
            }
        }

        return migratedState as unknown as CPU6502State;
    }

    /**
     * Get supported state versions for migration
     */
    getSupportedVersions(): string[] {
        return ['1.0', '2.0', '3.0'];
    }

    performSingleStep(): number {
        const startCycles = this.cycles;
        
        // Initialize cycle-accurate timing if enabled
        if (this.cycleAccurateMode) {
            this.busAccesses = [];
            this.currentInstructionCycles = 0;
        }
        
        // Check execution hook (for breakpoints, etc)
        if (this.executionHook && !this.executionHook(this.PC)) {
            // Hook returned false - halt execution without advancing
            return 0;
        }
        
        // Check for interrupts before executing next instruction
        this.checkInterrupts();
        
        this.opcode = this.read(this.PC++);
        
        // Optional performance profiling
        if (this.enableProfiling) {
            this.instructionCount++;
            const existing = this.profileData.get(this.opcode);
            if (existing) {
                existing.count++;
            } else {
                this.profileData.set(this.opcode, { count: 1, cycles: 0 });
            }
        }
        
        CPU6502op[this.opcode](this);
        
        // Update cycle-accurate timing
        if (this.cycleAccurateMode) {
            this.currentInstructionCycles = this.cycles - startCycles;
        }
        
        // Update cycle profiling
        if (this.enableProfiling) {
            const cyclesUsed = this.cycles - startCycles;
            const profile = this.profileData.get(this.opcode)!;
            profile.cycles += cyclesUsed;
        }
        
        return this.cycles - startCycles;
    }

    performBulkSteps(steps: number): void {
        let currentCycleCount = 0;
        while (currentCycleCount <= steps) {
            const cyclesExecuted = this.performSingleStep();
            // If no cycles were executed (execution hook returned false), stop
            if (cyclesExecuted === 0) {
                break;
            }
            currentCycleCount += cyclesExecuted;
        }
    }

    read(address: number): number {
        this.address = address;
        this.data = this.bus.read(address);
        
        // Track bus access for cycle-accurate timing
        if (this.cycleAccurateMode) {
            this.busAccesses.push({ address, type: 'read', value: this.data });
            // Limit array size to prevent memory leaks
            if (this.busAccesses.length > CPU6502.MAX_BUS_ACCESS_HISTORY) {
                this.busAccesses.shift(); // Remove oldest entry
            }
        }
        
        return this.data;
    }

    write(address: number, value: number): void {
        this.address = address;
        this.data = value;
        this.bus.write(address, value);
        
        // Track bus access for cycle-accurate timing
        if (this.cycleAccurateMode) {
            this.busAccesses.push({ address, type: 'write', value });
            // Limit array size to prevent memory leaks
            if (this.busAccesses.length > CPU6502.MAX_BUS_ACCESS_HISTORY) {
                this.busAccesses.shift(); // Remove oldest entry
            }
        }
    }

    getCompletedCycles(): number {
        return this.cycles;
    }


    /**
     * Enable or disable instruction profiling
     */
    setProfilingEnabled(enabled: boolean): void {
        this.enableProfiling = enabled;
        if (!enabled) {
            this.profileData.clear();
            this.instructionCount = 0;
        }
    }
    
    /**
     * Clear profiling data without disabling profiling
     */
    clearProfilingData(): void {
        this.profileData.clear();
        this.instructionCount = 0;
    }
    
    /**
     * Get performance profiling data
     */
    getProfilingData(): { [opcode: string]: { count: number; cycles: number; avgCycles: number } } {
        const result: { [opcode: string]: { count: number; cycles: number; avgCycles: number } } = {};
        
        for (const [opcode, data] of this.profileData) {
            const opcodeHex = Formatters.hexByte(opcode);
            result[opcodeHex] = {
                count: data.count,
                cycles: data.cycles,
                avgCycles: data.count > 0 ? Math.round(data.cycles / data.count * 100) / 100 : 0
            };
        }
        
        return result;
    }
    
    /**
     * Get summary performance statistics
     */
    getPerformanceStats(): { instructionCount: number; totalInstructions: number; profilingEnabled: boolean } {
        return {
            instructionCount: this.instructionCount,
            totalInstructions: this.profileData.size,
            profilingEnabled: this.enableProfiling
        };
    }
    
    /**
     * Enable or disable cycle-accurate timing mode for debugging
     */
    setCycleAccurateMode(enabled: boolean): void {
        this.cycleAccurateMode = enabled;
        if (!enabled) {
            this.busAccesses = [];
        }
    }
    
    /**
     * Get cycle-accurate timing mode status
     */
    getCycleAccurateMode(): boolean {
        return this.cycleAccurateMode;
    }
    
    /**
     * Get detailed bus access history for current instruction (when cycle-accurate mode is enabled)
     */
    getBusAccessHistory(): Array<{ address: number; type: 'read' | 'write'; value?: number }> {
        return [...this.busAccesses];
    }
    
    /**
     * Set execution hook for debugging (e.g., breakpoints)
     * The hook is called before each instruction fetch with the current PC.
     * Return false to halt execution, true to continue.
     */
    setExecutionHook(hook?: (pc: number) => boolean): void {
        this.executionHook = hook ?? undefined;
    }
    
    /**
     * Get current instruction cycle count (when cycle-accurate mode is enabled)
     */
    getCurrentInstructionCycles(): number {
        return this.currentInstructionCycles;
    }

    toDebug(): { [key: string]: string | number | boolean | object } {
        // Enhanced live state capture with hex formatting - no duplicates
        const debugData: { [key: string]: string | number | boolean | object } = { 
            // Registers as hex values for inspector
            REG_PC: Formatters.hexWord(this.PC),
            REG_A: Formatters.hexByte(this.A),
            REG_X: Formatters.hexByte(this.X),
            REG_Y: Formatters.hexByte(this.Y),
            REG_S: Formatters.hexByte(this.S),
            // Processor flags as clear indicators
            FLAG_N: Formatters.flag(this.N),
            FLAG_Z: Formatters.flag(this.Z),
            FLAG_C: Formatters.flag(this.C),
            FLAG_V: Formatters.flag(this.V),
            FLAG_I: Formatters.flag(this.I),
            FLAG_D: Formatters.flag(this.D),
            // Hardware state in hex
            HW_ADDR: Formatters.hexWord(this.address),
            HW_DATA: Formatters.hexByte(this.data),
            HW_OPCODE: Formatters.hexByte(this.opcode),
            HW_CYCLES: Formatters.decimal(this.cycles),
            // Interrupt state as clear indicators
            IRQ_LINE: this.irq ? 'ACTIVE' : 'INACTIVE',
            NMI_LINE: this.nmi ? 'ACTIVE' : 'INACTIVE',
            IRQ_PENDING: this.pendingIrq ? 'YES' : 'NO',
            NMI_PENDING: this.pendingNmi ? 'YES' : 'NO',
            // Instruction execution state in hex
            EXEC_TMP: Formatters.hexByte(this.tmp),
            EXEC_ADDR: Formatters.hexWord(this.addr)
        };

        // Add performance profiling data if enabled
        if (this.enableProfiling) {
            const stats = this.getPerformanceStats();
            const profileData = this.getProfilingData();
            
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
        debugData.PC = this.PC;
        debugData.A = this.A;
        debugData.X = this.X;
        debugData.Y = this.Y;
        debugData.S = this.S;

        return debugData;
    }

    ////////////////////////////////////////////////////////////////////////////////
    // Subroutines - addressing modes & flags
    ////////////////////////////////////////////////////////////////////////////////

    // Unified flag setting helpers for consistency
    private setNZFlags(value: number): void {
        this.Z = (value & 0xff) === 0 ? 1 : 0;
        this.N = (value & 0x80) !== 0 ? 1 : 0;
    }

    private setNZCFlags(value: number): void {
        this.Z = (value & 0xff) === 0 ? 1 : 0;
        this.N = (value & 0x80) !== 0 ? 1 : 0;
        this.C = (value & 0x100) !== 0 ? 1 : 0;
    }

    // Addressing modes - all cycle counting consolidated here
    izx(): void {
        const a: number = (this.read(this.PC++) + this.X) & 0xff;
        this.addr = (this.read(a + 1) << 8) | this.read(a);
        this.cycles += 6;
    }

    izy(): void {
        const a: number = this.read(this.PC++);
        const paddr: number = (this.read((a + 1) & 0xff) << 8) | this.read(a);
        this.addr = paddr + this.Y;
        if ((paddr & 0xff00) !== (this.addr & 0xff00)) {
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
        this.cycles += 6;
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
        if ((paddr & 0xff00) !== (this.addr & 0xff00)) {
            this.cycles += 5;
        } else {
            this.cycles += 4;
        }
    }

    aby(): void {
        let paddr: number = this.read(this.PC++);
        paddr |= this.read(this.PC++) << 8;
        this.addr = paddr + this.Y;
        if ((paddr & 0xff00) !== (this.addr & 0xff00)) {
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

    ////////////////////////////////////////////////////////////////////////////////

    // Inline flag operations for performance - these methods are now unused
    // All flag setting is done inline in instruction implementations



    branch(taken: boolean): void {
        if (taken) {
            this.cycles += (this.addr & 0xff00) !== (this.PC & 0xff00) ? 2 : 1;
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

    and(): void {
        this.A &= this.read(this.addr);
        this.setNZFlags(this.A);
    }

    asl(): void {
        this.tmp = this.read(this.addr) << 1;
        this.setNZCFlags(this.tmp);
        this.tmp &= 0xff;
    }
    asla(): void {
        this.tmp = this.A << 1;
        this.setNZCFlags(this.tmp);
        this.A = this.tmp & 0xff;
    }

    bit(): void {
        this.tmp = this.read(this.addr);
        // Optimized flag setting using bit operations
        this.N = (this.tmp >> 7) & 1;        // Extract bit 7 directly
        this.V = (this.tmp >> 6) & 1;        // Extract bit 6 directly
        this.Z = (this.tmp & this.A) === 0 ? 1 : 0;  // Z flag logic unchanged
    }

    brk(): void {
        this.PC++;
        this.write(this.stackBase + this.S, this.PC >> 8);
        this.S = (this.S - 1) & 0xff;
        this.write(this.stackBase + this.S, this.PC & 0xff);
        this.S = (this.S - 1) & 0xff;
        let v: number = this.N ? 1 << 7 : 0;
        v |= this.V ? 1 << 6 : 0;
        v |= 3 << 4;
        v |= this.D ? 1 << 3 : 0;
        v |= this.I ? 1 << 2 : 0;
        v |= this.Z ? 1 << 1 : 0;
        v |= this.C ? 1 : 0;
        this.write(this.stackBase + this.S, v);
        this.S = (this.S - 1) & 0xff;
        this.I = 1;
        this.D = 0;
        this.PC = (this.read(0xffff) << 8) | this.read(0xfffe);
        this.cycles += 5;
    }

    bcc(): void {
        this.branch(this.C === 0);
    }
    bcs(): void {
        this.branch(this.C !== 0);
    }
    beq(): void {
        this.branch(this.Z !== 0);
    }
    bne(): void {
        this.branch(this.Z === 0);
    }
    bmi(): void {
        this.branch(this.N !== 0);
    }
    bpl(): void {
        this.branch(this.N === 0);
    }
    bvc(): void {
        this.branch(this.V === 0);
    }
    bvs(): void {
        this.branch(this.V !== 0);
    }

    clc(): void {
        this.C = 0;
    }
    cld(): void {
        this.D = 0;
    }
    cli(): void {
        this.I = 0;
        this.updateIrqPending();
    }
    clv(): void {
        this.V = 0;
    }

    cmp(): void {
        const result = this.A - this.read(this.addr);
        this.setNZFlags(result);
        this.C = (result & 0x100) === 0 ? 1 : 0;
    }

    cpx(): void {
        const result = this.X - this.read(this.addr);
        this.setNZFlags(result);
        this.C = (result & 0x100) === 0 ? 1 : 0;
    }

    cpy(): void {
        const result = this.Y - this.read(this.addr);
        this.setNZFlags(result);
        this.C = (result & 0x100) === 0 ? 1 : 0;
    }

    dec(): void {
        this.tmp = (this.read(this.addr) - 1) & 0xff;
        this.setNZFlags(this.tmp);
    }

    dex(): void {
        this.X = (this.X - 1) & 0xff;
        this.setNZFlags(this.X);
    }

    dey(): void {
        this.Y = (this.Y - 1) & 0xff;
        this.setNZFlags(this.Y);
    }

    eor(): void {
        this.A ^= this.read(this.addr);
        this.setNZFlags(this.A);
    }

    inc(): void {
        this.tmp = (this.read(this.addr) + 1) & 0xff;
        this.setNZFlags(this.tmp);
    }

    inx(): void {
        this.X = (this.X + 1) & 0xff;
        this.setNZFlags(this.X);
    }

    iny(): void {
        this.Y = (this.Y + 1) & 0xff;
        this.setNZFlags(this.Y);
    }

    jmp(): void {
        this.PC = this.addr;
        this.cycles--;
    }

    jsr(): void {
        this.write(this.stackBase + this.S, (this.PC - 1) >> 8);
        this.S = (this.S - 1) & 0xff;
        this.write(this.stackBase + this.S, (this.PC - 1) & 0xff);
        this.S = (this.S - 1) & 0xff;
        this.PC = this.addr;
        this.cycles += 2;
    }

    lda(): void {
        this.A = this.read(this.addr);
        this.setNZFlags(this.A);
    }

    ldx(): void {
        this.X = this.read(this.addr);
        this.setNZFlags(this.X);
    }

    ldy(): void {
        this.Y = this.read(this.addr);
        this.setNZFlags(this.Y);
    }

    ora(): void {
        this.A |= this.read(this.addr);
        this.setNZFlags(this.A);
    }

    rol(): void {
        this.tmp = (this.read(this.addr) << 1) | (this.C ? 1 : 0);
        this.setNZCFlags(this.tmp);
        this.tmp &= 0xff;
    }
    rola(): void {
        this.tmp = (this.A << 1) | (this.C ? 1 : 0);
        this.setNZCFlags(this.tmp);
        this.A = this.tmp & 0xff;
    }

    ror(): void {
        this.tmp = this.read(this.addr);
        this.tmp = ((this.tmp & 1) << 8) | ((this.C ? 1 : 0) << 7) | (this.tmp >> 1);
        this.setNZCFlags(this.tmp);
        this.tmp &= 0xff;
    }
    rora(): void {
        this.tmp = ((this.A & 1) << 8) | ((this.C ? 1 : 0) << 7) | (this.A >> 1);
        this.setNZCFlags(this.tmp);
        this.A = this.tmp & 0xff;
    }

    lsr(): void {
        this.tmp = this.read(this.addr);
        this.tmp = ((this.tmp & 1) << 8) | (this.tmp >> 1);
        this.setNZCFlags(this.tmp);
        this.tmp &= 0xff;
    }
    lsra(): void {
        this.tmp = ((this.A & 1) << 8) | (this.A >> 1);
        this.setNZCFlags(this.tmp);
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
        this.write(this.stackBase + this.S, v);
        this.S = (this.S - 1) & 0xff;
        this.cycles++;
    }

    pla(): void {
        this.S = (this.S + 1) & 0xff;
        this.A = this.read(this.stackBase + this.S);
        this.setNZFlags(this.A);
        this.cycles += 2;
    }

    plp(): void {
        this.S = (this.S + 1) & 0xff;
        this.tmp = this.read(this.stackBase + this.S);
        this.N = (this.tmp & 0x80) !== 0 ? 1 : 0;
        this.V = (this.tmp & 0x40) !== 0 ? 1 : 0;
        this.D = (this.tmp & 0x08) !== 0 ? 1 : 0;
        this.I = (this.tmp & 0x04) !== 0 ? 1 : 0;
        this.Z = (this.tmp & 0x02) !== 0 ? 1 : 0;
        this.C = (this.tmp & 0x01) !== 0 ? 1 : 0;
        this.cycles += 2;
    }

    rti(): void {
        this.S = (this.S + 1) & 0xff;
        this.tmp = this.read(this.stackBase + this.S);
        this.N = (this.tmp & 0x80) !== 0 ? 1 : 0;
        this.V = (this.tmp & 0x40) !== 0 ? 1 : 0;
        this.D = (this.tmp & 0x08) !== 0 ? 1 : 0;
        this.I = (this.tmp & 0x04) !== 0 ? 1 : 0;
        this.Z = (this.tmp & 0x02) !== 0 ? 1 : 0;
        this.C = (this.tmp & 0x01) !== 0 ? 1 : 0;
        this.S = (this.S + 1) & 0xff;
        this.PC = this.read(this.stackBase + this.S);
        this.S = (this.S + 1) & 0xff;
        this.PC |= this.read(this.stackBase + this.S) << 8;
        this.cycles += 4;
    }

    rts(): void {
        this.S = (this.S + 1) & 0xff;
        this.PC = this.read(this.stackBase + this.S);
        this.S = (this.S + 1) & 0xff;
        this.PC |= this.read(this.stackBase + this.S) << 8;
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

    sec(): void {
        this.C = 1;
    }
    sed(): void {
        this.D = 1;
    }
    sei(): void {
        this.I = 1;
        this.updateIrqPending();
    }

    slo(): void {
        this.tmp = this.read(this.addr) << 1;
        this.tmp |= this.A;
        this.setNZCFlags(this.tmp);
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
        this.setNZFlags(this.X);
    }

    tay(): void {
        this.Y = this.A;
        this.setNZFlags(this.Y);
    }

    tsx(): void {
        this.X = this.S;
        this.setNZFlags(this.X);
    }

    txa(): void {
        this.A = this.X;
        this.setNZFlags(this.A);
    }

    txs(): void {
        this.S = this.X;
    }

    tya(): void {
        this.A = this.Y;
        this.setNZFlags(this.A);
    }
    
    ////////////////////////////////////////////////////////////////////////////////
    // Interrupt handling
    ////////////////////////////////////////////////////////////////////////////////
    
    /**
     * Updates IRQ pending state based on current IRQ line and I flag
     */
    private updateIrqPending(): void {
        this.pendingIrq = this.irq && (this.I === 0) ? 1 : 0;
    }
    
    /**
     * Sets the IRQ line state
     */
    setIrq(state: boolean): void {
        this.irq = state ? 1 : 0;
        this.updateIrqPending();
    }
    
    /**
     * Sets the NMI line state  
     */
    setNmi(state: boolean): void {
        // NMI is edge-triggered (triggers on falling edge)
        const previousNmi = this.nmi;
        this.nmi = state ? 1 : 0;
        if (previousNmi && !state) {
            this.pendingNmi = 1;
        }
    }
    
    /**
     * Checks for pending interrupts and handles them
     */
    private checkInterrupts(): void {
        // NMI has higher priority than IRQ
        if (this.pendingNmi) {
            this.handleNmi();
            this.pendingNmi = 0;
        } else if (this.pendingIrq && this.I === 0) {
            this.handleIrq();
            this.pendingIrq = 0;
        }
        
        // Update IRQ pending state based on current IRQ line and I flag
        this.updateIrqPending();
    }
    
    /**
     * Handles IRQ interrupt
     */
    private handleIrq(): void {
        // Push PC to stack (high byte first)
        this.write(this.stackBase + this.S, this.PC >> 8);
        this.S = (this.S - 1) & 0xff;
        this.write(this.stackBase + this.S, this.PC & 0xff);
        this.S = (this.S - 1) & 0xff;
        
        // Push status register to stack (with B flag clear)
        let status = 0;
        status |= this.N ? 0x80 : 0;
        status |= this.V ? 0x40 : 0;
        status |= 0x20; // Unused bit always set
        // B flag is clear (0x00) for IRQ
        status |= this.D ? 0x08 : 0;
        status |= this.I ? 0x04 : 0;
        status |= this.Z ? 0x02 : 0;
        status |= this.C ? 0x01 : 0;
        this.write(this.S + 0x100, status);
        this.S = (this.S - 1) & 0xff;
        
        // Set interrupt disable flag
        this.I = 1;
        
        // Jump to IRQ vector at $FFFE/$FFFF
        this.PC = (this.read(0xffff) << 8) | this.read(0xfffe);
        
        // IRQ takes 7 cycles
        this.cycles += 7;
    }
    
    /**
     * Handles NMI interrupt
     */
    private handleNmi(): void {
        // Push PC to stack (high byte first)
        this.write(this.stackBase + this.S, this.PC >> 8);
        this.S = (this.S - 1) & 0xff;
        this.write(this.stackBase + this.S, this.PC & 0xff);
        this.S = (this.S - 1) & 0xff;
        
        // Push status register to stack (with B flag clear)
        let status = 0;
        status |= this.N ? 0x80 : 0;
        status |= this.V ? 0x40 : 0;
        status |= 0x20; // Unused bit always set
        // B flag is clear (0x00) for NMI
        status |= this.D ? 0x08 : 0;
        status |= this.I ? 0x04 : 0;
        status |= this.Z ? 0x02 : 0;
        status |= this.C ? 0x01 : 0;
        this.write(this.S + 0x100, status);
        this.S = (this.S - 1) & 0xff;
        
        // Set interrupt disable flag
        this.I = 1;
        
        // Jump to NMI vector at $FFFA/$FFFB
        this.PC = (this.read(0xfffb) << 8) | this.read(0xfffa);
        
        // NMI takes 7 cycles
        this.cycles += 7;
    }

    isc(): void {
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

    anc(): void {
        this.tmp = this.read(this.addr);
        this.tmp |= (this.tmp & 0x80 & (this.A & 0x80)) << 1;
        this.Z = (this.tmp & 0xff) === 0 ? 1 : 0;
        this.N = (this.tmp & 0x80) !== 0 ? 1 : 0;
        this.C = (this.tmp & 0x100) !== 0 ? 1 : 0;
        this.A = this.tmp & 0xff;
    }

    rla(): void {
        this.tmp = (this.A << 1) | (this.C ? 1 : 0);
        this.setNZCFlags(this.tmp);
        this.A = this.tmp & 0xff;
    }

    sre(): void {
        const v = this.read(this.addr);
        this.tmp = ((v & 1) << 8) | (v >> 1);
        this.tmp ^= this.A;
        this.setNZCFlags(this.tmp);
        this.A = this.tmp & 0xff;
    }

    alr(): void {
        this.tmp = this.read(this.addr) & this.A;
        this.tmp = ((this.tmp & 1) << 8) | (this.tmp >> 1);
        this.setNZCFlags(this.tmp);
        this.A = this.tmp & 0xff;
    }

    rra(): void {
        this.tmp = ((this.A & 1) << 8) | ((this.C ? 1 : 0) << 7) | (this.A >> 1);
        this.setNZCFlags(this.tmp);
        this.A = this.tmp & 0xff;
    }

    sax(): void {
        this.write(this.addr, this.A & this.X);
    }

    lax(): void {
        this.X = this.A = this.read(this.addr);
        this.setNZFlags(this.A);
    }

    arr(): void {
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
        this.setNZFlags(this.tmp);
        this.A = this.tmp & 0xff;
    }

    shy(): void {
        this.tmp = ((this.addr >> 8) + 1) & this.Y;
        this.write(this.addr, this.tmp & 0xff);
    }

    dcp(): void {
        this.tmp = (this.read(this.addr) - 1) & 0xff;
        this.tmp = this.A - this.tmp;
        this.setNZFlags(this.tmp);
        this.C = (this.tmp & 0x100) === 0 ? 1 : 0;
    }

    las(): void {
        this.S = this.X = this.A = this.read(this.addr) & this.S;
        this.setNZFlags(this.A);
    }

    ahx(): void {
        this.tmp = ((this.addr >> 8) + 1) & this.A & this.X;
        this.write(this.addr, this.tmp & 0xff);
    }

    shx(): void {
        this.tmp = ((this.addr >> 8) + 1) & this.X;
        this.write(this.addr, this.tmp & 0xff);
    }

    // Previously incomplete illegal opcodes - now implemented

    kil(): void {
        // KIL/JAM/HLT - Halts the CPU by jamming the program counter
        // This effectively freezes execution at the current PC
        this.PC--;
        // Note: In real hardware this would require a reset, but for emulation
        // we simply prevent PC advancement to simulate the jam state
    }

    tas(): void {
        // TAS (Transfer A AND X to Stack pointer, Store A AND X AND (H+1))
        // S = A & X; Store A & X & (high_byte_of_address + 1) to memory
        this.S = this.A & this.X;
        this.tmp = this.A & this.X & ((this.addr >> 8) + 1);
        this.write(this.addr, this.tmp & 0xff);
    }

    axs(): void {
        // AXS/SBX (A AND X minus immediate, store in X)
        // X = (A & X) - immediate, set flags
        const v = this.read(this.addr);
        this.tmp = (this.A & this.X) - v;
        this.X = this.tmp & 0xff;
        this.setNZFlags(this.tmp);
        this.C = (this.tmp & 0x100) === 0 ? 1 : 0;
    }

    xaa(): void {
        // XAA/ANE (Transfer X to A, then AND with immediate)
        // A = X & immediate
        // Note: This opcode is highly unstable on real hardware and behavior
        // varies between different 6502 variants. This is a simplified implementation.
        this.A = this.X & this.read(this.addr);
        this.setNZFlags(this.A);
    }
}

export default CPU6502;
