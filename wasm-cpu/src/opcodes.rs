/*!
 * 6502 Opcode dispatch table
 * 
 * Maps opcodes to their instruction implementations
 */

use crate::CPU6502;

/// Opcode definitions
pub mod opcodes {
    pub const NOP: u8 = 0xEA;
    pub const LDA_IMM: u8 = 0xA9;
    pub const STA_ABS: u8 = 0x8D;
}

impl CPU6502 {
    /// Main instruction dispatch
    pub(crate) fn dispatch_opcode(&mut self, opcode: u8) {
        match opcode {
            opcodes::NOP => self.nop(),
            opcodes::LDA_IMM => self.lda_imm(),
            opcodes::STA_ABS => self.sta_abs(),
            _ => {
                // Unknown opcode - for now just treat as NOP
                crate::console_log!("Unknown opcode: 0x{:02X}", opcode);
                self.nop();
            }
        }
    }
}