/*!
 * Bus-aware instruction implementations
 *
 * All instructions rewritten to use internal Bus instead of JavaScript bridge.
 * This eliminates WASM→JS boundary crossings for 5-10x performance improvement.
 */

use crate::cpu::{CPU6502, flags};
use crate::Bus;

/// Generate Bus-aware instruction implementations using macros
/// This avoids duplicating 2000+ lines of nearly-identical code
macro_rules! impl_load_imm {
    ($name:ident, $reg:ident) => {
        #[inline]
        pub(crate) fn $name(&mut self, bus: &Bus) {
            self.$reg = self.read_byte_from_bus(bus, self.pc);
            self.pc = self.pc.wrapping_add(1);
            self.update_nz(self.$reg);
            self.cycles += 2;
        }
    };
}

macro_rules! impl_load_zp {
    ($name:ident, $reg:ident) => {
        #[inline]
        pub(crate) fn $name(&mut self, bus: &Bus) {
            let addr = self.read_byte_from_bus(bus, self.pc) as u16;
            self.pc = self.pc.wrapping_add(1);
            self.$reg = self.read_byte_from_bus(bus, addr);
            self.update_nz(self.$reg);
            self.cycles += 3;
        }
    };
}

macro_rules! impl_load_zpx {
    ($name:ident, $reg:ident, $index:ident) => {
        #[inline]
        pub(crate) fn $name(&mut self, bus: &Bus) {
            let addr = self.read_byte_from_bus(bus, self.pc).wrapping_add(self.$index) as u16;
            self.pc = self.pc.wrapping_add(1);
            self.$reg = self.read_byte_from_bus(bus, addr);
            self.update_nz(self.$reg);
            self.cycles += 4;
        }
    };
}

macro_rules! impl_load_abs {
    ($name:ident, $reg:ident) => {
        #[inline]
        pub(crate) fn $name(&mut self, bus: &Bus) {
            let addr = self.read_word_from_bus(bus, self.pc);
            self.pc = self.pc.wrapping_add(2);
            self.$reg = self.read_byte_from_bus(bus, addr);
            self.update_nz(self.$reg);
            self.cycles += 4;
        }
    };
}

macro_rules! impl_load_absx {
    ($name:ident, $reg:ident, $index:ident) => {
        #[inline]
        pub(crate) fn $name(&mut self, bus: &Bus) {
            let base_addr = self.read_word_from_bus(bus, self.pc);
            let addr = base_addr.wrapping_add(self.$index as u16);
            self.pc = self.pc.wrapping_add(2);
            self.$reg = self.read_byte_from_bus(bus, addr);
            self.update_nz(self.$reg);
            if (base_addr & 0xFF00) != (addr & 0xFF00) {
                self.cycles += 5;
            } else {
                self.cycles += 4;
            }
        }
    };
}

macro_rules! impl_store_zp {
    ($name:ident, $reg:ident) => {
        #[inline]
        pub(crate) fn $name(&mut self, bus: &mut Bus) {
            let addr = self.read_byte_from_bus(bus, self.pc) as u16;
            self.pc = self.pc.wrapping_add(1);
            self.write_byte_to_bus(bus, addr, self.$reg);
            self.cycles += 3;
        }
    };
}

macro_rules! impl_store_zpx {
    ($name:ident, $reg:ident, $index:ident) => {
        #[inline]
        pub(crate) fn $name(&mut self, bus: &mut Bus) {
            let addr = self.read_byte_from_bus(bus, self.pc).wrapping_add(self.$index) as u16;
            self.pc = self.pc.wrapping_add(1);
            self.write_byte_to_bus(bus, addr, self.$reg);
            self.cycles += 4;
        }
    };
}

macro_rules! impl_store_abs {
    ($name:ident, $reg:ident) => {
        #[inline]
        pub(crate) fn $name(&mut self, bus: &mut Bus) {
            let addr = self.read_word_from_bus(bus, self.pc);
            self.pc = self.pc.wrapping_add(2);
            self.write_byte_to_bus(bus, addr, self.$reg);
            self.cycles += 4;
        }
    };
}

macro_rules! impl_store_absx {
    ($name:ident, $reg:ident, $index:ident) => {
        #[inline]
        pub(crate) fn $name(&mut self, bus: &mut Bus) {
            let addr = self.read_word_from_bus(bus, self.pc).wrapping_add(self.$index as u16);
            self.pc = self.pc.wrapping_add(2);
            self.write_byte_to_bus(bus, addr, self.$reg);
            self.cycles += 5;
        }
    };
}

impl CPU6502 {
    // ========== Load Operations ==========
    impl_load_imm!(lda_imm_bus, a);
    impl_load_zp!(lda_zp_bus, a);
    impl_load_zpx!(lda_zpx_bus, a, x);
    impl_load_abs!(lda_abs_bus, a);
    impl_load_absx!(lda_absx_bus, a, x);

    #[inline]
    pub(crate) fn lda_absy_bus(&mut self, bus: &Bus) {
        let base_addr = self.read_word_from_bus(bus, self.pc);
        let addr = base_addr.wrapping_add(self.y as u16);
        self.pc = self.pc.wrapping_add(2);
        self.a = self.read_byte_from_bus(bus, addr);
        self.update_nz(self.a);
        if (base_addr & 0xFF00) != (addr & 0xFF00) {
            self.cycles += 5;
        } else {
            self.cycles += 4;
        }
    }

