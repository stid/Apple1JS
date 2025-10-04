/*!
 * 6502 Opcode dispatch table
 * 
 * Maps opcodes to their instruction implementations
 */

use crate::CPU6502;

/// Opcode definitions
pub mod opcodes {
    // System
    pub const BRK: u8 = 0x00;
    pub const NOP: u8 = 0xEA;
    
    // Load operations
    pub const LDA_IMM: u8 = 0xA9;
    pub const LDA_ZP: u8 = 0xA5;
    pub const LDA_ZPX: u8 = 0xB5;
    pub const LDA_ABS: u8 = 0xAD;
    pub const LDA_ABSX: u8 = 0xBD;
    pub const LDA_ABSY: u8 = 0xB9;
    pub const LDA_IZX: u8 = 0xA1;
    pub const LDA_IZY: u8 = 0xB1;
    pub const LDX_IMM: u8 = 0xA2;
    pub const LDX_ZP: u8 = 0xA6;
    pub const LDX_ZPY: u8 = 0xB6;
    pub const LDX_ABS: u8 = 0xAE;
    pub const LDX_ABSY: u8 = 0xBE;
    pub const LDY_IMM: u8 = 0xA0;
    pub const LDY_ZP: u8 = 0xA4;
    pub const LDY_ZPX: u8 = 0xB4;
    pub const LDY_ABS: u8 = 0xAC;
    pub const LDY_ABSX: u8 = 0xBC;
    
    // Store operations  
    pub const STA_ZP: u8 = 0x85;
    pub const STA_ZPX: u8 = 0x95;
    pub const STA_ABS: u8 = 0x8D;
    pub const STA_ABSX: u8 = 0x9D;
    pub const STA_ABSY: u8 = 0x99;
    pub const STA_IZX: u8 = 0x81;
    pub const STA_IZY: u8 = 0x91;
    pub const STX_ZP: u8 = 0x86;
    pub const STX_ZPY: u8 = 0x96;
    pub const STX_ABS: u8 = 0x8E;
    pub const STY_ZP: u8 = 0x84;
    pub const STY_ZPX: u8 = 0x94;
    pub const STY_ABS: u8 = 0x8C;
    
    // Transfer operations
    pub const TAX: u8 = 0xAA;
    pub const TAY: u8 = 0xA8;
    pub const TXA: u8 = 0x8A;
    pub const TYA: u8 = 0x98;
    pub const TSX: u8 = 0xBA;
    pub const TXS: u8 = 0x9A;
    
    // Stack operations
    pub const PHA: u8 = 0x48;
    pub const PLA: u8 = 0x68;
    pub const PHP: u8 = 0x08;
    pub const PLP: u8 = 0x28;
    
    // Branch operations
    pub const BNE: u8 = 0xD0;
    pub const BEQ: u8 = 0xF0;
    pub const BCC: u8 = 0x90;
    pub const BCS: u8 = 0xB0;
    pub const BPL: u8 = 0x10;
    pub const BMI: u8 = 0x30;
    pub const BVC: u8 = 0x50;
    pub const BVS: u8 = 0x70;
    
    // Jump/Call operations
    pub const JMP_ABS: u8 = 0x4C;
    pub const JMP_IND: u8 = 0x6C;
    pub const JSR: u8 = 0x20;
    pub const RTS: u8 = 0x60;
    pub const RTI: u8 = 0x40;
    
    // Compare operations
    pub const CMP_IMM: u8 = 0xC9;
    pub const CMP_ZP: u8 = 0xC5;
    pub const CMP_ZPX: u8 = 0xD5;
    pub const CMP_ABS: u8 = 0xCD;
    pub const CMP_ABSX: u8 = 0xDD;
    pub const CMP_ABSY: u8 = 0xD9;
    pub const CMP_IZX: u8 = 0xC1;
    pub const CMP_IZY: u8 = 0xD1;
    pub const CPX_IMM: u8 = 0xE0;
    pub const CPX_ZP: u8 = 0xE4;
    pub const CPX_ABS: u8 = 0xEC;
    pub const CPY_IMM: u8 = 0xC0;
    pub const CPY_ZP: u8 = 0xC4;
    pub const CPY_ABS: u8 = 0xCC;
    
