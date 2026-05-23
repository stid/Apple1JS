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

        // Set carry
        self.set_flag(flags::CARRY, result > 0xFF);

        // Store result
        self.a = result as u8;
        self.update_nz(self.a);
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

        // Store result
        self.a = result as u8;
        self.update_nz(self.a);
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