    #[inline]
    pub(crate) fn lda_izx_bus(&mut self, bus: &Bus) {
        let addr = self.get_izx_addr_bus(bus);
        self.a = self.read_byte_from_bus(bus, addr);
        self.update_nz(self.a);
        self.cycles += 6;
    }

    #[inline]
    pub(crate) fn lda_izy_bus(&mut self, bus: &Bus) {
        let addr = self.get_izy_addr_bus(bus);
        self.a = self.read_byte_from_bus(bus, addr);
        self.update_nz(self.a);
        if self.check_izy_page_cross_bus(bus) {
            self.cycles += 6;
        } else {
            self.cycles += 5;
        }
    }

    impl_load_imm!(ldx_imm_bus, x);
    impl_load_zp!(ldx_zp_bus, x);
    impl_load_zpx!(ldx_zpy_bus, x, y);  // Note: LDX uses ZP,Y not ZP,X
    impl_load_abs!(ldx_abs_bus, x);
    impl_load_absx!(ldx_aby_bus, x, y);  // Note: LDX uses ABS,Y not ABS,X

    impl_load_imm!(ldy_imm_bus, y);
    impl_load_zp!(ldy_zp_bus, y);
    impl_load_zpx!(ldy_zpx_bus, y, x);
    impl_load_abs!(ldy_abs_bus, y);
    impl_load_absx!(ldy_abx_bus, y, x);

    // ========== Store Operations ==========
    impl_store_zp!(sta_zp_bus, a);
    impl_store_zpx!(sta_zpx_bus, a, x);
    impl_store_abs!(sta_abs_bus, a);
    impl_store_absx!(sta_absx_bus, a, x);

    #[inline]
    pub(crate) fn sta_absy_bus(&mut self, bus: &mut Bus) {
        let addr = self.read_word_from_bus(bus, self.pc).wrapping_add(self.y as u16);
        self.pc = self.pc.wrapping_add(2);
        self.write_byte_to_bus(bus, addr, self.a);
        self.cycles += 5;
    }

    #[inline]
    pub(crate) fn sta_izx_bus(&mut self, bus: &mut Bus) {
        let addr = self.get_izx_addr_bus(bus);
        self.write_byte_to_bus(bus, addr, self.a);
        self.cycles += 6;
    }

    #[inline]
    pub(crate) fn sta_izy_bus(&mut self, bus: &mut Bus) {
        let addr = self.get_izy_addr_bus(bus);
        self.write_byte_to_bus(bus, addr, self.a);
        self.cycles += 6;
    }

    impl_store_zp!(stx_zp_bus, x);
    impl_store_zpx!(stx_zpy_bus, x, y);  // Note: STX uses ZP,Y
    impl_store_abs!(stx_abs_bus, x);

    impl_store_zp!(sty_zp_bus, y);
    impl_store_zpx!(sty_zpx_bus, y, x);
    impl_store_abs!(sty_abs_bus, y);

    // ========== Transfer Operations (no memory access) ==========
    #[inline]
    pub(crate) fn tax_bus(&mut self) {
        self.x = self.a;
        self.update_nz(self.x);
        self.cycles += 2;
    }

    #[inline]
    pub(crate) fn tay_bus(&mut self) {
        self.y = self.a;
        self.update_nz(self.y);
        self.cycles += 2;
    }

    #[inline]
    pub(crate) fn txa_bus(&mut self) {
        self.a = self.x;
        self.update_nz(self.a);
        self.cycles += 2;
    }

    #[inline]
    pub(crate) fn tya_bus(&mut self) {
        self.a = self.y;
        self.update_nz(self.a);
        self.cycles += 2;
    }

    #[inline]
    pub(crate) fn tsx_bus(&mut self) {
        self.x = self.s;
        self.update_nz(self.x);
        self.cycles += 2;
    }

    #[inline]
    pub(crate) fn txs_bus(&mut self) {
        self.s = self.x;
        self.cycles += 2;
    }

    // ========== Stack Operations ==========
    #[inline]
    pub(crate) fn pha_bus(&mut self, bus: &mut Bus) {
        self.push_byte_to_bus(bus, self.a);
        self.cycles += 3;
    }

    #[inline]
    pub(crate) fn pla_bus(&mut self, bus: &Bus) {
        self.a = self.pop_byte_from_bus(bus);
        self.update_nz(self.a);
        self.cycles += 4;
    }

    #[inline]
    pub(crate) fn php_bus(&mut self, bus: &mut Bus) {
        let status = self.get_status() | flags::BREAK | flags::UNUSED;
        self.push_byte_to_bus(bus, status);
        self.cycles += 3;
    }

    #[inline]
    pub(crate) fn plp_bus(&mut self, bus: &Bus) {
        let status = self.pop_byte_from_bus(bus);
        self.set_status(status);
        self.cycles += 4;
    }

    // ========== Branch Operations ==========
    #[inline]
    pub(crate) fn bne_bus(&mut self, bus: &Bus) {
        self.branch_if_bus(bus, !self.get_flag(flags::ZERO));
    }

    #[inline]
    pub(crate) fn beq_bus(&mut self, bus: &Bus) {
        self.branch_if_bus(bus, self.get_flag(flags::ZERO));
    }

    #[inline]
    pub(crate) fn bcc_bus(&mut self, bus: &Bus) {
        self.branch_if_bus(bus, !self.get_flag(flags::CARRY));
    }

    #[inline]
    pub(crate) fn bcs_bus(&mut self, bus: &Bus) {
        self.branch_if_bus(bus, self.get_flag(flags::CARRY));
    }

