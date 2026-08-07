/*!
 * 6502 Instruction implementations with internal Bus
 *
 * This module contains Bus-aware versions of all instructions.
 * These methods eliminate WASM→JS boundary crossings by using the internal Bus directly.
 */

use crate::cpu::{CPU6502, flags};
use crate::Bus;

/// Macro to implement a simple instruction that reads from PC
macro_rules! impl_read_pc_instruction {
    ($name:ident, $cycles:expr, $pc_inc:expr, $body:expr) => {
        #[allow(unused)]
        pub(crate) fn $name(&mut self, bus: &Bus) {
            $body(self, bus);
            self.pc = self.pc.wrapping_add($pc_inc);
            self.cycles += $cycles;
        }
    };
}

impl CPU6502 {
    // ========== Internal Bus-Aware Helper Methods ==========

    /// Get address for indexed indirect mode (zero page,X) - Bus version
    pub(crate) fn get_izx_addr_bus(&mut self, bus: &Bus) -> u16 {
        let base = self.read_byte_from_bus(bus, self.pc);
        self.pc = self.pc.wrapping_add(1);
        let addr = base.wrapping_add(self.x);
        let low = self.read_byte_from_bus(bus, addr as u16) as u16;
        let high = self.read_byte_from_bus(bus, addr.wrapping_add(1) as u16) as u16;
        (high << 8) | low
    }

    /// Get address for indirect indexed mode (zero page),Y - Bus version
    pub(crate) fn get_izy_addr_bus(&mut self, bus: &Bus) -> u16 {
        let zp_addr = self.read_byte_from_bus(bus, self.pc);
        self.pc = self.pc.wrapping_add(1);
        let low = self.read_byte_from_bus(bus, zp_addr as u16) as u16;
        let high = self.read_byte_from_bus(bus, zp_addr.wrapping_add(1) as u16) as u16;
        let base_addr = (high << 8) | low;
        base_addr.wrapping_add(self.y as u16)
    }

    /// Check if page boundary was crossed for indirect indexed mode - Bus version
    pub(crate) fn check_izy_page_cross_bus(&mut self, bus: &Bus) -> bool {
        let zp_addr = bus.read(self.pc - 1);
        let low = bus.read(zp_addr as u16) as u16;
        let high = bus.read(zp_addr.wrapping_add(1) as u16) as u16;
        let base_addr = (high << 8) | low;
        let final_addr = base_addr.wrapping_add(self.y as u16);
        (base_addr & 0xFF00) != (final_addr & 0xFF00)
    }

    /// Get address for zero page,Y mode - Bus version
    pub(crate) fn get_zpy_addr_bus(&mut self, bus: &Bus) -> u16 {
        let addr = self.read_byte_from_bus(bus, self.pc).wrapping_add(self.y);
        self.pc = self.pc.wrapping_add(1);
        addr as u16
    }

    /// Read a word from zero page memory - Bus version
    pub(crate) fn read_word_zp_bus(&mut self, bus: &Bus, address: u8) -> u16 {
        let low = self.read_byte_from_bus(bus, address as u16) as u16;
        let high = self.read_byte_from_bus(bus, address.wrapping_add(1) as u16) as u16;
        (high << 8) | low
    }

    /// Push a word onto the stack - Bus version
    pub(crate) fn push_word_bus(&mut self, bus: &mut Bus, value: u16) {
        self.push_byte_to_bus(bus, (value >> 8) as u8);
        self.push_byte_to_bus(bus, value as u8);
    }

    /// Pop a word from the stack - Bus version
    pub(crate) fn pop_word_bus(&mut self, bus: &Bus) -> u16 {
        let low = self.pop_byte_from_bus(bus) as u16;
        let high = self.pop_byte_from_bus(bus) as u16;
        (high << 8) | low
    }

