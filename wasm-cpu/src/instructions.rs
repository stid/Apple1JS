/*!
 * 6502 Instruction implementations
 * 
 * This module contains all instruction implementations for the 6502 CPU.
 * Instructions are organized by category for clarity.
 */

use crate::cpu::{CPU6502, flags};

impl CPU6502 {
    // ========== Load Operations ==========
    
    /// LDA Immediate - Load Accumulator
    pub(crate) fn lda_imm(&mut self) {
        self.a = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        self.update_nz(self.a);
        self.cycles += 2;
    }
    
    /// LDA Zero Page
    pub(crate) fn lda_zp(&mut self) {
        let addr = self.read_byte(self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.a = self.read_byte(addr);
        self.update_nz(self.a);
        self.cycles += 3;
    }
    
    /// LDA Zero Page,X
    pub(crate) fn lda_zpx(&mut self) {
        let addr = self.read_byte(self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.a = self.read_byte(addr);
        self.update_nz(self.a);
        self.cycles += 4;
    }
    
    /// LDA Absolute
    pub(crate) fn lda_abs(&mut self) {
        let addr = self.read_word(self.pc);
        self.pc = self.pc.wrapping_add(2);
        self.a = self.read_byte(addr);
        self.update_nz(self.a);
        self.cycles += 4;
    }
    
    /// LDA Absolute,X
    pub(crate) fn lda_absx(&mut self) {
        let base_addr = self.read_word(self.pc);
        let addr = base_addr.wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        self.a = self.read_byte(addr);
        self.update_nz(self.a);
        // Page boundary crossing adds a cycle
        if (base_addr & 0xFF00) != (addr & 0xFF00) {
            self.cycles += 5;
        } else {
            self.cycles += 4;
        }
    }
    
    /// LDA Absolute,Y
    pub(crate) fn lda_absy(&mut self) {
        let base_addr = self.read_word(self.pc);
        let addr = base_addr.wrapping_add(self.y as u16);
        self.pc = self.pc.wrapping_add(2);
        self.a = self.read_byte(addr);
        self.update_nz(self.a);
        // Page boundary crossing adds a cycle
        if (base_addr & 0xFF00) != (addr & 0xFF00) {
            self.cycles += 5;
        } else {
            self.cycles += 4;
        }
    }
    
    /// LDX Immediate
    pub(crate) fn ldx_imm(&mut self) {
        self.x = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        self.update_nz(self.x);
        self.cycles += 2;
    }
    
    /// LDX Zero Page
    pub(crate) fn ldx_zp(&mut self) {
        let addr = self.read_byte(self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.x = self.read_byte(addr);
        self.update_nz(self.x);
        self.cycles += 3;
    }
    
    /// LDX Absolute
    pub(crate) fn ldx_abs(&mut self) {
        let addr = self.read_word(self.pc);
        self.pc = self.pc.wrapping_add(2);
        self.x = self.read_byte(addr);
        self.update_nz(self.x);
        self.cycles += 4;
    }
    
    /// LDY Immediate
    pub(crate) fn ldy_imm(&mut self) {
        self.y = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        self.update_nz(self.y);
        self.cycles += 2;
    }
    
    /// LDY Zero Page
    pub(crate) fn ldy_zp(&mut self) {
        let addr = self.read_byte(self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.y = self.read_byte(addr);
        self.update_nz(self.y);
        self.cycles += 3;
    }
    
    /// LDY Absolute
    pub(crate) fn ldy_abs(&mut self) {
        let addr = self.read_word(self.pc);
        self.pc = self.pc.wrapping_add(2);
        self.y = self.read_byte(addr);
        self.update_nz(self.y);
        self.cycles += 4;
    }
    
    // ========== Store Operations ==========
    
    /// STA Zero Page
    pub(crate) fn sta_zp(&mut self) {
        let addr = self.read_byte(self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.write_byte(addr, self.a);
        self.cycles += 3;
    }
    
    /// STA Zero Page,X
    pub(crate) fn sta_zpx(&mut self) {
        let addr = self.read_byte(self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.write_byte(addr, self.a);
        self.cycles += 4;
    }
    
    /// STA Absolute - Store Accumulator
    pub(crate) fn sta_abs(&mut self) {
        let addr = self.read_word(self.pc);
        self.pc = self.pc.wrapping_add(2);
        self.write_byte(addr, self.a);
        self.cycles += 4;
    }
    
    /// STA Absolute,X
    pub(crate) fn sta_absx(&mut self) {
        let addr = self.read_word(self.pc).wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        self.write_byte(addr, self.a);
        self.cycles += 5;
    }
    
    /// STA Absolute,Y
    pub(crate) fn sta_absy(&mut self) {
        let addr = self.read_word(self.pc).wrapping_add(self.y as u16);
        self.pc = self.pc.wrapping_add(2);
        self.write_byte(addr, self.a);
        self.cycles += 5;
    }
    
    /// STX Zero Page
    pub(crate) fn stx_zp(&mut self) {
        let addr = self.read_byte(self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.write_byte(addr, self.x);
        self.cycles += 3;
    }
    
    /// STX Absolute
    pub(crate) fn stx_abs(&mut self) {
        let addr = self.read_word(self.pc);
        self.pc = self.pc.wrapping_add(2);
        self.write_byte(addr, self.x);
        self.cycles += 4;
    }
    
    /// STY Zero Page
    pub(crate) fn sty_zp(&mut self) {
        let addr = self.read_byte(self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.write_byte(addr, self.y);
        self.cycles += 3;
    }
    
    /// STY Absolute
    pub(crate) fn sty_abs(&mut self) {
        let addr = self.read_word(self.pc);
        self.pc = self.pc.wrapping_add(2);
        self.write_byte(addr, self.y);
        self.cycles += 4;
    }
    
    // ========== Transfer Operations ==========
    
    /// TAX - Transfer A to X
    pub(crate) fn tax(&mut self) {
        self.x = self.a;
        self.update_nz(self.x);
        self.cycles += 2;
    }
    
    /// TAY - Transfer A to Y
    pub(crate) fn tay(&mut self) {
        self.y = self.a;
        self.update_nz(self.y);
        self.cycles += 2;
    }
    
    /// TXA - Transfer X to A
    pub(crate) fn txa(&mut self) {
        self.a = self.x;
        self.update_nz(self.a);
        self.cycles += 2;
    }
    
    /// TYA - Transfer Y to A
    pub(crate) fn tya(&mut self) {
        self.a = self.y;
        self.update_nz(self.a);
        self.cycles += 2;
    }
    
    /// TSX - Transfer Stack Pointer to X
    pub(crate) fn tsx(&mut self) {
        self.x = self.s;
        self.update_nz(self.x);
        self.cycles += 2;
    }
    
    /// TXS - Transfer X to Stack Pointer
    pub(crate) fn txs(&mut self) {
        self.s = self.x;
        self.cycles += 2;
    }
    
    // ========== Stack Operations ==========
    
    /// PHA - Push Accumulator
    pub(crate) fn pha(&mut self) {
        self.push_byte(self.a);
        self.cycles += 3;
    }
    
    /// PLA - Pull Accumulator
    pub(crate) fn pla(&mut self) {
        self.a = self.pop_byte();
        self.update_nz(self.a);
        self.cycles += 4;
    }
    
    /// PHP - Push Processor Status
    pub(crate) fn php(&mut self) {
        let status = self.get_status() | flags::BREAK | flags::UNUSED;
        self.push_byte(status);
        self.cycles += 3;
    }
    
    /// PLP - Pull Processor Status
    pub(crate) fn plp(&mut self) {
        let status = self.pop_byte();
        self.set_status(status);
        self.cycles += 4;
    }
    
    // ========== Branch Operations ==========
    
    /// BNE - Branch if Not Equal (Z=0)
    pub(crate) fn bne(&mut self) {
        self.branch_if(!self.get_flag(flags::ZERO));
    }
    
    /// BEQ - Branch if Equal (Z=1)
    pub(crate) fn beq(&mut self) {
        self.branch_if(self.get_flag(flags::ZERO));
    }
    
    /// BCC - Branch if Carry Clear (C=0)
    pub(crate) fn bcc(&mut self) {
        self.branch_if(!self.get_flag(flags::CARRY));
    }
    
    /// BCS - Branch if Carry Set (C=1)
    pub(crate) fn bcs(&mut self) {
        self.branch_if(self.get_flag(flags::CARRY));
    }
    
    /// BPL - Branch if Plus (N=0)
    pub(crate) fn bpl(&mut self) {
        self.branch_if(!self.get_flag(flags::NEGATIVE));
    }
    
    /// BMI - Branch if Minus (N=1)
    pub(crate) fn bmi(&mut self) {
        self.branch_if(self.get_flag(flags::NEGATIVE));
    }
    
    /// BVC - Branch if Overflow Clear (V=0)
    pub(crate) fn bvc(&mut self) {
        self.branch_if(!self.get_flag(flags::OVERFLOW));
    }
    
    /// BVS - Branch if Overflow Set (V=1)
    pub(crate) fn bvs(&mut self) {
        self.branch_if(self.get_flag(flags::OVERFLOW));
    }
    
    // ========== Jump/Call Operations ==========
    
    /// JMP Absolute
    pub(crate) fn jmp_abs(&mut self) {
        self.pc = self.read_word(self.pc);
        self.cycles += 3;
    }
    
    /// JMP Indirect - Has 6502 bug with page boundary
    pub(crate) fn jmp_ind(&mut self) {
        let addr = self.read_word(self.pc);
        // 6502 bug: if low byte is 0xFF, high byte wraps within page
        if (addr & 0xFF) == 0xFF {
            let low = self.read_byte(addr);
            let high = self.read_byte(addr & 0xFF00);
            self.pc = ((high as u16) << 8) | (low as u16);
        } else {
            self.pc = self.read_word(addr);
        }
        self.cycles += 5;
    }
    
    /// JSR - Jump to Subroutine
    pub(crate) fn jsr(&mut self) {
        let target = self.read_word(self.pc);
        self.pc = self.pc.wrapping_add(1); // Point to last byte of JSR
        self.push_word(self.pc);
        self.pc = target;
        self.cycles += 6;
    }
    
    /// RTS - Return from Subroutine
    pub(crate) fn rts(&mut self) {
        self.pc = self.pop_word().wrapping_add(1);
        self.cycles += 6;
    }
    
    /// RTI - Return from Interrupt
    pub(crate) fn rti(&mut self) {
        let status = self.pop_byte();
        self.set_status(status);
        self.pc = self.pop_word();
        self.cycles += 6;
    }
    
    // ========== Compare Operations ==========
    
    /// CMP Immediate
    pub(crate) fn cmp_imm(&mut self) {
        let value = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        self.compare(self.a, value);
        self.cycles += 2;
    }
    
    /// CMP Zero Page
    pub(crate) fn cmp_zp(&mut self) {
        let addr = self.read_byte(self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        let value = self.read_byte(addr);
        self.compare(self.a, value);
        self.cycles += 3;
    }
    
    /// CMP Absolute
    pub(crate) fn cmp_abs(&mut self) {
        let addr = self.read_word(self.pc);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte(addr);
        self.compare(self.a, value);
        self.cycles += 4;
    }
    
    /// CPX Immediate
    pub(crate) fn cpx_imm(&mut self) {
        let value = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        self.compare(self.x, value);
        self.cycles += 2;
    }
    
    /// CPX Zero Page
    pub(crate) fn cpx_zp(&mut self) {
        let addr = self.read_byte(self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        let value = self.read_byte(addr);
        self.compare(self.x, value);
        self.cycles += 3;
    }
    
    /// CPY Immediate
    pub(crate) fn cpy_imm(&mut self) {
        let value = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        self.compare(self.y, value);
        self.cycles += 2;
    }
    
    /// CPY Zero Page
    pub(crate) fn cpy_zp(&mut self) {
        let addr = self.read_byte(self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        let value = self.read_byte(addr);
        self.compare(self.y, value);
        self.cycles += 3;
    }
    
    // ========== Increment/Decrement Operations ==========
    
    /// INX - Increment X
    pub(crate) fn inx(&mut self) {
        self.x = self.x.wrapping_add(1);
        self.update_nz(self.x);
        self.cycles += 2;
    }
    
    /// INY - Increment Y
    pub(crate) fn iny(&mut self) {
        self.y = self.y.wrapping_add(1);
        self.update_nz(self.y);
        self.cycles += 2;
    }
    
    /// DEX - Decrement X
    pub(crate) fn dex(&mut self) {
        self.x = self.x.wrapping_sub(1);
        self.update_nz(self.x);
        self.cycles += 2;
    }
    
    /// DEY - Decrement Y
    pub(crate) fn dey(&mut self) {
        self.y = self.y.wrapping_sub(1);
        self.update_nz(self.y);
        self.cycles += 2;
    }
    
    /// INC Zero Page
    pub(crate) fn inc_zp(&mut self) {
        let addr = self.read_byte(self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        let value = self.read_byte(addr).wrapping_add(1);
        self.write_byte(addr, value);
        self.update_nz(value);
        self.cycles += 5;
    }
    
    /// INC Absolute
    pub(crate) fn inc_abs(&mut self) {
        let addr = self.read_word(self.pc);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte(addr).wrapping_add(1);
        self.write_byte(addr, value);
        self.update_nz(value);
        self.cycles += 6;
    }
    
    /// DEC Zero Page
    pub(crate) fn dec_zp(&mut self) {
        let addr = self.read_byte(self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        let value = self.read_byte(addr).wrapping_sub(1);
        self.write_byte(addr, value);
        self.update_nz(value);
        self.cycles += 5;
    }
    
    /// DEC Absolute
    pub(crate) fn dec_abs(&mut self) {
        let addr = self.read_word(self.pc);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte(addr).wrapping_sub(1);
        self.write_byte(addr, value);
        self.update_nz(value);
        self.cycles += 6;
    }
    
    // ========== Arithmetic Operations ==========
    
    /// ADC Immediate - Add with Carry
    pub(crate) fn adc_imm(&mut self) {
        let value = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        self.adc(value);
        self.cycles += 2;
    }
    
    /// ADC Zero Page
    pub(crate) fn adc_zp(&mut self) {
        let addr = self.read_byte(self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        let value = self.read_byte(addr);
        self.adc(value);
        self.cycles += 3;
    }
    
    /// ADC Absolute
    pub(crate) fn adc_abs(&mut self) {
        let addr = self.read_word(self.pc);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte(addr);
        self.adc(value);
        self.cycles += 4;
    }
    
    /// SBC Immediate - Subtract with Carry
    pub(crate) fn sbc_imm(&mut self) {
        let value = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        self.sbc(value);
        self.cycles += 2;
    }
    
    /// SBC Zero Page
    pub(crate) fn sbc_zp(&mut self) {
        let addr = self.read_byte(self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        let value = self.read_byte(addr);
        self.sbc(value);
        self.cycles += 3;
    }
    
    /// SBC Absolute
    pub(crate) fn sbc_abs(&mut self) {
        let addr = self.read_word(self.pc);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte(addr);
        self.sbc(value);
        self.cycles += 4;
    }
    
    // ========== Logical Operations ==========
    
    /// AND Immediate
    pub(crate) fn and_imm(&mut self) {
        let value = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        self.a &= value;
        self.update_nz(self.a);
        self.cycles += 2;
    }
    
    /// AND Zero Page
    pub(crate) fn and_zp(&mut self) {
        let addr = self.read_byte(self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.a &= self.read_byte(addr);
        self.update_nz(self.a);
        self.cycles += 3;
    }
    
    /// AND Absolute
    pub(crate) fn and_abs(&mut self) {
        let addr = self.read_word(self.pc);
        self.pc = self.pc.wrapping_add(2);
        self.a &= self.read_byte(addr);
        self.update_nz(self.a);
        self.cycles += 4;
    }
    
    /// ORA Immediate
    pub(crate) fn ora_imm(&mut self) {
        let value = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        self.a |= value;
        self.update_nz(self.a);
        self.cycles += 2;
    }
    
    /// ORA Zero Page
    pub(crate) fn ora_zp(&mut self) {
        let addr = self.read_byte(self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.a |= self.read_byte(addr);
        self.update_nz(self.a);
        self.cycles += 3;
    }
    
    /// ORA Absolute
    pub(crate) fn ora_abs(&mut self) {
        let addr = self.read_word(self.pc);
        self.pc = self.pc.wrapping_add(2);
        self.a |= self.read_byte(addr);
        self.update_nz(self.a);
        self.cycles += 4;
    }
    
    /// EOR Immediate
    pub(crate) fn eor_imm(&mut self) {
        let value = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        self.a ^= value;
        self.update_nz(self.a);
        self.cycles += 2;
    }
    
    /// EOR Zero Page
    pub(crate) fn eor_zp(&mut self) {
        let addr = self.read_byte(self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.a ^= self.read_byte(addr);
        self.update_nz(self.a);
        self.cycles += 3;
    }
    
    /// EOR Absolute
    pub(crate) fn eor_abs(&mut self) {
        let addr = self.read_word(self.pc);
        self.pc = self.pc.wrapping_add(2);
        self.a ^= self.read_byte(addr);
        self.update_nz(self.a);
        self.cycles += 4;
    }
    
    // ========== Flag Operations ==========
    
    /// CLC - Clear Carry
    pub(crate) fn clc(&mut self) {
        self.set_flag(flags::CARRY, false);
        self.cycles += 2;
    }
    
    /// SEC - Set Carry
    pub(crate) fn sec(&mut self) {
        self.set_flag(flags::CARRY, true);
        self.cycles += 2;
    }
    
    /// CLI - Clear Interrupt Disable
    pub(crate) fn cli(&mut self) {
        self.set_flag(flags::INTERRUPT, false);
        self.cycles += 2;
    }
    
    /// SEI - Set Interrupt Disable
    pub(crate) fn sei(&mut self) {
        self.set_flag(flags::INTERRUPT, true);
        self.cycles += 2;
    }
    
    /// CLV - Clear Overflow
    pub(crate) fn clv(&mut self) {
        self.set_flag(flags::OVERFLOW, false);
        self.cycles += 2;
    }
    
    /// CLD - Clear Decimal
    pub(crate) fn cld(&mut self) {
        self.set_flag(flags::DECIMAL, false);
        self.cycles += 2;
    }
    
    /// SED - Set Decimal
    pub(crate) fn sed(&mut self) {
        self.set_flag(flags::DECIMAL, true);
        self.cycles += 2;
    }
    
    // ========== System Operations ==========
    
    /// BRK - Break/Interrupt
    pub(crate) fn brk(&mut self) {
        self.pc = self.pc.wrapping_add(1); // BRK is 2 bytes
        self.push_word(self.pc);
        self.push_byte(self.get_status() | flags::BREAK | flags::UNUSED);
        self.set_flag(flags::INTERRUPT, true);
        self.pc = self.read_word(0xFFFE); // IRQ vector
        self.cycles += 7;
    }
    
    /// NOP - No Operation
    pub(crate) fn nop(&mut self) {
        self.cycles += 2;
    }
    
    // ========== Helper Methods ==========
    
    /// Helper for branch instructions
    fn branch_if(&mut self, condition: bool) {
        let offset = self.read_byte(self.pc) as i8;
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
    
    /// Helper for compare instructions
    fn compare(&mut self, reg: u8, value: u8) {
        let result = (reg as u16).wrapping_sub(value as u16);
        self.set_flag(flags::CARRY, result < 0x100);
        self.update_nz(result as u8);
    }
    
    /// Helper for ADC instruction
    fn adc(&mut self, value: u8) {
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
    
    /// Helper for SBC instruction
    fn sbc(&mut self, value: u8) {
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
}