    // Increment/Decrement
    pub const INX: u8 = 0xE8;
    pub const INY: u8 = 0xC8;
    pub const DEX: u8 = 0xCA;
    pub const DEY: u8 = 0x88;
    pub const INC_ZP: u8 = 0xE6;
    pub const INC_ZPX: u8 = 0xF6;
    pub const INC_ABS: u8 = 0xEE;
    pub const INC_ABSX: u8 = 0xFE;
    pub const DEC_ZP: u8 = 0xC6;
    pub const DEC_ZPX: u8 = 0xD6;
    pub const DEC_ABS: u8 = 0xCE;
    pub const DEC_ABSX: u8 = 0xDE;
    
    // Arithmetic
    pub const ADC_IMM: u8 = 0x69;
    pub const ADC_ZP: u8 = 0x65;
    pub const ADC_ZPX: u8 = 0x75;
    pub const ADC_ABS: u8 = 0x6D;
    pub const ADC_ABSX: u8 = 0x7D;
    pub const ADC_ABSY: u8 = 0x79;
    pub const ADC_IZX: u8 = 0x61;
    pub const ADC_IZY: u8 = 0x71;
    pub const SBC_IMM: u8 = 0xE9;
    pub const SBC_ZP: u8 = 0xE5;
    pub const SBC_ZPX: u8 = 0xF5;
    pub const SBC_ABS: u8 = 0xED;
    pub const SBC_ABSX: u8 = 0xFD;
    pub const SBC_ABSY: u8 = 0xF9;
    pub const SBC_IZX: u8 = 0xE1;
    pub const SBC_IZY: u8 = 0xF1;
    
    // Logical operations
    pub const AND_IMM: u8 = 0x29;
    pub const AND_ZP: u8 = 0x25;
    pub const AND_ZPX: u8 = 0x35;
    pub const AND_ABS: u8 = 0x2D;
    pub const AND_ABSX: u8 = 0x3D;
    pub const AND_ABSY: u8 = 0x39;
    pub const AND_IZX: u8 = 0x21;
    pub const AND_IZY: u8 = 0x31;
    pub const ORA_IMM: u8 = 0x09;
    pub const ORA_ZP: u8 = 0x05;
    pub const ORA_ZPX: u8 = 0x15;
    pub const ORA_ABS: u8 = 0x0D;
    pub const ORA_ABSX: u8 = 0x1D;
    pub const ORA_ABSY: u8 = 0x19;
    pub const ORA_IZX: u8 = 0x01;
    pub const ORA_IZY: u8 = 0x11;
    pub const EOR_IMM: u8 = 0x49;
    pub const EOR_ZP: u8 = 0x45;
    pub const EOR_ZPX: u8 = 0x55;
    pub const EOR_ABS: u8 = 0x4D;
    pub const EOR_ABSX: u8 = 0x5D;
    pub const EOR_ABSY: u8 = 0x59;
    pub const EOR_IZX: u8 = 0x41;
    pub const EOR_IZY: u8 = 0x51;
    
    // Shift/Rotate operations
    pub const ASL_ACC: u8 = 0x0A;
    pub const ASL_ZP: u8 = 0x06;
    pub const ASL_ZPX: u8 = 0x16;
    pub const ASL_ABS: u8 = 0x0E;
    pub const ASL_ABSX: u8 = 0x1E;
    pub const LSR_ACC: u8 = 0x4A;
    pub const LSR_ZP: u8 = 0x46;
    pub const LSR_ZPX: u8 = 0x56;
    pub const LSR_ABS: u8 = 0x4E;
    pub const LSR_ABSX: u8 = 0x5E;
    pub const ROL_ACC: u8 = 0x2A;
    pub const ROL_ZP: u8 = 0x26;
    pub const ROL_ZPX: u8 = 0x36;
    pub const ROL_ABS: u8 = 0x2E;
    pub const ROL_ABSX: u8 = 0x3E;
    pub const ROR_ACC: u8 = 0x6A;
    pub const ROR_ZP: u8 = 0x66;
    pub const ROR_ZPX: u8 = 0x76;
    pub const ROR_ABS: u8 = 0x6E;
    pub const ROR_ABSX: u8 = 0x7E;
    
    // Bit operations
    pub const BIT_ZP: u8 = 0x24;
    pub const BIT_ABS: u8 = 0x2C;
    
    // Flag operations
    pub const CLC: u8 = 0x18;
    pub const SEC: u8 = 0x38;
    pub const CLI: u8 = 0x58;
    pub const SEI: u8 = 0x78;
    pub const CLV: u8 = 0xB8;
    pub const CLD: u8 = 0xD8;
    pub const SED: u8 = 0xF8;
    
