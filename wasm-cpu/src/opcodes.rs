/*!
 * 6502 opcode constant table.
 *
 * Maps each mnemonic + addressing mode to its opcode byte. Shared by the
 * Bus-aware dispatch in `opcodes_with_bus.rs`.
 */

/// Opcode definitions.
///
/// A complete reference table of 6502 opcode bytes. The Bus-aware dispatch
/// implements the documented (and a subset of the undocumented) opcodes; the
/// remaining illegal-opcode constants are kept for completeness, hence the
/// module-wide dead_code allowance.
#[allow(dead_code)]
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
    pub const SBC_EB: u8 = 0xEB; // Duplicate SBC

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