    /// Helper for branch instructions - Bus version
    pub(crate) fn branch_if_bus(&mut self, bus: &Bus, condition: bool) {
        let offset = self.read_byte_from_bus(bus, self.pc) as i8;
        self.pc = self.pc.wrapping_add(1);

        if condition {
            let old_pc = self.pc;
            self.pc = ((self.pc as i32) + (offset as i32)) as u16;

            // Add cycle for taken branch
            self.cycles += 1;

            // Add cycle for page boundary crossing
            if (old_pc & 0xFF00) != (self.pc & 0xFF00) {
                self.cycles += 1;
            }
        }

        self.cycles += 2;
    }

    /// Helper for compare instructions - Bus version
    pub(crate) fn compare_bus(&mut self, reg: u8, value: u8) {
        let result = (reg as u16).wrapping_sub(value as u16);
        self.set_flag(flags::CARRY, result < 0x100);
        self.update_nz(result as u8);
    }

    /// Helper for ADC instruction - Bus version
    pub(crate) fn adc_bus(&mut self, value: u8) {
        let carry = if self.get_flag(flags::CARRY) { 1 } else { 0 };
        let result = (self.a as u16) + (value as u16) + carry;

        // Check for overflow
        let overflow = ((self.a ^ result as u8) & (value ^ result as u8) & 0x80) != 0;
        self.set_flag(flags::OVERFLOW, overflow);

        if self.get_flag(flags::DECIMAL) {
            // NMOS 6502 packed BCD: A and C come from the decimal-adjusted
            // result, while N/Z/V follow the binary result computed above.
            let mut al = (self.a & 0x0F) + (value & 0x0F) + carry as u8;
            if al > 9 {
                al += 6;
            }
            let mut ah = (self.a >> 4) as u16 + (value >> 4) as u16 + if al > 15 { 1 } else { 0 };
            self.set_flag(flags::ZERO, (result as u8) == 0);
            self.set_flag(flags::NEGATIVE, (ah & 8) != 0);
            if ah > 9 {
                ah += 6;
            }
            self.set_flag(flags::CARRY, ah > 15);
            self.a = (((ah as u8) << 4) | (al & 0x0F)) as u8;
        } else {
            self.set_flag(flags::CARRY, result > 0xFF);
            self.a = result as u8;
            self.update_nz(self.a);
        }
    }

    /// Helper for SBC instruction - Bus version
    pub(crate) fn sbc_bus(&mut self, value: u8) {
        // SBC is implemented as ADC with complement
        let carry = if self.get_flag(flags::CARRY) { 0 } else { 1 };
        let result = (self.a as u16).wrapping_sub(value as u16).wrapping_sub(carry);

        // Check for overflow
        let overflow = ((self.a ^ result as u8) & ((255 - value) ^ result as u8) & 0x80) != 0;
        self.set_flag(flags::OVERFLOW, overflow);

        // Set carry (inverted for subtraction)
        self.set_flag(flags::CARRY, result < 0x100);

        if self.get_flag(flags::DECIMAL) {
            // NMOS 6502: only A is decimal-adjusted; N/Z/V/C all follow the
            // binary result already computed above.
            let a = self.a;
            let mut al = (a & 0x0F) as i16 - (value & 0x0F) as i16 - carry as i16;
            if al < 0 {
                al -= 6;
            }
            let mut ah = (a >> 4) as i16 - (value >> 4) as i16 - if al < 0 { 1 } else { 0 };
            if ah < 0 {
                ah -= 6;
            }
            self.update_nz(result as u8);
            self.a = (((ah as u8) << 4) | (al as u8 & 0x0F)) as u8;
        } else {
            self.a = result as u8;
            self.update_nz(self.a);
        }
    }

    // ================= Undocumented instructions =================
    // Parity with the TypeScript engine (DECISIONS D-013). Semantics follow
    // the NMOS 6502: each read-modify-write form performs its memory operation,
    // writes that result back, and applies the accumulator half separately.