    // ===== Illegal/Undocumented Opcodes =====
    // These are not part of the official 6502 specification
    // but are implemented for compatibility
    
    // KIL/JAM - Halt CPU
    pub const KIL_02: u8 = 0x02;
    pub const KIL_12: u8 = 0x12;
    pub const KIL_22: u8 = 0x22;
    pub const KIL_32: u8 = 0x32;
    pub const KIL_42: u8 = 0x42;
    pub const KIL_52: u8 = 0x52;
    pub const KIL_62: u8 = 0x62;
    pub const KIL_72: u8 = 0x72;
    pub const KIL_92: u8 = 0x92;
    pub const KIL_B2: u8 = 0xB2;
    pub const KIL_D2: u8 = 0xD2;
    pub const KIL_F2: u8 = 0xF2;
    
    // SLO - Shift Left then OR
    pub const SLO_IZX: u8 = 0x03;
    pub const SLO_ZP: u8 = 0x07;
    pub const SLO_ABS: u8 = 0x0F;
    pub const SLO_IZY: u8 = 0x13;
    pub const SLO_ZPX: u8 = 0x17;
    pub const SLO_ABY: u8 = 0x1B;
    pub const SLO_ABX: u8 = 0x1F;
    
    // RLA - Rotate Left then AND
    pub const RLA_IZX: u8 = 0x23;
    pub const RLA_ZP: u8 = 0x27;
    pub const RLA_ABS: u8 = 0x2F;
    pub const RLA_IZY: u8 = 0x33;
    pub const RLA_ZPX: u8 = 0x37;
    pub const RLA_ABY: u8 = 0x3B;
    pub const RLA_ABX: u8 = 0x3F;
    
    // SRE - Shift Right then EOR
    pub const SRE_IZX: u8 = 0x43;
    pub const SRE_ZP: u8 = 0x47;
    pub const SRE_ABS: u8 = 0x4F;
    pub const SRE_IZY: u8 = 0x53;
    pub const SRE_ZPX: u8 = 0x57;
    pub const SRE_ABY: u8 = 0x5B;
    pub const SRE_ABX: u8 = 0x5F;
    
    // RRA - Rotate Right then ADC
    pub const RRA_IZX: u8 = 0x63;
    pub const RRA_ZP: u8 = 0x67;
    pub const RRA_ABS: u8 = 0x6F;
    pub const RRA_IZY: u8 = 0x73;
    pub const RRA_ZPX: u8 = 0x77;
    pub const RRA_ABY: u8 = 0x7B;
    pub const RRA_ABX: u8 = 0x7F;
    
    // SAX - Store A AND X
    pub const SAX_IZX: u8 = 0x83;
    pub const SAX_ZP: u8 = 0x87;
    pub const SAX_ABS: u8 = 0x8F;
    pub const SAX_ZPY: u8 = 0x97;
    
    // LAX - Load A and X
    pub const LAX_IZX: u8 = 0xA3;
    pub const LAX_ZP: u8 = 0xA7;
    pub const LAX_IMM: u8 = 0xAB;
    pub const LAX_ABS: u8 = 0xAF;
    pub const LAX_IZY: u8 = 0xB3;
    pub const LAX_ZPY: u8 = 0xB7;
    pub const LAX_ABY: u8 = 0xBF;
    
    // DCP - Decrement then Compare
    pub const DCP_IZX: u8 = 0xC3;
    pub const DCP_ZP: u8 = 0xC7;
    pub const DCP_ABS: u8 = 0xCF;
    pub const DCP_IZY: u8 = 0xD3;
    pub const DCP_ZPX: u8 = 0xD7;
    pub const DCP_ABY: u8 = 0xDB;
    pub const DCP_ABX: u8 = 0xDF;
    
    // ISC - Increment then SBC
    pub const ISC_IZX: u8 = 0xE3;
    pub const ISC_ZP: u8 = 0xE7;
    pub const ISC_ABS: u8 = 0xEF;
    pub const ISC_IZY: u8 = 0xF3;
    pub const ISC_ZPX: u8 = 0xF7;
    pub const ISC_ABY: u8 = 0xFB;
    pub const ISC_ABX: u8 = 0xFF;
    