    #[inline]
    pub(crate) fn bpl_bus(&mut self, bus: &Bus) {
        self.branch_if_bus(bus, !self.get_flag(flags::NEGATIVE));
    }

    #[inline]
    pub(crate) fn bmi_bus(&mut self, bus: &Bus) {
        self.branch_if_bus(bus, self.get_flag(flags::NEGATIVE));
    }

    #[inline]
    pub(crate) fn bvc_bus(&mut self, bus: &Bus) {
        self.branch_if_bus(bus, !self.get_flag(flags::OVERFLOW));
    }

    #[inline]
    pub(crate) fn bvs_bus(&mut self, bus: &Bus) {
        self.branch_if_bus(bus, self.get_flag(flags::OVERFLOW));
    }

    // ========== Jump/Call Operations ==========
    #[inline]
    pub(crate) fn jmp_abs_bus(&mut self, bus: &Bus) {
        self.pc = self.read_word_from_bus(bus, self.pc);
        self.cycles += 3;
    }

    #[inline]
    pub(crate) fn jmp_ind_bus(&mut self, bus: &Bus) {
        let addr = self.read_word_from_bus(bus, self.pc);
        // 6502 bug: if low byte is 0xFF, high byte wraps within page
        if (addr & 0xFF) == 0xFF {
            let low = self.read_byte_from_bus(bus, addr);
            let high = self.read_byte_from_bus(bus, addr & 0xFF00);
            self.pc = ((high as u16) << 8) | (low as u16);
        } else {
            self.pc = self.read_word_from_bus(bus, addr);
        }
        self.cycles += 5;
    }

    #[inline]
    pub(crate) fn jsr_bus(&mut self, bus: &mut Bus) {
        let target = self.read_word_from_bus(bus, self.pc);
        self.pc = self.pc.wrapping_add(1);
        self.push_word_bus(bus, self.pc);
        self.pc = target;
        self.cycles += 6;
    }

    #[inline]
    pub(crate) fn rts_bus(&mut self, bus: &Bus) {
        self.pc = self.pop_word_bus(bus).wrapping_add(1);
        self.cycles += 6;
    }

    #[inline]
    pub(crate) fn rti_bus(&mut self, bus: &Bus) {
        let status = self.pop_byte_from_bus(bus);
        self.set_status(status);
        self.pc = self.pop_word_bus(bus);
        self.cycles += 6;
    }

    // ========== System Operations ==========
    #[inline]
    pub(crate) fn brk_bus(&mut self, bus: &mut Bus) {
        self.pc = self.pc.wrapping_add(1);
        self.push_word_bus(bus, self.pc);
        self.push_byte_to_bus(bus, self.get_status() | flags::BREAK | flags::UNUSED);
        self.set_flag(flags::INTERRUPT, true);
        self.pc = self.read_word_from_bus(bus, 0xFFFE);
        self.cycles += 7;
    }

    #[inline]
    pub(crate) fn nop_bus(&mut self) {
        self.cycles += 2;
    }

    // ========== Flag Operations ==========
    #[inline]
    pub(crate) fn clc_bus(&mut self) {
        self.set_flag(flags::CARRY, false);
        self.cycles += 2;
    }

    #[inline]
    pub(crate) fn sec_bus(&mut self) {
        self.set_flag(flags::CARRY, true);
        self.cycles += 2;
    }

    #[inline]
    pub(crate) fn cli_bus(&mut self) {
        self.set_flag(flags::INTERRUPT, false);
        self.cycles += 2;
    }

    #[inline]
    pub(crate) fn sei_bus(&mut self) {
        self.set_flag(flags::INTERRUPT, true);
        self.cycles += 2;
    }

    #[inline]
    pub(crate) fn clv_bus(&mut self) {
        self.set_flag(flags::OVERFLOW, false);
        self.cycles += 2;
    }

    #[inline]
    pub(crate) fn cld_bus(&mut self) {
        self.set_flag(flags::DECIMAL, false);
        self.cycles += 2;
    }

    #[inline]
    pub(crate) fn sed_bus(&mut self) {
        self.set_flag(flags::DECIMAL, true);
        self.cycles += 2;
    }

    // ========== Increment/Decrement ==========
    #[inline]
    pub(crate) fn inx_bus(&mut self) {
        self.x = self.x.wrapping_add(1);
        self.update_nz(self.x);
        self.cycles += 2;
    }

    #[inline]
    pub(crate) fn iny_bus(&mut self) {
        self.y = self.y.wrapping_add(1);
        self.update_nz(self.y);
        self.cycles += 2;
    }

    #[inline]
    pub(crate) fn dex_bus(&mut self) {
        self.x = self.x.wrapping_sub(1);
        self.update_nz(self.x);
        self.cycles += 2;
    }

    #[inline]
    pub(crate) fn dey_bus(&mut self) {
        self.y = self.y.wrapping_sub(1);
        self.update_nz(self.y);
        self.cycles += 2;
    }

