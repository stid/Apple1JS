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
            
            _ => {
                // Unknown opcode - for now just treat as NOP
                crate::console_log!("Unknown opcode: 0x{:02X}", opcode);
                self.nop();
            }
        }
    }
}