    // Special illegal opcodes
    pub const ANC_0B: u8 = 0x0B;
    pub const ANC_2B: u8 = 0x2B;
    pub const ALR: u8 = 0x4B;
    pub const ARR: u8 = 0x6B;
    pub const XAA: u8 = 0x8B;
    pub const AXS: u8 = 0xCB;
    pub const SBC_EB: u8 = 0xEB;  // Duplicate SBC
    
    // Unstable opcodes
    pub const AHX_IZY: u8 = 0x93;
    pub const AHX_ABY: u8 = 0x9F;
    pub const TAS: u8 = 0x9B;
    pub const SHY: u8 = 0x9C;
    pub const SHX: u8 = 0x9E;
    pub const LAS: u8 = 0xBB;
    
    // NOP variants (illegal)
    pub const NOP_04: u8 = 0x04;
    pub const NOP_0C: u8 = 0x0C;
    pub const NOP_14: u8 = 0x14;
    pub const NOP_1A: u8 = 0x1A;
    pub const NOP_1C: u8 = 0x1C;
    pub const NOP_34: u8 = 0x34;
    pub const NOP_3A: u8 = 0x3A;
    pub const NOP_3C: u8 = 0x3C;
    pub const NOP_44: u8 = 0x44;
    pub const NOP_54: u8 = 0x54;
    pub const NOP_5A: u8 = 0x5A;
    pub const NOP_5C: u8 = 0x5C;
    pub const NOP_64: u8 = 0x64;
    pub const NOP_74: u8 = 0x74;
    pub const NOP_7A: u8 = 0x7A;
    pub const NOP_7C: u8 = 0x7C;
    pub const NOP_80: u8 = 0x80;
    pub const NOP_82: u8 = 0x82;
    pub const NOP_89: u8 = 0x89;
    pub const NOP_C2: u8 = 0xC2;
    pub const NOP_D4: u8 = 0xD4;
    pub const NOP_DA: u8 = 0xDA;
    pub const NOP_DC: u8 = 0xDC;
    pub const NOP_E2: u8 = 0xE2;
    pub const NOP_F4: u8 = 0xF4;
    pub const NOP_FA: u8 = 0xFA;
    pub const NOP_FC: u8 = 0xFC;
}