    #[inline]
    pub(crate) fn inc_zp_bus(&mut self, bus: &mut Bus) {
        let addr = self.read_byte_from_bus(bus, self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        let value = self.read_byte_from_bus(bus, addr).wrapping_add(1);
        self.write_byte_to_bus(bus, addr, value);
        self.update_nz(value);
        self.cycles += 5;
    }

    #[inline]
    pub(crate) fn inc_zpx_bus(&mut self, bus: &mut Bus) {
        let addr = self.read_byte_from_bus(bus, self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
        let value = self.read_byte_from_bus(bus, addr).wrapping_add(1);
        self.write_byte_to_bus(bus, addr, value);
        self.update_nz(value);
        self.cycles += 6;
    }

    #[inline]
    pub(crate) fn inc_abs_bus(&mut self, bus: &mut Bus) {
        let addr = self.read_word_from_bus(bus, self.pc);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte_from_bus(bus, addr).wrapping_add(1);
        self.write_byte_to_bus(bus, addr, value);
        self.update_nz(value);
        self.cycles += 6;
    }

    #[inline]
    pub(crate) fn inc_absx_bus(&mut self, bus: &mut Bus) {
        let addr = self.read_word_from_bus(bus, self.pc).wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte_from_bus(bus, addr).wrapping_add(1);
        self.write_byte_to_bus(bus, addr, value);
        self.update_nz(value);
        self.cycles += 7;
    }

    #[inline]
    pub(crate) fn dec_zp_bus(&mut self, bus: &mut Bus) {
        let addr = self.read_byte_from_bus(bus, self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        let value = self.read_byte_from_bus(bus, addr).wrapping_sub(1);
        self.write_byte_to_bus(bus, addr, value);
        self.update_nz(value);
        self.cycles += 5;
    }

    #[inline]
    pub(crate) fn dec_zpx_bus(&mut self, bus: &mut Bus) {
        let addr = self.read_byte_from_bus(bus, self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
        let value = self.read_byte_from_bus(bus, addr).wrapping_sub(1);
        self.write_byte_to_bus(bus, addr, value);
        self.update_nz(value);
        self.cycles += 6;
    }

    #[inline]
    pub(crate) fn dec_abs_bus(&mut self, bus: &mut Bus) {
        let addr = self.read_word_from_bus(bus, self.pc);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte_from_bus(bus, addr).wrapping_sub(1);
        self.write_byte_to_bus(bus, addr, value);
        self.update_nz(value);
        self.cycles += 6;
    }

    #[inline]
    pub(crate) fn dec_absx_bus(&mut self, bus: &mut Bus) {
        let addr = self.read_word_from_bus(bus, self.pc).wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte_from_bus(bus, addr).wrapping_sub(1);
        self.write_byte_to_bus(bus, addr, value);
        self.update_nz(value);
        self.cycles += 7;
    }

    // ========== Compare Operations ==========

    // CMP - Compare Accumulator
    #[inline]
    pub(crate) fn cmp_imm_bus(&mut self, bus: &Bus) {
        let value = self.read_byte_from_bus(bus, self.pc);
        self.pc = self.pc.wrapping_add(1);
        self.compare_bus(self.a, value);
        self.cycles += 2;
    }

    #[inline]
    pub(crate) fn cmp_zp_bus(&mut self, bus: &Bus) {
        let addr = self.read_byte_from_bus(bus, self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        let value = self.read_byte_from_bus(bus, addr);
        self.compare_bus(self.a, value);
        self.cycles += 3;
    }

    #[inline]
    pub(crate) fn cmp_zpx_bus(&mut self, bus: &Bus) {
        let addr = self.read_byte_from_bus(bus, self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
        let value = self.read_byte_from_bus(bus, addr);
        self.compare_bus(self.a, value);
        self.cycles += 4;
    }

    #[inline]
    pub(crate) fn cmp_abs_bus(&mut self, bus: &Bus) {
        let addr = self.read_word_from_bus(bus, self.pc);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte_from_bus(bus, addr);
        self.compare_bus(self.a, value);
        self.cycles += 4;
    }

    #[inline]
    pub(crate) fn cmp_absx_bus(&mut self, bus: &Bus) {
        let base_addr = self.read_word_from_bus(bus, self.pc);
        let addr = base_addr.wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte_from_bus(bus, addr);
        self.compare_bus(self.a, value);
        if (base_addr & 0xFF00) != (addr & 0xFF00) {
            self.cycles += 5;
        } else {
            self.cycles += 4;
        }
    }

    #[inline]
    pub(crate) fn cmp_absy_bus(&mut self, bus: &Bus) {
        let base_addr = self.read_word_from_bus(bus, self.pc);
        let addr = base_addr.wrapping_add(self.y as u16);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte_from_bus(bus, addr);
        self.compare_bus(self.a, value);
        if (base_addr & 0xFF00) != (addr & 0xFF00) {
            self.cycles += 5;
        } else {
            self.cycles += 4;
        }
    }

    #[inline]
    pub(crate) fn cmp_izx_bus(&mut self, bus: &Bus) {
        let addr = self.get_izx_addr_bus(bus);
        let value = self.read_byte_from_bus(bus, addr);
        self.compare_bus(self.a, value);
        self.cycles += 6;
    }

    #[inline]
    pub(crate) fn cmp_izy_bus(&mut self, bus: &Bus) {
        let addr = self.get_izy_addr_bus(bus);
        let value = self.read_byte_from_bus(bus, addr);
        self.compare_bus(self.a, value);
        if self.check_izy_page_cross_bus(bus) {
            self.cycles += 6;
        } else {
            self.cycles += 5;
        }
    }

    // CPX - Compare X Register
    #[inline]
    pub(crate) fn cpx_imm_bus(&mut self, bus: &Bus) {
        let value = self.read_byte_from_bus(bus, self.pc);
        self.pc = self.pc.wrapping_add(1);
        self.compare_bus(self.x, value);
        self.cycles += 2;
    }

    #[inline]
    pub(crate) fn cpx_zp_bus(&mut self, bus: &Bus) {
        let addr = self.read_byte_from_bus(bus, self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        let value = self.read_byte_from_bus(bus, addr);
        self.compare_bus(self.x, value);
        self.cycles += 3;
    }

    #[inline]
    pub(crate) fn cpx_abs_bus(&mut self, bus: &Bus) {
        let addr = self.read_word_from_bus(bus, self.pc);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte_from_bus(bus, addr);
        self.compare_bus(self.x, value);
        self.cycles += 4;
    }

    // CPY - Compare Y Register
    #[inline]
    pub(crate) fn cpy_imm_bus(&mut self, bus: &Bus) {
        let value = self.read_byte_from_bus(bus, self.pc);
        self.pc = self.pc.wrapping_add(1);
        self.compare_bus(self.y, value);
        self.cycles += 2;
    }

    #[inline]
    pub(crate) fn cpy_zp_bus(&mut self, bus: &Bus) {
        let addr = self.read_byte_from_bus(bus, self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        let value = self.read_byte_from_bus(bus, addr);
        self.compare_bus(self.y, value);
        self.cycles += 3;
    }

    #[inline]
    pub(crate) fn cpy_abs_bus(&mut self, bus: &Bus) {
        let addr = self.read_word_from_bus(bus, self.pc);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte_from_bus(bus, addr);
        self.compare_bus(self.y, value);
        self.cycles += 4;
    }

    // ========== Arithmetic Operations ==========

    // ADC - Add with Carry
    #[inline]
    pub(crate) fn adc_imm_bus(&mut self, bus: &Bus) {
        let value = self.read_byte_from_bus(bus, self.pc);
        self.pc = self.pc.wrapping_add(1);
        self.adc_bus(value);
        self.cycles += 2;
    }

    #[inline]
    pub(crate) fn adc_zp_bus(&mut self, bus: &Bus) {
        let addr = self.read_byte_from_bus(bus, self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        let value = self.read_byte_from_bus(bus, addr);
        self.adc_bus(value);
        self.cycles += 3;
    }

    #[inline]
    pub(crate) fn adc_zpx_bus(&mut self, bus: &Bus) {
        let addr = self.read_byte_from_bus(bus, self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
        let value = self.read_byte_from_bus(bus, addr);
        self.adc_bus(value);
        self.cycles += 4;
    }

    #[inline]
    pub(crate) fn adc_abs_bus(&mut self, bus: &Bus) {
        let addr = self.read_word_from_bus(bus, self.pc);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte_from_bus(bus, addr);
        self.adc_bus(value);
        self.cycles += 4;
    }

    #[inline]
    pub(crate) fn adc_absx_bus(&mut self, bus: &Bus) {
        let base_addr = self.read_word_from_bus(bus, self.pc);
        let addr = base_addr.wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte_from_bus(bus, addr);
        self.adc_bus(value);
        if (base_addr & 0xFF00) != (addr & 0xFF00) {
            self.cycles += 5;
        } else {
            self.cycles += 4;
        }
    }

    #[inline]
    pub(crate) fn adc_absy_bus(&mut self, bus: &Bus) {
        let base_addr = self.read_word_from_bus(bus, self.pc);
        let addr = base_addr.wrapping_add(self.y as u16);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte_from_bus(bus, addr);
        self.adc_bus(value);
        if (base_addr & 0xFF00) != (addr & 0xFF00) {
            self.cycles += 5;
        } else {
            self.cycles += 4;
        }
    }

    #[inline]
    pub(crate) fn adc_izx_bus(&mut self, bus: &Bus) {
        let addr = self.get_izx_addr_bus(bus);
        let value = self.read_byte_from_bus(bus, addr);
        self.adc_bus(value);
        self.cycles += 6;
    }

    #[inline]
    pub(crate) fn adc_izy_bus(&mut self, bus: &Bus) {
        let addr = self.get_izy_addr_bus(bus);
        let value = self.read_byte_from_bus(bus, addr);
        self.adc_bus(value);
        if self.check_izy_page_cross_bus(bus) {
            self.cycles += 6;
        } else {
            self.cycles += 5;
        }
    }

    // SBC - Subtract with Carry
    #[inline]
    pub(crate) fn sbc_imm_bus(&mut self, bus: &Bus) {
        let value = self.read_byte_from_bus(bus, self.pc);
        self.pc = self.pc.wrapping_add(1);
        self.sbc_bus(value);
        self.cycles += 2;
    }

    #[inline]
    pub(crate) fn sbc_zp_bus(&mut self, bus: &Bus) {
        let addr = self.read_byte_from_bus(bus, self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        let value = self.read_byte_from_bus(bus, addr);
        self.sbc_bus(value);
        self.cycles += 3;
    }

    #[inline]
    pub(crate) fn sbc_zpx_bus(&mut self, bus: &Bus) {
        let addr = self.read_byte_from_bus(bus, self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
        let value = self.read_byte_from_bus(bus, addr);
        self.sbc_bus(value);
        self.cycles += 4;
    }

    #[inline]
    pub(crate) fn sbc_abs_bus(&mut self, bus: &Bus) {
        let addr = self.read_word_from_bus(bus, self.pc);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte_from_bus(bus, addr);
        self.sbc_bus(value);
        self.cycles += 4;
    }

    #[inline]
    pub(crate) fn sbc_absx_bus(&mut self, bus: &Bus) {
        let base_addr = self.read_word_from_bus(bus, self.pc);
        let addr = base_addr.wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte_from_bus(bus, addr);
        self.sbc_bus(value);
        if (base_addr & 0xFF00) != (addr & 0xFF00) {
            self.cycles += 5;
        } else {
            self.cycles += 4;
        }
    }

    #[inline]
    pub(crate) fn sbc_absy_bus(&mut self, bus: &Bus) {
        let base_addr = self.read_word_from_bus(bus, self.pc);
        let addr = base_addr.wrapping_add(self.y as u16);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte_from_bus(bus, addr);
        self.sbc_bus(value);
        if (base_addr & 0xFF00) != (addr & 0xFF00) {
            self.cycles += 5;
        } else {
            self.cycles += 4;
        }
    }

    #[inline]
    pub(crate) fn sbc_izx_bus(&mut self, bus: &Bus) {
        let addr = self.get_izx_addr_bus(bus);
        let value = self.read_byte_from_bus(bus, addr);
        self.sbc_bus(value);
        self.cycles += 6;
    }

    #[inline]
    pub(crate) fn sbc_izy_bus(&mut self, bus: &Bus) {
        let addr = self.get_izy_addr_bus(bus);
        let value = self.read_byte_from_bus(bus, addr);
        self.sbc_bus(value);
        if self.check_izy_page_cross_bus(bus) {
            self.cycles += 6;
        } else {
            self.cycles += 5;
        }
    }

    // ========== Logical Operations ==========

    // AND - Logical AND
    #[inline]
    pub(crate) fn and_imm_bus(&mut self, bus: &Bus) {
        let value = self.read_byte_from_bus(bus, self.pc);
        self.pc = self.pc.wrapping_add(1);
        self.a &= value;
        self.update_nz(self.a);
        self.cycles += 2;
    }

    #[inline]
    pub(crate) fn and_zp_bus(&mut self, bus: &Bus) {
        let addr = self.read_byte_from_bus(bus, self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        let value = self.read_byte_from_bus(bus, addr);
        self.a &= value;
        self.update_nz(self.a);
        self.cycles += 3;
    }

    #[inline]
    pub(crate) fn and_zpx_bus(&mut self, bus: &Bus) {
        let addr = self.read_byte_from_bus(bus, self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
        let value = self.read_byte_from_bus(bus, addr);
        self.a &= value;
        self.update_nz(self.a);
        self.cycles += 4;
    }

    #[inline]
    pub(crate) fn and_abs_bus(&mut self, bus: &Bus) {
        let addr = self.read_word_from_bus(bus, self.pc);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte_from_bus(bus, addr);
        self.a &= value;
        self.update_nz(self.a);
        self.cycles += 4;
    }

    #[inline]
    pub(crate) fn and_absx_bus(&mut self, bus: &Bus) {
        let base_addr = self.read_word_from_bus(bus, self.pc);
        let addr = base_addr.wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte_from_bus(bus, addr);
        self.a &= value;
        self.update_nz(self.a);
        if (base_addr & 0xFF00) != (addr & 0xFF00) {
            self.cycles += 5;
        } else {
            self.cycles += 4;
        }
    }

    #[inline]
    pub(crate) fn and_absy_bus(&mut self, bus: &Bus) {
        let base_addr = self.read_word_from_bus(bus, self.pc);
        let addr = base_addr.wrapping_add(self.y as u16);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte_from_bus(bus, addr);
        self.a &= value;
        self.update_nz(self.a);
        if (base_addr & 0xFF00) != (addr & 0xFF00) {
            self.cycles += 5;
        } else {
            self.cycles += 4;
        }
    }

    #[inline]
    pub(crate) fn and_izx_bus(&mut self, bus: &Bus) {
        let addr = self.get_izx_addr_bus(bus);
        let value = self.read_byte_from_bus(bus, addr);
        self.a &= value;
        self.update_nz(self.a);
        self.cycles += 6;
    }

    #[inline]
    pub(crate) fn and_izy_bus(&mut self, bus: &Bus) {
        let addr = self.get_izy_addr_bus(bus);
        let value = self.read_byte_from_bus(bus, addr);
        self.a &= value;
        self.update_nz(self.a);
        if self.check_izy_page_cross_bus(bus) {
            self.cycles += 6;
        } else {
            self.cycles += 5;
        }
    }

    // ORA - Logical OR
    #[inline]
    pub(crate) fn ora_imm_bus(&mut self, bus: &Bus) {
        let value = self.read_byte_from_bus(bus, self.pc);
        self.pc = self.pc.wrapping_add(1);
        self.a |= value;
        self.update_nz(self.a);
        self.cycles += 2;
    }

    #[inline]
    pub(crate) fn ora_zp_bus(&mut self, bus: &Bus) {
        let addr = self.read_byte_from_bus(bus, self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        let value = self.read_byte_from_bus(bus, addr);
        self.a |= value;
        self.update_nz(self.a);
        self.cycles += 3;
    }

    #[inline]
    pub(crate) fn ora_zpx_bus(&mut self, bus: &Bus) {
        let addr = self.read_byte_from_bus(bus, self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
        let value = self.read_byte_from_bus(bus, addr);
        self.a |= value;
        self.update_nz(self.a);
        self.cycles += 4;
    }

    #[inline]
    pub(crate) fn ora_abs_bus(&mut self, bus: &Bus) {
        let addr = self.read_word_from_bus(bus, self.pc);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte_from_bus(bus, addr);
        self.a |= value;
        self.update_nz(self.a);
        self.cycles += 4;
    }

    #[inline]
    pub(crate) fn ora_absx_bus(&mut self, bus: &Bus) {
        let base_addr = self.read_word_from_bus(bus, self.pc);
        let addr = base_addr.wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte_from_bus(bus, addr);
        self.a |= value;
        self.update_nz(self.a);
        if (base_addr & 0xFF00) != (addr & 0xFF00) {
            self.cycles += 5;
        } else {
            self.cycles += 4;
        }
    }

    #[inline]
    pub(crate) fn ora_absy_bus(&mut self, bus: &Bus) {
        let base_addr = self.read_word_from_bus(bus, self.pc);
        let addr = base_addr.wrapping_add(self.y as u16);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte_from_bus(bus, addr);
        self.a |= value;
        self.update_nz(self.a);
        if (base_addr & 0xFF00) != (addr & 0xFF00) {
            self.cycles += 5;
        } else {
            self.cycles += 4;
        }
    }

    #[inline]
    pub(crate) fn ora_izx_bus(&mut self, bus: &Bus) {
        let addr = self.get_izx_addr_bus(bus);
        let value = self.read_byte_from_bus(bus, addr);
        self.a |= value;
        self.update_nz(self.a);
        self.cycles += 6;
    }

    #[inline]
    pub(crate) fn ora_izy_bus(&mut self, bus: &Bus) {
        let addr = self.get_izy_addr_bus(bus);
        let value = self.read_byte_from_bus(bus, addr);
        self.a |= value;
        self.update_nz(self.a);
        if self.check_izy_page_cross_bus(bus) {
            self.cycles += 6;
        } else {
            self.cycles += 5;
        }
    }

    // EOR - Logical Exclusive OR
    #[inline]
    pub(crate) fn eor_imm_bus(&mut self, bus: &Bus) {
        let value = self.read_byte_from_bus(bus, self.pc);
        self.pc = self.pc.wrapping_add(1);
        self.a ^= value;
        self.update_nz(self.a);
        self.cycles += 2;
    }

    #[inline]
    pub(crate) fn eor_zp_bus(&mut self, bus: &Bus) {
        let addr = self.read_byte_from_bus(bus, self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        let value = self.read_byte_from_bus(bus, addr);
        self.a ^= value;
        self.update_nz(self.a);
        self.cycles += 3;
    }

    #[inline]
    pub(crate) fn eor_zpx_bus(&mut self, bus: &Bus) {
        let addr = self.read_byte_from_bus(bus, self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
        let value = self.read_byte_from_bus(bus, addr);
        self.a ^= value;
        self.update_nz(self.a);
        self.cycles += 4;
    }

    #[inline]
    pub(crate) fn eor_abs_bus(&mut self, bus: &Bus) {
        let addr = self.read_word_from_bus(bus, self.pc);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte_from_bus(bus, addr);
        self.a ^= value;
        self.update_nz(self.a);
        self.cycles += 4;
    }

    #[inline]
    pub(crate) fn eor_absx_bus(&mut self, bus: &Bus) {
        let base_addr = self.read_word_from_bus(bus, self.pc);
        let addr = base_addr.wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte_from_bus(bus, addr);
        self.a ^= value;
        self.update_nz(self.a);
        if (base_addr & 0xFF00) != (addr & 0xFF00) {
            self.cycles += 5;
        } else {
            self.cycles += 4;
        }
    }

    #[inline]
    pub(crate) fn eor_absy_bus(&mut self, bus: &Bus) {
        let base_addr = self.read_word_from_bus(bus, self.pc);
        let addr = base_addr.wrapping_add(self.y as u16);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte_from_bus(bus, addr);
        self.a ^= value;
        self.update_nz(self.a);
        if (base_addr & 0xFF00) != (addr & 0xFF00) {
            self.cycles += 5;
        } else {
            self.cycles += 4;
        }
    }

    #[inline]
    pub(crate) fn eor_izx_bus(&mut self, bus: &Bus) {
        let addr = self.get_izx_addr_bus(bus);
        let value = self.read_byte_from_bus(bus, addr);
        self.a ^= value;
        self.update_nz(self.a);
        self.cycles += 6;
    }

    #[inline]
    pub(crate) fn eor_izy_bus(&mut self, bus: &Bus) {
        let addr = self.get_izy_addr_bus(bus);
        let value = self.read_byte_from_bus(bus, addr);
        self.a ^= value;
        self.update_nz(self.a);
        if self.check_izy_page_cross_bus(bus) {
            self.cycles += 6;
        } else {
            self.cycles += 5;
        }
    }

    // ========== Bit Operations ==========

    #[inline]
    pub(crate) fn bit_zp_bus(&mut self, bus: &Bus) {
        let addr = self.read_byte_from_bus(bus, self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        let value = self.read_byte_from_bus(bus, addr);
        self.bit_bus(value);
        self.cycles += 3;
    }

    #[inline]
    pub(crate) fn bit_abs_bus(&mut self, bus: &Bus) {
        let addr = self.read_word_from_bus(bus, self.pc);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte_from_bus(bus, addr);
        self.bit_bus(value);
        self.cycles += 4;
    }

    // ========== Shift and Rotate Operations ==========

    // ASL - Arithmetic Shift Left
    #[inline]
    pub(crate) fn asla_bus(&mut self) {
        self.set_flag(flags::CARRY, (self.a & 0x80) != 0);
        self.a <<= 1;
        self.update_nz(self.a);
        self.cycles += 2;
    }

    #[inline]
    pub(crate) fn asl_zp_bus(&mut self, bus: &mut Bus) {
        let addr = self.read_byte_from_bus(bus, self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.asl_mem_bus(bus, addr);
        self.cycles += 5;
    }

    #[inline]
    pub(crate) fn asl_zpx_bus(&mut self, bus: &mut Bus) {
        let addr = self.read_byte_from_bus(bus, self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.asl_mem_bus(bus, addr);
        self.cycles += 6;
    }

    #[inline]
    pub(crate) fn asl_abs_bus(&mut self, bus: &mut Bus) {
        let addr = self.read_word_from_bus(bus, self.pc);
        self.pc = self.pc.wrapping_add(2);
        self.asl_mem_bus(bus, addr);
        self.cycles += 6;
    }

    #[inline]
    pub(crate) fn asl_absx_bus(&mut self, bus: &mut Bus) {
        let addr = self.read_word_from_bus(bus, self.pc).wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        self.asl_mem_bus(bus, addr);
        self.cycles += 7;
    }

    // LSR - Logical Shift Right
    #[inline]
    pub(crate) fn lsra_bus(&mut self) {
        self.set_flag(flags::CARRY, (self.a & 0x01) != 0);
        self.a >>= 1;
        self.update_nz(self.a);
        self.cycles += 2;
    }

    #[inline]
    pub(crate) fn lsr_zp_bus(&mut self, bus: &mut Bus) {
        let addr = self.read_byte_from_bus(bus, self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.lsr_mem_bus(bus, addr);
        self.cycles += 5;
    }

    #[inline]
    pub(crate) fn lsr_zpx_bus(&mut self, bus: &mut Bus) {
        let addr = self.read_byte_from_bus(bus, self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.lsr_mem_bus(bus, addr);
        self.cycles += 6;
    }

    #[inline]
    pub(crate) fn lsr_abs_bus(&mut self, bus: &mut Bus) {
        let addr = self.read_word_from_bus(bus, self.pc);
        self.pc = self.pc.wrapping_add(2);
        self.lsr_mem_bus(bus, addr);
        self.cycles += 6;
    }

    #[inline]
    pub(crate) fn lsr_absx_bus(&mut self, bus: &mut Bus) {
        let addr = self.read_word_from_bus(bus, self.pc).wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        self.lsr_mem_bus(bus, addr);
        self.cycles += 7;
    }

    // ROL - Rotate Left
    #[inline]
    pub(crate) fn rola_bus(&mut self) {
        let old_carry = if self.get_flag(flags::CARRY) { 1 } else { 0 };
        self.set_flag(flags::CARRY, (self.a & 0x80) != 0);
        self.a = (self.a << 1) | old_carry;
        self.update_nz(self.a);
        self.cycles += 2;
    }

    #[inline]
    pub(crate) fn rol_zp_bus(&mut self, bus: &mut Bus) {
        let addr = self.read_byte_from_bus(bus, self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.rol_mem_bus(bus, addr);
        self.cycles += 5;
    }

    #[inline]
    pub(crate) fn rol_zpx_bus(&mut self, bus: &mut Bus) {
        let addr = self.read_byte_from_bus(bus, self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.rol_mem_bus(bus, addr);
        self.cycles += 6;
    }

    #[inline]
    pub(crate) fn rol_abs_bus(&mut self, bus: &mut Bus) {
        let addr = self.read_word_from_bus(bus, self.pc);
        self.pc = self.pc.wrapping_add(2);
        self.rol_mem_bus(bus, addr);
        self.cycles += 6;
    }

    #[inline]
    pub(crate) fn rol_absx_bus(&mut self, bus: &mut Bus) {
        let addr = self.read_word_from_bus(bus, self.pc).wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        self.rol_mem_bus(bus, addr);
        self.cycles += 7;
    }

    // ROR - Rotate Right
    #[inline]
    pub(crate) fn rora_bus(&mut self) {
        let old_carry = if self.get_flag(flags::CARRY) { 0x80 } else { 0 };
        self.set_flag(flags::CARRY, (self.a & 0x01) != 0);
        self.a = (self.a >> 1) | old_carry;
        self.update_nz(self.a);
        self.cycles += 2;
    }

    #[inline]
    pub(crate) fn ror_zp_bus(&mut self, bus: &mut Bus) {
        let addr = self.read_byte_from_bus(bus, self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.ror_mem_bus(bus, addr);
        self.cycles += 5;
    }

    #[inline]
    pub(crate) fn ror_zpx_bus(&mut self, bus: &mut Bus) {
        let addr = self.read_byte_from_bus(bus, self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.ror_mem_bus(bus, addr);
        self.cycles += 6;
    }

    #[inline]
    pub(crate) fn ror_abs_bus(&mut self, bus: &mut Bus) {
        let addr = self.read_word_from_bus(bus, self.pc);
        self.pc = self.pc.wrapping_add(2);
        self.ror_mem_bus(bus, addr);
        self.cycles += 6;
    }

    #[inline]
    pub(crate) fn ror_absx_bus(&mut self, bus: &mut Bus) {
        let addr = self.read_word_from_bus(bus, self.pc).wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        self.ror_mem_bus(bus, addr);
        self.cycles += 7;
    }
}