    /// One extra cycle when an index carries into a new page (reads only —
    /// writes pay the fix-up cycle unconditionally).
    pub(crate) fn page_cross(base: u16, effective: u16) -> u64 {
        if (base & 0xFF00) != (effective & 0xFF00) { 1 } else { 0 }
    }

    /// Zero page
    pub(crate) fn ill_zp(&mut self, bus: &Bus) -> u16 {
        let a = self.read_byte_from_bus(bus, self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        a
    }
    /// Zero page,X
    pub(crate) fn ill_zpx(&mut self, bus: &Bus) -> u16 {
        let a = self.read_byte_from_bus(bus, self.pc).wrapping_add(self.x);
        self.pc = self.pc.wrapping_add(1);
        a as u16
    }
    /// Absolute
    pub(crate) fn ill_abs(&mut self, bus: &Bus) -> u16 {
        let a = self.read_word_from_bus(bus, self.pc);
        self.pc = self.pc.wrapping_add(2);
        a
    }
    /// Absolute,X
    pub(crate) fn ill_abx(&mut self, bus: &Bus) -> u16 {
        let a = self.read_word_from_bus(bus, self.pc).wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        a
    }
    /// Absolute,Y
    pub(crate) fn ill_aby(&mut self, bus: &Bus) -> u16 {
        let a = self.read_word_from_bus(bus, self.pc).wrapping_add(self.y as u16);
        self.pc = self.pc.wrapping_add(2);
        a
    }
    /// Immediate operand
    pub(crate) fn ill_imm(&mut self, bus: &Bus) -> u8 {
        let v = self.read_byte_from_bus(bus, self.pc);
        self.pc = self.pc.wrapping_add(1);
        v
    }

    /// SLO: ASL the operand, then ORA it into A.
    pub(crate) fn slo_mem(&mut self, bus: &mut Bus, addr: u16) {
        let v = self.read_byte_from_bus(bus, addr);
        self.set_flag(flags::CARRY, (v & 0x80) != 0);
        let shifted = v << 1;
        self.write_byte_to_bus(bus, addr, shifted);
        self.a |= shifted;
        self.update_nz(self.a);
    }

    /// RLA: ROL the operand, then AND it into A.
    pub(crate) fn rla_mem(&mut self, bus: &mut Bus, addr: u16) {
        let v = self.read_byte_from_bus(bus, addr);
        let carry_in = if self.get_flag(flags::CARRY) { 1 } else { 0 };
        self.set_flag(flags::CARRY, (v & 0x80) != 0);
        let rotated = (v << 1) | carry_in;
        self.write_byte_to_bus(bus, addr, rotated);
        self.a &= rotated;
        self.update_nz(self.a);
    }

    /// SRE: LSR the operand, then EOR it into A.
    pub(crate) fn sre_mem(&mut self, bus: &mut Bus, addr: u16) {
        let v = self.read_byte_from_bus(bus, addr);
        self.set_flag(flags::CARRY, (v & 0x01) != 0);
        let shifted = v >> 1;
        self.write_byte_to_bus(bus, addr, shifted);
        self.a ^= shifted;
        self.update_nz(self.a);
    }

    /// RRA: ROR the operand, then ADC it into A.
    pub(crate) fn rra_mem(&mut self, bus: &mut Bus, addr: u16) {
        let v = self.read_byte_from_bus(bus, addr);
        let carry_in = if self.get_flag(flags::CARRY) { 0x80 } else { 0 };
        self.set_flag(flags::CARRY, (v & 0x01) != 0);
        let rotated = (v >> 1) | carry_in;
        self.write_byte_to_bus(bus, addr, rotated);
        self.adc_bus(rotated);
    }

    /// DCP: DEC the operand, then CMP it against A.
    pub(crate) fn dcp_mem(&mut self, bus: &mut Bus, addr: u16) {
        let v = self.read_byte_from_bus(bus, addr).wrapping_sub(1);
        self.write_byte_to_bus(bus, addr, v);
        let result = (self.a as u16).wrapping_sub(v as u16);
        self.set_flag(flags::CARRY, self.a >= v);
        self.update_nz(result as u8);
    }

    /// ISC: INC the operand, then SBC it from A.
    pub(crate) fn isc_mem(&mut self, bus: &mut Bus, addr: u16) {
        let v = self.read_byte_from_bus(bus, addr).wrapping_add(1);
        self.write_byte_to_bus(bus, addr, v);
        self.sbc_bus(v);
    }

    /// SAX: store A AND X. Sets no flags.
    pub(crate) fn sax_mem(&mut self, bus: &mut Bus, addr: u16) {
        let v = self.a & self.x;
        self.write_byte_to_bus(bus, addr, v);
    }

    /// LAX: load A and X from the same operand.
    pub(crate) fn lax_mem(&mut self, bus: &Bus, addr: u16) {
        let v = self.read_byte_from_bus(bus, addr);
        self.a = v;
        self.x = v;
        self.update_nz(v);
    }

    /// ANC: AND immediate, then copy the resulting sign bit into carry.
    pub(crate) fn anc_imm(&mut self, bus: &Bus) {
        let v = self.ill_imm(bus);
        self.a &= v;
        self.update_nz(self.a);
        self.set_flag(flags::CARRY, (self.a & 0x80) != 0);
    }

    /// ALR: AND immediate, then LSR A.
    pub(crate) fn alr_imm(&mut self, bus: &Bus) {
        let v = self.ill_imm(bus);
        self.a &= v;
        self.set_flag(flags::CARRY, (self.a & 0x01) != 0);
        self.a >>= 1;
        self.update_nz(self.a);
    }

    /// ARR: AND immediate, then ROR A — with its own carry/overflow rules.
    /// Carry comes from pre-rotate bit 7 and overflow from pre-rotate bits 7^6,
    /// which is the same as post-rotate bit 6 and bit 6^5.
    pub(crate) fn arr_imm(&mut self, bus: &Bus) {
        let v = self.ill_imm(bus);
        let t = self.a & v;
        let carry_in: u8 = if self.get_flag(flags::CARRY) { 0x80 } else { 0 };
        self.set_flag(flags::CARRY, (t & 0x80) != 0);
        self.set_flag(flags::OVERFLOW, (((t >> 7) & 1) ^ ((t >> 6) & 1)) != 0);
        let mut result = (t >> 1) | carry_in;
        if self.get_flag(flags::DECIMAL) {
            // Matches the TypeScript engine's decimal adjustment so the two
            // stay in agreement on this opcode.
            let mut al = (t & 0x0f) + (t & 1);
            if al > 5 {
                al += 6;
            }
            let ah = ((t >> 4) & 0x0f) + ((t >> 4) & 1);
            if ah > 5 {
                al += 6;
                self.set_flag(flags::CARRY, true);
            } else {
                self.set_flag(flags::CARRY, false);
            }
            result = (ah << 4) | (al & 0x0f);
        }
        self.a = result;
        self.update_nz(result);
    }

    /// XAA/ANE: unstable on real hardware; matches the TypeScript engine.
    pub(crate) fn xaa_imm(&mut self, bus: &Bus) {
        let v = self.ill_imm(bus);
        self.a = self.x & v;
        self.update_nz(self.a);
    }

    /// AXS/SBX: X = (A AND X) - immediate.
    pub(crate) fn axs_imm(&mut self, bus: &Bus) {
        let v = self.ill_imm(bus);
        let base = self.a & self.x;
        self.set_flag(flags::CARRY, base >= v);
        self.x = base.wrapping_sub(v);
        self.update_nz(self.x);
    }

    /// AHX: store A AND X AND (high byte of address + 1).
    pub(crate) fn ahx_mem(&mut self, bus: &mut Bus, addr: u16) {
        let v = self.a & self.x & (((addr >> 8) as u8).wrapping_add(1));
        self.write_byte_to_bus(bus, addr, v);
    }

    /// SHY: store Y AND (high byte of address + 1).
    pub(crate) fn shy_mem(&mut self, bus: &mut Bus, addr: u16) {
        let v = self.y & (((addr >> 8) as u8).wrapping_add(1));
        self.write_byte_to_bus(bus, addr, v);
    }

    /// SHX: store X AND (high byte of address + 1).
    pub(crate) fn shx_mem(&mut self, bus: &mut Bus, addr: u16) {
        let v = self.x & (((addr >> 8) as u8).wrapping_add(1));
        self.write_byte_to_bus(bus, addr, v);
    }

    /// TAS: S = A AND X, then store A AND X AND (high byte + 1).
    pub(crate) fn tas_mem(&mut self, bus: &mut Bus, addr: u16) {
        self.s = self.a & self.x;
        let v = self.a & self.x & (((addr >> 8) as u8).wrapping_add(1));
        self.write_byte_to_bus(bus, addr, v);
    }

    /// LAS: A = X = S = memory AND S.
    pub(crate) fn las_mem(&mut self, bus: &Bus, addr: u16) {
        let v = self.read_byte_from_bus(bus, addr) & self.s;
        self.a = v;
        self.x = v;
        self.s = v;
        self.update_nz(v);
    }

    /// KIL/JAM: jams the processor. Rewinding PC re-executes the opcode.
    pub(crate) fn kil_bus(&mut self) {
        self.pc = self.pc.wrapping_sub(1);
    }

    /// Helper for BIT instruction - Bus version
    pub(crate) fn bit_bus(&mut self, value: u8) {
        let result = self.a & value;
        self.set_flag(flags::ZERO, result == 0);
        self.set_flag(flags::NEGATIVE, (value & 0x80) != 0);
        self.set_flag(flags::OVERFLOW, (value & 0x40) != 0);
    }

    /// Helper for ASL memory instruction - Bus version
    pub(crate) fn asl_mem_bus(&mut self, bus: &mut Bus, addr: u16) {
        let value = self.read_byte_from_bus(bus, addr);
        let result = value << 1;
        self.set_flag(flags::CARRY, (value & 0x80) != 0);
        self.write_byte_to_bus(bus, addr, result);
        self.update_nz(result);
    }

    /// Helper for LSR memory instruction - Bus version
    pub(crate) fn lsr_mem_bus(&mut self, bus: &mut Bus, addr: u16) {
        let value = self.read_byte_from_bus(bus, addr);
        self.set_flag(flags::CARRY, (value & 0x01) != 0);
        let result = value >> 1;
        self.write_byte_to_bus(bus, addr, result);
        self.update_nz(result);
    }

    /// Helper for ROL memory instruction - Bus version
    pub(crate) fn rol_mem_bus(&mut self, bus: &mut Bus, addr: u16) {
        let value = self.read_byte_from_bus(bus, addr);
        let old_carry = if self.get_flag(flags::CARRY) { 1 } else { 0 };
        self.set_flag(flags::CARRY, (value & 0x80) != 0);
        let result = (value << 1) | old_carry;
        self.write_byte_to_bus(bus, addr, result);
        self.update_nz(result);
    }

    /// Helper for ROR memory instruction - Bus version
    pub(crate) fn ror_mem_bus(&mut self, bus: &mut Bus, addr: u16) {
        let value = self.read_byte_from_bus(bus, addr);
        let old_carry = if self.get_flag(flags::CARRY) { 0x80 } else { 0 };
        self.set_flag(flags::CARRY, (value & 0x01) != 0);
        let result = (value >> 1) | old_carry;
        self.write_byte_to_bus(bus, addr, result);
        self.update_nz(result);
    }
}
