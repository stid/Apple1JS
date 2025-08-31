/*!
 * 6502 Instruction implementations
 * 
 * This module will contain all instruction implementations.
 * Starting with a minimal set for testing.
 */

use crate::cpu::{CPU6502, flags};

impl CPU6502 {
    /// LDA Immediate - Load Accumulator
    pub(crate) fn lda_imm(&mut self) {
        self.a = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        self.update_nz(self.a);
    }
    
    /// NOP - No Operation
    pub(crate) fn nop(&mut self) {
        // Just consume the cycle (already done in step)
    }
    
    /// STA Absolute - Store Accumulator
    pub(crate) fn sta_abs(&mut self) {
        let addr = self.read_word(self.pc);
        self.pc = self.pc.wrapping_add(2);
        self.write_byte(addr, self.a);
    }
}