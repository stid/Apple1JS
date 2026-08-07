/*!
 * Opcode dispatch with internal Bus (eliminates WASM→JS boundary crossings)
 *
 * This module provides a complete opcode dispatch implementation that uses
 * the internal Bus directly, avoiding the JavaScript bridge for maximum performance.
 */

use crate::CPU6502;
use crate::Bus;

/// Macro to generate instruction wrappers that use internal Bus
macro_rules! bus_instruction {
    // Load instructions (read operation)
    (load, $self:ident, $bus:ident, $reg:ident, $addr_expr:expr, $base_cycles:expr) => {{
        let addr = $addr_expr;
        $self.$reg = $self.read_byte_from_bus($bus, addr);
        $self.update_nz($self.$reg);
        $self.cycles += $base_cycles;
    }};

    // Store instructions (write operation)
    (store, $self:ident, $bus:ident, $reg:expr, $addr_expr:expr, $base_cycles:expr) => {{
        let addr = $addr_expr;
        $self.write_byte_to_bus($bus, addr, $reg);
        $self.cycles += $base_cycles;
    }};
}

impl CPU6502 {
    /// Main instruction dispatch with internal Bus
    /// This eliminates WASM→JS boundary crossings for all memory access
    pub(crate) fn dispatch_opcode_with_bus(&mut self, bus: &mut Bus, opcode: u8) {
        use crate::opcodes::opcodes;

        match opcode {
            // ========== System Operations ==========
            opcodes::BRK => self.brk_bus(bus),
            opcodes::NOP => self.nop_bus(),
            opcodes::RTI => self.rti_bus(bus),

            // ========== Load Operations ==========
            opcodes::LDA_IMM => self.lda_imm_bus(bus),
            opcodes::LDA_ZP => self.lda_zp_bus(bus),
            opcodes::LDA_ZPX => self.lda_zpx_bus(bus),
            opcodes::LDA_ABS => self.lda_abs_bus(bus),
            opcodes::LDA_ABSX => self.lda_absx_bus(bus),
            opcodes::LDA_ABSY => self.lda_absy_bus(bus),
            opcodes::LDA_IZX => self.lda_izx_bus(bus),
            opcodes::LDA_IZY => self.lda_izy_bus(bus),

            opcodes::LDX_IMM => self.ldx_imm_bus(bus),
            opcodes::LDX_ZP => self.ldx_zp_bus(bus),
            opcodes::LDX_ZPY => self.ldx_zpy_bus(bus),
            opcodes::LDX_ABS => self.ldx_abs_bus(bus),
            opcodes::LDX_ABSY => self.ldx_aby_bus(bus),

            opcodes::LDY_IMM => self.ldy_imm_bus(bus),
            opcodes::LDY_ZP => self.ldy_zp_bus(bus),
            opcodes::LDY_ZPX => self.ldy_zpx_bus(bus),
            opcodes::LDY_ABS => self.ldy_abs_bus(bus),
            opcodes::LDY_ABSX => self.ldy_abx_bus(bus),

            // ========== Store Operations ==========
            opcodes::STA_ZP => self.sta_zp_bus(bus),
            opcodes::STA_ZPX => self.sta_zpx_bus(bus),
            opcodes::STA_ABS => self.sta_abs_bus(bus),
            opcodes::STA_ABSX => self.sta_absx_bus(bus),
            opcodes::STA_ABSY => self.sta_absy_bus(bus),
            opcodes::STA_IZX => self.sta_izx_bus(bus),
            opcodes::STA_IZY => self.sta_izy_bus(bus),

            opcodes::STX_ZP => self.stx_zp_bus(bus),
            opcodes::STX_ZPY => self.stx_zpy_bus(bus),
            opcodes::STX_ABS => self.stx_abs_bus(bus),

            opcodes::STY_ZP => self.sty_zp_bus(bus),
            opcodes::STY_ZPX => self.sty_zpx_bus(bus),
            opcodes::STY_ABS => self.sty_abs_bus(bus),

            // ========== Transfer Operations (no memory access) ==========
            opcodes::TAX => self.tax_bus(),
            opcodes::TAY => self.tay_bus(),
            opcodes::TXA => self.txa_bus(),
            opcodes::TYA => self.tya_bus(),
            opcodes::TSX => self.tsx_bus(),
            opcodes::TXS => self.txs_bus(),

            // ========== Stack Operations ==========
            opcodes::PHA => self.pha_bus(bus),
            opcodes::PLA => self.pla_bus(bus),
            opcodes::PHP => self.php_bus(bus),
            opcodes::PLP => self.plp_bus(bus),

            // ========== Branch Operations ==========
            opcodes::BNE => self.bne_bus(bus),
            opcodes::BEQ => self.beq_bus(bus),
            opcodes::BCC => self.bcc_bus(bus),
            opcodes::BCS => self.bcs_bus(bus),
            opcodes::BPL => self.bpl_bus(bus),
            opcodes::BMI => self.bmi_bus(bus),
            opcodes::BVC => self.bvc_bus(bus),
            opcodes::BVS => self.bvs_bus(bus),

            // ========== Jump/Call Operations ==========
            opcodes::JMP_ABS => self.jmp_abs_bus(bus),
            opcodes::JMP_IND => self.jmp_ind_bus(bus),
            opcodes::JSR => self.jsr_bus(bus),
            opcodes::RTS => self.rts_bus(bus),

            // ========== Compare Operations ==========
            opcodes::CMP_IMM => self.cmp_imm_bus(bus),
            opcodes::CMP_ZP => self.cmp_zp_bus(bus),
            opcodes::CMP_ZPX => self.cmp_zpx_bus(bus),
            opcodes::CMP_ABS => self.cmp_abs_bus(bus),
            opcodes::CMP_ABSX => self.cmp_absx_bus(bus),
            opcodes::CMP_ABSY => self.cmp_absy_bus(bus),
            opcodes::CMP_IZX => self.cmp_izx_bus(bus),
            opcodes::CMP_IZY => self.cmp_izy_bus(bus),

            opcodes::CPX_IMM => self.cpx_imm_bus(bus),
            opcodes::CPX_ZP => self.cpx_zp_bus(bus),
            opcodes::CPX_ABS => self.cpx_abs_bus(bus),

            opcodes::CPY_IMM => self.cpy_imm_bus(bus),
            opcodes::CPY_ZP => self.cpy_zp_bus(bus),
            opcodes::CPY_ABS => self.cpy_abs_bus(bus),

            // ========== Increment/Decrement ==========
            opcodes::INX => self.inx_bus(),
            opcodes::INY => self.iny_bus(),
            opcodes::DEX => self.dex_bus(),
            opcodes::DEY => self.dey_bus(),

            opcodes::INC_ZP => self.inc_zp_bus(bus),
            opcodes::INC_ZPX => self.inc_zpx_bus(bus),
            opcodes::INC_ABS => self.inc_abs_bus(bus),
            opcodes::INC_ABSX => self.inc_absx_bus(bus),

            opcodes::DEC_ZP => self.dec_zp_bus(bus),
            opcodes::DEC_ZPX => self.dec_zpx_bus(bus),
            opcodes::DEC_ABS => self.dec_abs_bus(bus),
            opcodes::DEC_ABSX => self.dec_absx_bus(bus),

            // ========== Arithmetic Operations ==========
            opcodes::ADC_IMM => self.adc_imm_bus(bus),
            opcodes::ADC_ZP => self.adc_zp_bus(bus),
            opcodes::ADC_ZPX => self.adc_zpx_bus(bus),
            opcodes::ADC_ABS => self.adc_abs_bus(bus),
            opcodes::ADC_ABSX => self.adc_absx_bus(bus),
            opcodes::ADC_ABSY => self.adc_absy_bus(bus),
            opcodes::ADC_IZX => self.adc_izx_bus(bus),
            opcodes::ADC_IZY => self.adc_izy_bus(bus),

            opcodes::SBC_IMM => self.sbc_imm_bus(bus),
            opcodes::SBC_ZP => self.sbc_zp_bus(bus),
            opcodes::SBC_ZPX => self.sbc_zpx_bus(bus),
            opcodes::SBC_ABS => self.sbc_abs_bus(bus),
            opcodes::SBC_ABSX => self.sbc_absx_bus(bus),
            opcodes::SBC_ABSY => self.sbc_absy_bus(bus),
            opcodes::SBC_IZX => self.sbc_izx_bus(bus),
            opcodes::SBC_IZY => self.sbc_izy_bus(bus),

            // ========== Logical Operations ==========
            opcodes::AND_IMM => self.and_imm_bus(bus),
            opcodes::AND_ZP => self.and_zp_bus(bus),
            opcodes::AND_ZPX => self.and_zpx_bus(bus),
            opcodes::AND_ABS => self.and_abs_bus(bus),
            opcodes::AND_ABSX => self.and_absx_bus(bus),
            opcodes::AND_ABSY => self.and_absy_bus(bus),
            opcodes::AND_IZX => self.and_izx_bus(bus),
            opcodes::AND_IZY => self.and_izy_bus(bus),

            opcodes::ORA_IMM => self.ora_imm_bus(bus),
            opcodes::ORA_ZP => self.ora_zp_bus(bus),
            opcodes::ORA_ZPX => self.ora_zpx_bus(bus),
            opcodes::ORA_ABS => self.ora_abs_bus(bus),
            opcodes::ORA_ABSX => self.ora_absx_bus(bus),
            opcodes::ORA_ABSY => self.ora_absy_bus(bus),
            opcodes::ORA_IZX => self.ora_izx_bus(bus),
            opcodes::ORA_IZY => self.ora_izy_bus(bus),

            opcodes::EOR_IMM => self.eor_imm_bus(bus),
            opcodes::EOR_ZP => self.eor_zp_bus(bus),
            opcodes::EOR_ZPX => self.eor_zpx_bus(bus),
            opcodes::EOR_ABS => self.eor_abs_bus(bus),
            opcodes::EOR_ABSX => self.eor_absx_bus(bus),
            opcodes::EOR_ABSY => self.eor_absy_bus(bus),
            opcodes::EOR_IZX => self.eor_izx_bus(bus),
            opcodes::EOR_IZY => self.eor_izy_bus(bus),

            // ========== Flag Operations (no memory access) ==========
            opcodes::CLC => self.clc_bus(),
            opcodes::SEC => self.sec_bus(),
            opcodes::CLI => self.cli_bus(),
            opcodes::SEI => self.sei_bus(),
            opcodes::CLV => self.clv_bus(),
            opcodes::CLD => self.cld_bus(),
            opcodes::SED => self.sed_bus(),

            // ========== Bit Operations ==========
            opcodes::BIT_ZP => self.bit_zp_bus(bus),
            opcodes::BIT_ABS => self.bit_abs_bus(bus),

            // ========== Shift and Rotate ==========
            opcodes::ASL_ACC => self.asla_bus(),
            opcodes::ASL_ZP => self.asl_zp_bus(bus),
            opcodes::ASL_ZPX => self.asl_zpx_bus(bus),
            opcodes::ASL_ABS => self.asl_abs_bus(bus),
            opcodes::ASL_ABSX => self.asl_absx_bus(bus),

            opcodes::LSR_ACC => self.lsra_bus(),
            opcodes::LSR_ZP => self.lsr_zp_bus(bus),
            opcodes::LSR_ZPX => self.lsr_zpx_bus(bus),
            opcodes::LSR_ABS => self.lsr_abs_bus(bus),
            opcodes::LSR_ABSX => self.lsr_absx_bus(bus),

            opcodes::ROL_ACC => self.rola_bus(),
            opcodes::ROL_ZP => self.rol_zp_bus(bus),
            opcodes::ROL_ZPX => self.rol_zpx_bus(bus),
            opcodes::ROL_ABS => self.rol_abs_bus(bus),
            opcodes::ROL_ABSX => self.rol_absx_bus(bus),

            opcodes::ROR_ACC => self.rora_bus(),
            opcodes::ROR_ZP => self.ror_zp_bus(bus),
            opcodes::ROR_ZPX => self.ror_zpx_bus(bus),
            opcodes::ROR_ABS => self.ror_abs_bus(bus),
            opcodes::ROR_ABSX => self.ror_absx_bus(bus),

            // ========== Illegal/Undocumented Opcodes ==========
            // (Partial support - commonly used ones)
            // TODO: Implement Bus-aware versions of illegal opcodes


            // For unimplemented opcodes, use NOP behavior

            // ===== Undocumented instructions (parity with the TypeScript engine, D-013) =====
            // SLO
            opcodes::SLO_IZX => { let a = self.get_izx_addr_bus(bus); self.slo_mem(bus, a); self.cycles += 8; }
            opcodes::SLO_ZP => { let a = self.ill_zp(bus); self.slo_mem(bus, a); self.cycles += 5; }
            opcodes::SLO_ABS => { let a = self.ill_abs(bus); self.slo_mem(bus, a); self.cycles += 6; }
            opcodes::SLO_IZY => { let a = self.get_izy_addr_bus(bus); self.slo_mem(bus, a); self.cycles += 8; }
            opcodes::SLO_ZPX => { let a = self.ill_zpx(bus); self.slo_mem(bus, a); self.cycles += 6; }
            opcodes::SLO_ABY => { let a = self.ill_aby(bus); self.slo_mem(bus, a); self.cycles += 7; }
            opcodes::SLO_ABX => { let a = self.ill_abx(bus); self.slo_mem(bus, a); self.cycles += 7; }
            // RLA
            opcodes::RLA_IZX => { let a = self.get_izx_addr_bus(bus); self.rla_mem(bus, a); self.cycles += 8; }
            opcodes::RLA_ZP => { let a = self.ill_zp(bus); self.rla_mem(bus, a); self.cycles += 5; }
            opcodes::RLA_ABS => { let a = self.ill_abs(bus); self.rla_mem(bus, a); self.cycles += 6; }
            opcodes::RLA_IZY => { let a = self.get_izy_addr_bus(bus); self.rla_mem(bus, a); self.cycles += 8; }
            opcodes::RLA_ZPX => { let a = self.ill_zpx(bus); self.rla_mem(bus, a); self.cycles += 6; }
            opcodes::RLA_ABY => { let a = self.ill_aby(bus); self.rla_mem(bus, a); self.cycles += 7; }
            opcodes::RLA_ABX => { let a = self.ill_abx(bus); self.rla_mem(bus, a); self.cycles += 7; }
            // SRE
            opcodes::SRE_IZX => { let a = self.get_izx_addr_bus(bus); self.sre_mem(bus, a); self.cycles += 8; }
            opcodes::SRE_ZP => { let a = self.ill_zp(bus); self.sre_mem(bus, a); self.cycles += 5; }
            opcodes::SRE_ABS => { let a = self.ill_abs(bus); self.sre_mem(bus, a); self.cycles += 6; }
            opcodes::SRE_IZY => { let a = self.get_izy_addr_bus(bus); self.sre_mem(bus, a); self.cycles += 8; }
            opcodes::SRE_ZPX => { let a = self.ill_zpx(bus); self.sre_mem(bus, a); self.cycles += 6; }
            opcodes::SRE_ABY => { let a = self.ill_aby(bus); self.sre_mem(bus, a); self.cycles += 7; }
            opcodes::SRE_ABX => { let a = self.ill_abx(bus); self.sre_mem(bus, a); self.cycles += 7; }
            // RRA
            opcodes::RRA_IZX => { let a = self.get_izx_addr_bus(bus); self.rra_mem(bus, a); self.cycles += 8; }
            opcodes::RRA_ZP => { let a = self.ill_zp(bus); self.rra_mem(bus, a); self.cycles += 5; }
            opcodes::RRA_ABS => { let a = self.ill_abs(bus); self.rra_mem(bus, a); self.cycles += 6; }
            opcodes::RRA_IZY => { let a = self.get_izy_addr_bus(bus); self.rra_mem(bus, a); self.cycles += 8; }
            opcodes::RRA_ZPX => { let a = self.ill_zpx(bus); self.rra_mem(bus, a); self.cycles += 6; }
            opcodes::RRA_ABY => { let a = self.ill_aby(bus); self.rra_mem(bus, a); self.cycles += 7; }
            opcodes::RRA_ABX => { let a = self.ill_abx(bus); self.rra_mem(bus, a); self.cycles += 7; }
            // DCP
            opcodes::DCP_IZX => { let a = self.get_izx_addr_bus(bus); self.dcp_mem(bus, a); self.cycles += 8; }
            opcodes::DCP_ZP => { let a = self.ill_zp(bus); self.dcp_mem(bus, a); self.cycles += 5; }
            opcodes::DCP_ABS => { let a = self.ill_abs(bus); self.dcp_mem(bus, a); self.cycles += 6; }
            opcodes::DCP_IZY => { let a = self.get_izy_addr_bus(bus); self.dcp_mem(bus, a); self.cycles += 8; }
            opcodes::DCP_ZPX => { let a = self.ill_zpx(bus); self.dcp_mem(bus, a); self.cycles += 6; }
            opcodes::DCP_ABY => { let a = self.ill_aby(bus); self.dcp_mem(bus, a); self.cycles += 7; }
            opcodes::DCP_ABX => { let a = self.ill_abx(bus); self.dcp_mem(bus, a); self.cycles += 7; }
            // ISC
            opcodes::ISC_IZX => { let a = self.get_izx_addr_bus(bus); self.isc_mem(bus, a); self.cycles += 8; }
            opcodes::ISC_ZP => { let a = self.ill_zp(bus); self.isc_mem(bus, a); self.cycles += 5; }
            opcodes::ISC_ABS => { let a = self.ill_abs(bus); self.isc_mem(bus, a); self.cycles += 6; }
            opcodes::ISC_IZY => { let a = self.get_izy_addr_bus(bus); self.isc_mem(bus, a); self.cycles += 8; }
            opcodes::ISC_ZPX => { let a = self.ill_zpx(bus); self.isc_mem(bus, a); self.cycles += 6; }
            opcodes::ISC_ABY => { let a = self.ill_aby(bus); self.isc_mem(bus, a); self.cycles += 7; }
            opcodes::ISC_ABX => { let a = self.ill_abx(bus); self.isc_mem(bus, a); self.cycles += 7; }
            // SAX — store A AND X
            opcodes::SAX_IZX => { let a = self.get_izx_addr_bus(bus); self.sax_mem(bus, a); self.cycles += 6; }
            opcodes::SAX_ZP => { let a = self.ill_zp(bus); self.sax_mem(bus, a); self.cycles += 3; }
            opcodes::SAX_ABS => { let a = self.ill_abs(bus); self.sax_mem(bus, a); self.cycles += 4; }
            opcodes::SAX_ZPY => { let a = self.get_zpy_addr_bus(bus); self.sax_mem(bus, a); self.cycles += 4; }
            // LAX — load A and X
            opcodes::LAX_IZX => { let a = self.get_izx_addr_bus(bus); self.lax_mem(bus, a); self.cycles += 6; }
            opcodes::LAX_ZP => { let a = self.ill_zp(bus); self.lax_mem(bus, a); self.cycles += 3; }
            opcodes::LAX_ABS => { let a = self.ill_abs(bus); self.lax_mem(bus, a); self.cycles += 4; }
            opcodes::LAX_IZY => { let a = self.get_izy_addr_bus(bus); self.lax_mem(bus, a); self.cycles += 5; }
            opcodes::LAX_ZPY => { let a = self.get_zpy_addr_bus(bus); self.lax_mem(bus, a); self.cycles += 4; }
            opcodes::LAX_ABY => { let a = self.ill_aby(bus); self.lax_mem(bus, a); self.cycles += 4; }
            opcodes::LAX_IMM => { let v = self.ill_imm(bus); self.a = v; self.x = v; self.update_nz(v); self.cycles += 2; }
            // Immediate-operand specials
            opcodes::ANC_0B | opcodes::ANC_2B => { self.anc_imm(bus); self.cycles += 2; }
            opcodes::ALR => { self.alr_imm(bus); self.cycles += 2; }
            opcodes::ARR => { self.arr_imm(bus); self.cycles += 2; }
            opcodes::XAA => { self.xaa_imm(bus); self.cycles += 2; }
            opcodes::AXS => { self.axs_imm(bus); self.cycles += 2; }
            opcodes::SBC_EB => { let v = self.ill_imm(bus); self.sbc_bus(v); self.cycles += 2; }
            // Unstable store forms
            opcodes::AHX_IZY => { let a = self.get_izy_addr_bus(bus); self.ahx_mem(bus, a); self.cycles += 6; }
            opcodes::AHX_ABY => { let a = self.ill_aby(bus); self.ahx_mem(bus, a); self.cycles += 5; }
            opcodes::TAS => { let a = self.ill_aby(bus); self.tas_mem(bus, a); self.cycles += 5; }
            opcodes::SHY => { let a = self.ill_abx(bus); self.shy_mem(bus, a); self.cycles += 5; }
            opcodes::SHX => { let a = self.ill_aby(bus); self.shx_mem(bus, a); self.cycles += 5; }
            opcodes::LAS => { let a = self.ill_aby(bus); self.las_mem(bus, a); self.cycles += 4; }
            // KIL/JAM — jams the processor
            opcodes::KIL_02
            | opcodes::KIL_12
            | opcodes::KIL_22
            | opcodes::KIL_32
            | opcodes::KIL_42
            | opcodes::KIL_52
            | opcodes::KIL_62
            | opcodes::KIL_72
            | opcodes::KIL_92
            | opcodes::KIL_B2
            | opcodes::KIL_D2
            | opcodes::KIL_F2 => { self.kil_bus(); self.cycles += 2; }
            // NOP variants: 1-byte implied, 2-byte with a discarded operand, 3-byte absolute
            opcodes::NOP_1A
            | opcodes::NOP_3A
            | opcodes::NOP_5A
            | opcodes::NOP_7A
            | opcodes::NOP_DA
            | opcodes::NOP_FA => { self.cycles += 2; }
            opcodes::NOP_04
            | opcodes::NOP_14
            | opcodes::NOP_34
            | opcodes::NOP_44
            | opcodes::NOP_54
            | opcodes::NOP_64
            | opcodes::NOP_74
            | opcodes::NOP_80
            | opcodes::NOP_82
            | opcodes::NOP_89
            | opcodes::NOP_C2
            | opcodes::NOP_D4
            | opcodes::NOP_E2
            | opcodes::NOP_F4 => { self.pc = self.pc.wrapping_add(1); self.cycles += 3; }
            opcodes::NOP_0C
            | opcodes::NOP_1C
            | opcodes::NOP_3C
            | opcodes::NOP_5C
            | opcodes::NOP_7C
            | opcodes::NOP_DC
            | opcodes::NOP_FC => { self.pc = self.pc.wrapping_add(2); self.cycles += 4; }

            // No wildcard arm: every one of the 256 opcodes is now handled, and
            // the compiler enforces that. A future gap becomes a build error
            // rather than a silent "+2 cycles and carry on".
        }
    }
}