impl CPU6502 {
    /// Main instruction dispatch
    pub(crate) fn dispatch_opcode(&mut self, opcode: u8) {
        match opcode {
            // System
            opcodes::BRK => self.brk(),
            opcodes::NOP => self.nop(),
            
            // Load operations
            opcodes::LDA_IMM => self.lda_imm(),
            opcodes::LDA_ZP => self.lda_zp(),
            opcodes::LDA_ZPX => self.lda_zpx(),
            opcodes::LDA_ABS => self.lda_abs(),
            opcodes::LDA_ABSX => self.lda_absx(),
            opcodes::LDA_ABSY => self.lda_absy(),
            opcodes::LDA_IZX => self.lda_izx(),
            opcodes::LDA_IZY => self.lda_izy(),
            opcodes::LDX_IMM => self.ldx_imm(),
            opcodes::LDX_ZP => self.ldx_zp(),
            opcodes::LDX_ZPY => self.ldx_zpy(),
            opcodes::LDX_ABS => self.ldx_abs(),
            opcodes::LDX_ABSY => self.ldx_aby(),
            opcodes::LDY_IMM => self.ldy_imm(),
            opcodes::LDY_ZP => self.ldy_zp(),
            opcodes::LDY_ZPX => self.ldy_zpx(),
            opcodes::LDY_ABS => self.ldy_abs(),
            opcodes::LDY_ABSX => self.ldy_abx(),
            
            // Store operations
            opcodes::STA_ZP => self.sta_zp(),
            opcodes::STA_ZPX => self.sta_zpx(),
            opcodes::STA_ABS => self.sta_abs(),
            opcodes::STA_ABSX => self.sta_absx(),
            opcodes::STA_ABSY => self.sta_absy(),
            opcodes::STA_IZX => self.sta_izx(),
            opcodes::STA_IZY => self.sta_izy(),
            opcodes::STX_ZP => self.stx_zp(),
            opcodes::STX_ZPY => self.stx_zpy(),
            opcodes::STX_ABS => self.stx_abs(),
            opcodes::STY_ZP => self.sty_zp(),
            opcodes::STY_ZPX => self.sty_zpx(),
            opcodes::STY_ABS => self.sty_abs(),
            
            // Transfer operations
            opcodes::TAX => self.tax(),
            opcodes::TAY => self.tay(),
            opcodes::TXA => self.txa(),
            opcodes::TYA => self.tya(),
            opcodes::TSX => self.tsx(),
            opcodes::TXS => self.txs(),
            
            // Stack operations
            opcodes::PHA => self.pha(),
            opcodes::PLA => self.pla(),
            opcodes::PHP => self.php(),
            opcodes::PLP => self.plp(),
            
            // Branch operations
            opcodes::BNE => self.bne(),
            opcodes::BEQ => self.beq(),
            opcodes::BCC => self.bcc(),
            opcodes::BCS => self.bcs(),
            opcodes::BPL => self.bpl(),
            opcodes::BMI => self.bmi(),
            opcodes::BVC => self.bvc(),
            opcodes::BVS => self.bvs(),
            
            // Jump/Call operations
            opcodes::JMP_ABS => self.jmp_abs(),
            opcodes::JMP_IND => self.jmp_ind(),
            opcodes::JSR => self.jsr(),
            opcodes::RTS => self.rts(),
            opcodes::RTI => self.rti(),
            
            // Compare operations
            opcodes::CMP_IMM => self.cmp_imm(),
            opcodes::CMP_ZP => self.cmp_zp(),
            opcodes::CMP_ZPX => self.cmp_zpx(),
            opcodes::CMP_ABS => self.cmp_abs(),
            opcodes::CMP_ABSX => self.cmp_absx(),
            opcodes::CMP_ABSY => self.cmp_absy(),
            opcodes::CMP_IZX => self.cmp_izx(),
            opcodes::CMP_IZY => self.cmp_izy(),
            opcodes::CPX_IMM => self.cpx_imm(),
            opcodes::CPX_ZP => self.cpx_zp(),
            opcodes::CPX_ABS => self.cpx_abs(),
            opcodes::CPY_IMM => self.cpy_imm(),
            opcodes::CPY_ZP => self.cpy_zp(),
            opcodes::CPY_ABS => self.cpy_abs(),
            
            // Increment/Decrement
            opcodes::INX => self.inx(),
            opcodes::INY => self.iny(),
            opcodes::DEX => self.dex(),
            opcodes::DEY => self.dey(),
            opcodes::INC_ZP => self.inc_zp(),
            opcodes::INC_ZPX => self.inc_zpx(),
            opcodes::INC_ABS => self.inc_abs(),
            opcodes::INC_ABSX => self.inc_absx(),
            opcodes::DEC_ZP => self.dec_zp(),
            opcodes::DEC_ZPX => self.dec_zpx(),
            opcodes::DEC_ABS => self.dec_abs(),
            opcodes::DEC_ABSX => self.dec_absx(),
            
            // Arithmetic
            opcodes::ADC_IMM => self.adc_imm(),
            opcodes::ADC_ZP => self.adc_zp(),
            opcodes::ADC_ZPX => self.adc_zpx(),
            opcodes::ADC_ABS => self.adc_abs(),
            opcodes::ADC_ABSX => self.adc_absx(),
            opcodes::ADC_ABSY => self.adc_absy(),
            opcodes::ADC_IZX => self.adc_izx(),
            opcodes::ADC_IZY => self.adc_izy(),
            opcodes::SBC_IMM => self.sbc_imm(),
            opcodes::SBC_ZP => self.sbc_zp(),
            opcodes::SBC_ZPX => self.sbc_zpx(),
            opcodes::SBC_ABS => self.sbc_abs(),
            opcodes::SBC_ABSX => self.sbc_absx(),
            opcodes::SBC_ABSY => self.sbc_absy(),
            opcodes::SBC_IZX => self.sbc_izx(),
            opcodes::SBC_IZY => self.sbc_izy(),
            
            // Logical operations
            opcodes::AND_IMM => self.and_imm(),
            opcodes::AND_ZP => self.and_zp(),
            opcodes::AND_ZPX => self.and_zpx(),
            opcodes::AND_ABS => self.and_abs(),
            opcodes::AND_ABSX => self.and_absx(),
            opcodes::AND_ABSY => self.and_absy(),
            opcodes::AND_IZX => self.and_izx(),
            opcodes::AND_IZY => self.and_izy(),
            opcodes::ORA_IMM => self.ora_imm(),
            opcodes::ORA_ZP => self.ora_zp(),
            opcodes::ORA_ZPX => self.ora_zpx(),
            opcodes::ORA_ABS => self.ora_abs(),
            opcodes::ORA_ABSX => self.ora_absx(),
            opcodes::ORA_ABSY => self.ora_absy(),
            opcodes::ORA_IZX => self.ora_izx(),
            opcodes::ORA_IZY => self.ora_izy(),
            opcodes::EOR_IMM => self.eor_imm(),
            opcodes::EOR_ZP => self.eor_zp(),
            opcodes::EOR_ZPX => self.eor_zpx(),
            opcodes::EOR_ABS => self.eor_abs(),
            opcodes::EOR_ABSX => self.eor_absx(),
            opcodes::EOR_ABSY => self.eor_absy(),
            opcodes::EOR_IZX => self.eor_izx(),
            opcodes::EOR_IZY => self.eor_izy(),
            
            // Shift/Rotate operations
            opcodes::ASL_ACC => self.asla(),
            opcodes::ASL_ZP => self.asl_zp(),
            opcodes::ASL_ZPX => self.asl_zpx(),
            opcodes::ASL_ABS => self.asl_abs(),
            opcodes::ASL_ABSX => self.asl_absx(),
            opcodes::LSR_ACC => self.lsra(),
            opcodes::LSR_ZP => self.lsr_zp(),
            opcodes::LSR_ZPX => self.lsr_zpx(),
            opcodes::LSR_ABS => self.lsr_abs(),
            opcodes::LSR_ABSX => self.lsr_absx(),
            opcodes::ROL_ACC => self.rola(),
            opcodes::ROL_ZP => self.rol_zp(),
            opcodes::ROL_ZPX => self.rol_zpx(),
            opcodes::ROL_ABS => self.rol_abs(),
            opcodes::ROL_ABSX => self.rol_absx(),
            opcodes::ROR_ACC => self.rora(),
            opcodes::ROR_ZP => self.ror_zp(),
            opcodes::ROR_ZPX => self.ror_zpx(),
            opcodes::ROR_ABS => self.ror_abs(),
            opcodes::ROR_ABSX => self.ror_absx(),
            
            // Bit operations
            opcodes::BIT_ZP => self.bit_zp(),
            opcodes::BIT_ABS => self.bit_abs(),
            
            // Flag operations
            opcodes::CLC => self.clc(),
            opcodes::SEC => self.sec(),
            opcodes::CLI => self.cli(),
            opcodes::SEI => self.sei(),
            opcodes::CLV => self.clv(),
            opcodes::CLD => self.cld(),
            opcodes::SED => self.sed(),
            
            // ===== Illegal/Undocumented Opcodes =====
            
            // KIL/JAM
            opcodes::KIL_02 | opcodes::KIL_12 | opcodes::KIL_22 | opcodes::KIL_32 |
            opcodes::KIL_42 | opcodes::KIL_52 | opcodes::KIL_62 | opcodes::KIL_72 |
            opcodes::KIL_92 | opcodes::KIL_B2 | opcodes::KIL_D2 | opcodes::KIL_F2 => self.kil(),
            
            // SLO
            opcodes::SLO_IZX => self.slo_izx(),
            opcodes::SLO_ZP => self.slo_zp(),
            opcodes::SLO_ABS => self.slo_abs(),
            opcodes::SLO_IZY => self.slo_izy(),
            opcodes::SLO_ZPX => self.slo_zpx(),
            opcodes::SLO_ABY => self.slo_absy(),
            opcodes::SLO_ABX => self.slo_absx(),
            
            // RLA
            opcodes::RLA_IZX => self.rla_izx(),
            opcodes::RLA_ZP => self.rla_zp(),
            opcodes::RLA_ABS => self.rla_abs(),
            opcodes::RLA_IZY => self.rla_izy(),
            opcodes::RLA_ZPX => self.rla_zpx(),
            opcodes::RLA_ABY => self.rla_absy(),
            opcodes::RLA_ABX => self.rla_absx(),
            
            // SRE
            opcodes::SRE_IZX => self.sre_izx(),
            opcodes::SRE_ZP => self.sre_zp(),
            opcodes::SRE_ABS => self.sre_abs(),
            opcodes::SRE_IZY => self.sre_izy(),
            opcodes::SRE_ZPX => self.sre_zpx(),
            opcodes::SRE_ABY => self.sre_absy(),
            opcodes::SRE_ABX => self.sre_absx(),
            
            // RRA
            opcodes::RRA_IZX => self.rra_izx(),
            opcodes::RRA_ZP => self.rra_zp(),
            opcodes::RRA_ABS => self.rra_abs(),
            opcodes::RRA_IZY => self.rra_izy(),
            opcodes::RRA_ZPX => self.rra_zpx(),
            opcodes::RRA_ABY => self.rra_absy(),
            opcodes::RRA_ABX => self.rra_absx(),
            
            // SAX
            opcodes::SAX_IZX => self.sax_izx(),
            opcodes::SAX_ZP => self.sax_zp(),
            opcodes::SAX_ABS => self.sax_abs(),
            opcodes::SAX_ZPY => self.sax_zpy(),
            
            // LAX
            opcodes::LAX_IZX => self.lax_izx(),
            opcodes::LAX_ZP => self.lax_zp(),
            opcodes::LAX_IMM => {
                // LAX immediate is unstable, just do LDA + TAX
                let value = self.read_byte(self.pc);
                self.pc = self.pc.wrapping_add(1);
                self.a = value;
                self.x = value;
                self.update_nz(value);
                self.cycles += 2;
            },
            opcodes::LAX_ABS => self.lax_abs(),
            opcodes::LAX_IZY => self.lax_izy(),
            opcodes::LAX_ZPY => self.lax_zpy(),
            opcodes::LAX_ABY => self.lax_aby(),
            
            // DCP
            opcodes::DCP_IZX => self.dcp_izx(),
            opcodes::DCP_ZP => self.dcp_zp(),
            opcodes::DCP_ABS => self.dcp_abs(),
            opcodes::DCP_IZY => self.dcp_izy(),
            opcodes::DCP_ZPX => self.dcp_zpx(),
            opcodes::DCP_ABY => self.dcp_absy(),
            opcodes::DCP_ABX => self.dcp_absx(),
            
            // ISC
            opcodes::ISC_IZX => self.isc_izx(),
            opcodes::ISC_ZP => self.isc_zp(),
            opcodes::ISC_ABS => self.isc_abs(),
            opcodes::ISC_IZY => self.isc_izy(),
            opcodes::ISC_ZPX => self.isc_zpx(),
            opcodes::ISC_ABY => self.isc_absy(),
            opcodes::ISC_ABX => self.isc_absx(),
            
            // Special illegal opcodes
            opcodes::ANC_0B | opcodes::ANC_2B => self.anc(),
            opcodes::ALR => self.alr(),
            opcodes::ARR => self.arr(),
            opcodes::XAA => self.xaa(),
            opcodes::AXS => self.axs(),
            opcodes::SBC_EB => self.sbc_imm(),  // Duplicate SBC immediate
            
            // Unstable opcodes
            opcodes::AHX_IZY => self.ahx_izy(),
            opcodes::AHX_ABY => self.ahx_aby(),
            opcodes::TAS => self.tas(),
            opcodes::SHY => self.shy(),
            opcodes::SHX => self.shx(),
            opcodes::LAS => self.las(),
            
            // NOP variants
            opcodes::NOP_04 | opcodes::NOP_44 | opcodes::NOP_64 => self.nop_zp(),
            opcodes::NOP_0C => self.nop_abs(),
            opcodes::NOP_14 | opcodes::NOP_34 | opcodes::NOP_54 | 
            opcodes::NOP_74 | opcodes::NOP_D4 | opcodes::NOP_F4 => self.nop_zpx(),
            opcodes::NOP_1A | opcodes::NOP_3A | opcodes::NOP_5A | 
            opcodes::NOP_7A | opcodes::NOP_DA | opcodes::NOP_FA => self.nop_implied(),
            opcodes::NOP_1C | opcodes::NOP_3C | opcodes::NOP_5C | 
            opcodes::NOP_7C | opcodes::NOP_DC | opcodes::NOP_FC => self.nop_abx(),
            opcodes::NOP_80 | opcodes::NOP_82 | opcodes::NOP_89 | 
            opcodes::NOP_C2 | opcodes::NOP_E2 => {
                // NOP immediate - just skip byte
                self.pc = self.pc.wrapping_add(1);
                self.cycles += 2;
            },
            
            _ => {
                // Unknown opcode - for now just treat as NOP
                crate::console_log!("Unknown opcode: 0x{:02X}", opcode);
                self.nop();
            }
        }
    }
}