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
    
    /// LDA Indexed Indirect (zero page,X)
    pub(crate) fn lda_izx(&mut self) {
        let addr = self.get_izx_addr();
        self.a = self.read_byte(addr);
        self.update_nz(self.a);
        self.cycles += 6;
    }
    
    /// LDA Indirect Indexed (zero page),Y
    pub(crate) fn lda_izy(&mut self) {
        let addr = self.get_izy_addr();
        self.a = self.read_byte(addr);
        self.update_nz(self.a);
        // Page boundary crossing adds a cycle
        if self.check_izy_page_cross() {
            self.cycles += 6;
        } else {
            self.cycles += 5;
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
    
    /// LDX Zero Page,Y
    pub(crate) fn ldx_zpy(&mut self) {
        let addr = self.get_zpy_addr();
        self.x = self.read_byte(addr);
        self.update_nz(self.x);
        self.cycles += 4;
    }
    
    /// LDX Absolute,Y
    pub(crate) fn ldx_aby(&mut self) {
        let base_addr = self.read_word(self.pc);
        let addr = base_addr.wrapping_add(self.y as u16);
        self.pc = self.pc.wrapping_add(2);
        self.x = self.read_byte(addr);
        self.update_nz(self.x);
        // Page boundary crossing adds a cycle
        if (base_addr & 0xFF00) != (addr & 0xFF00) {
            self.cycles += 5;
        } else {
            self.cycles += 4;
        }
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
    
    /// LDY Zero Page,X
    pub(crate) fn ldy_zpx(&mut self) {
        let addr = self.read_byte(self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.y = self.read_byte(addr);
        self.update_nz(self.y);
        self.cycles += 4;
    }
    
    /// LDY Absolute,X
    pub(crate) fn ldy_abx(&mut self) {
        let base_addr = self.read_word(self.pc);
        let addr = base_addr.wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        self.y = self.read_byte(addr);
        self.update_nz(self.y);
        // Page boundary crossing adds a cycle
        if (base_addr & 0xFF00) != (addr & 0xFF00) {
            self.cycles += 5;
        } else {
            self.cycles += 4;
        }
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
    
    /// STA Indexed Indirect (zero page,X)
    pub(crate) fn sta_izx(&mut self) {
        let addr = self.get_izx_addr();
        self.write_byte(addr, self.a);
        self.cycles += 6;
    }
    
    /// STA Indirect Indexed (zero page),Y
    pub(crate) fn sta_izy(&mut self) {
        let addr = self.get_izy_addr();
        self.write_byte(addr, self.a);
        self.cycles += 6;
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
    
    /// STX Zero Page,Y
    pub(crate) fn stx_zpy(&mut self) {
        let addr = self.get_zpy_addr();
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
    
    /// STY Zero Page,X
    pub(crate) fn sty_zpx(&mut self) {
        let addr = self.read_byte(self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
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
    
    /// CMP Indexed Indirect (zero page,X)
    pub(crate) fn cmp_izx(&mut self) {
        let addr = self.get_izx_addr();
        let value = self.read_byte(addr);
        self.compare(self.a, value);
        self.cycles += 6;
    }
    
    /// CMP Indirect Indexed (zero page),Y
    pub(crate) fn cmp_izy(&mut self) {
        let addr = self.get_izy_addr();
        let value = self.read_byte(addr);
        self.compare(self.a, value);
        // Page boundary crossing adds a cycle
        if self.check_izy_page_cross() {
            self.cycles += 6;
        } else {
            self.cycles += 5;
        }
    }
    
    /// CMP Absolute,X
    pub(crate) fn cmp_absx(&mut self) {
        let base_addr = self.read_word(self.pc);
        let addr = base_addr.wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte(addr);
        self.compare(self.a, value);
        // Page boundary crossing adds a cycle
        if (base_addr & 0xFF00) != (addr & 0xFF00) {
            self.cycles += 5;
        } else {
            self.cycles += 4;
        }
    }
    
    /// CMP Absolute,Y
    pub(crate) fn cmp_absy(&mut self) {
        let base_addr = self.read_word(self.pc);
        let addr = base_addr.wrapping_add(self.y as u16);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte(addr);
        self.compare(self.a, value);
        // Page boundary crossing adds a cycle
        if (base_addr & 0xFF00) != (addr & 0xFF00) {
            self.cycles += 5;
        } else {
            self.cycles += 4;
        }
    }
    
    /// CMP Zero Page,X
    pub(crate) fn cmp_zpx(&mut self) {
        let addr = self.read_byte(self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
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
    
    /// CPX Absolute
    pub(crate) fn cpx_abs(&mut self) {
        let addr = self.read_word(self.pc);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte(addr);
        self.compare(self.x, value);
        self.cycles += 4;
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
    
    /// CPY Absolute
    pub(crate) fn cpy_abs(&mut self) {
        let addr = self.read_word(self.pc);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte(addr);
        self.compare(self.y, value);
        self.cycles += 4;
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
    
    /// INC Zero Page,X
    pub(crate) fn inc_zpx(&mut self) {
        let addr = self.read_byte(self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
        let value = self.read_byte(addr).wrapping_add(1);
        self.write_byte(addr, value);
        self.update_nz(value);
        self.cycles += 6;
    }
    
    /// INC Absolute,X
    pub(crate) fn inc_absx(&mut self) {
        let addr = self.read_word(self.pc).wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte(addr).wrapping_add(1);
        self.write_byte(addr, value);
        self.update_nz(value);
        self.cycles += 7;
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
    
    /// DEC Zero Page,X
    pub(crate) fn dec_zpx(&mut self) {
        let addr = self.read_byte(self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
        let value = self.read_byte(addr).wrapping_sub(1);
        self.write_byte(addr, value);
        self.update_nz(value);
        self.cycles += 6;
    }
    
    /// DEC Absolute,X
    pub(crate) fn dec_absx(&mut self) {
        let addr = self.read_word(self.pc).wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte(addr).wrapping_sub(1);
        self.write_byte(addr, value);
        self.update_nz(value);
        self.cycles += 7;
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
    
    /// ADC Indexed Indirect (zero page,X)
    pub(crate) fn adc_izx(&mut self) {
        let addr = self.get_izx_addr();
        let value = self.read_byte(addr);
        self.adc(value);
        self.cycles += 6;
    }
    
    /// ADC Indirect Indexed (zero page),Y
    pub(crate) fn adc_izy(&mut self) {
        let addr = self.get_izy_addr();
        let value = self.read_byte(addr);
        self.adc(value);
        // Page boundary crossing adds a cycle
        if self.check_izy_page_cross() {
            self.cycles += 6;
        } else {
            self.cycles += 5;
        }
    }
    
    /// ADC Absolute,X
    pub(crate) fn adc_absx(&mut self) {
        let base_addr = self.read_word(self.pc);
        let addr = base_addr.wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte(addr);
        self.adc(value);
        // Page boundary crossing adds a cycle
        if (base_addr & 0xFF00) != (addr & 0xFF00) {
            self.cycles += 5;
        } else {
            self.cycles += 4;
        }
    }
    
    /// ADC Absolute,Y
    pub(crate) fn adc_absy(&mut self) {
        let base_addr = self.read_word(self.pc);
        let addr = base_addr.wrapping_add(self.y as u16);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte(addr);
        self.adc(value);
        // Page boundary crossing adds a cycle
        if (base_addr & 0xFF00) != (addr & 0xFF00) {
            self.cycles += 5;
        } else {
            self.cycles += 4;
        }
    }
    
    /// ADC Zero Page,X
    pub(crate) fn adc_zpx(&mut self) {
        let addr = self.read_byte(self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
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
    
    /// SBC Indexed Indirect (zero page,X)
    pub(crate) fn sbc_izx(&mut self) {
        let addr = self.get_izx_addr();
        let value = self.read_byte(addr);
        self.sbc(value);
        self.cycles += 6;
    }
    
    /// SBC Indirect Indexed (zero page),Y
    pub(crate) fn sbc_izy(&mut self) {
        let addr = self.get_izy_addr();
        let value = self.read_byte(addr);
        self.sbc(value);
        // Page boundary crossing adds a cycle
        if self.check_izy_page_cross() {
            self.cycles += 6;
        } else {
            self.cycles += 5;
        }
    }
    
    /// SBC Absolute,X
    pub(crate) fn sbc_absx(&mut self) {
        let base_addr = self.read_word(self.pc);
        let addr = base_addr.wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte(addr);
        self.sbc(value);
        // Page boundary crossing adds a cycle
        if (base_addr & 0xFF00) != (addr & 0xFF00) {
            self.cycles += 5;
        } else {
            self.cycles += 4;
        }
    }
    
    /// SBC Absolute,Y
    pub(crate) fn sbc_absy(&mut self) {
        let base_addr = self.read_word(self.pc);
        let addr = base_addr.wrapping_add(self.y as u16);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte(addr);
        self.sbc(value);
        // Page boundary crossing adds a cycle
        if (base_addr & 0xFF00) != (addr & 0xFF00) {
            self.cycles += 5;
        } else {
            self.cycles += 4;
        }
    }
    
    /// SBC Zero Page,X
    pub(crate) fn sbc_zpx(&mut self) {
        let addr = self.read_byte(self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
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
    
    /// AND Indexed Indirect (zero page,X)
    pub(crate) fn and_izx(&mut self) {
        let addr = self.get_izx_addr();
        self.a &= self.read_byte(addr);
        self.update_nz(self.a);
        self.cycles += 6;
    }
    
    /// AND Indirect Indexed (zero page),Y
    pub(crate) fn and_izy(&mut self) {
        let addr = self.get_izy_addr();
        self.a &= self.read_byte(addr);
        self.update_nz(self.a);
        // Page boundary crossing adds a cycle
        if self.check_izy_page_cross() {
            self.cycles += 6;
        } else {
            self.cycles += 5;
        }
    }
    
    /// AND Absolute,X
    pub(crate) fn and_absx(&mut self) {
        let base_addr = self.read_word(self.pc);
        let addr = base_addr.wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        self.a &= self.read_byte(addr);
        self.update_nz(self.a);
        // Page boundary crossing adds a cycle
        if (base_addr & 0xFF00) != (addr & 0xFF00) {
            self.cycles += 5;
        } else {
            self.cycles += 4;
        }
    }
    
    /// AND Absolute,Y
    pub(crate) fn and_absy(&mut self) {
        let base_addr = self.read_word(self.pc);
        let addr = base_addr.wrapping_add(self.y as u16);
        self.pc = self.pc.wrapping_add(2);
        self.a &= self.read_byte(addr);
        self.update_nz(self.a);
        // Page boundary crossing adds a cycle
        if (base_addr & 0xFF00) != (addr & 0xFF00) {
            self.cycles += 5;
        } else {
            self.cycles += 4;
        }
    }
    
    /// AND Zero Page,X
    pub(crate) fn and_zpx(&mut self) {
        let addr = self.read_byte(self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
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
    
    /// ORA Indexed Indirect (zero page,X)
    pub(crate) fn ora_izx(&mut self) {
        let addr = self.get_izx_addr();
        self.a |= self.read_byte(addr);
        self.update_nz(self.a);
        self.cycles += 6;
    }
    
    /// ORA Indirect Indexed (zero page),Y
    pub(crate) fn ora_izy(&mut self) {
        let addr = self.get_izy_addr();
        self.a |= self.read_byte(addr);
        self.update_nz(self.a);
        // Page boundary crossing adds a cycle
        if self.check_izy_page_cross() {
            self.cycles += 6;
        } else {
            self.cycles += 5;
        }
    }
    
    /// ORA Absolute,X
    pub(crate) fn ora_absx(&mut self) {
        let base_addr = self.read_word(self.pc);
        let addr = base_addr.wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        self.a |= self.read_byte(addr);
        self.update_nz(self.a);
        // Page boundary crossing adds a cycle
        if (base_addr & 0xFF00) != (addr & 0xFF00) {
            self.cycles += 5;
        } else {
            self.cycles += 4;
        }
    }
    
    /// ORA Absolute,Y
    pub(crate) fn ora_absy(&mut self) {
        let base_addr = self.read_word(self.pc);
        let addr = base_addr.wrapping_add(self.y as u16);
        self.pc = self.pc.wrapping_add(2);
        self.a |= self.read_byte(addr);
        self.update_nz(self.a);
        // Page boundary crossing adds a cycle
        if (base_addr & 0xFF00) != (addr & 0xFF00) {
            self.cycles += 5;
        } else {
            self.cycles += 4;
        }
    }
    
    /// ORA Zero Page,X
    pub(crate) fn ora_zpx(&mut self) {
        let addr = self.read_byte(self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
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
    
    /// EOR Indexed Indirect (zero page,X)
    pub(crate) fn eor_izx(&mut self) {
        let addr = self.get_izx_addr();
        self.a ^= self.read_byte(addr);
        self.update_nz(self.a);
        self.cycles += 6;
    }
    
    /// EOR Indirect Indexed (zero page),Y
    pub(crate) fn eor_izy(&mut self) {
        let addr = self.get_izy_addr();
        self.a ^= self.read_byte(addr);
        self.update_nz(self.a);
        // Page boundary crossing adds a cycle
        if self.check_izy_page_cross() {
            self.cycles += 6;
        } else {
            self.cycles += 5;
        }
    }
    
    /// EOR Absolute,X
    pub(crate) fn eor_absx(&mut self) {
        let base_addr = self.read_word(self.pc);
        let addr = base_addr.wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        self.a ^= self.read_byte(addr);
        self.update_nz(self.a);
        // Page boundary crossing adds a cycle
        if (base_addr & 0xFF00) != (addr & 0xFF00) {
            self.cycles += 5;
        } else {
            self.cycles += 4;
        }
    }
    
    /// EOR Absolute,Y
    pub(crate) fn eor_absy(&mut self) {
        let base_addr = self.read_word(self.pc);
        let addr = base_addr.wrapping_add(self.y as u16);
        self.pc = self.pc.wrapping_add(2);
        self.a ^= self.read_byte(addr);
        self.update_nz(self.a);
        // Page boundary crossing adds a cycle
        if (base_addr & 0xFF00) != (addr & 0xFF00) {
            self.cycles += 5;
        } else {
            self.cycles += 4;
        }
    }
    
    /// EOR Zero Page,X
    pub(crate) fn eor_zpx(&mut self) {
        let addr = self.read_byte(self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
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
    
    // ========== Bit Operations ==========
    
    /// BIT - Test Bits in Memory with Accumulator
    /// Sets Z flag based on A AND M
    /// Sets N flag to bit 7 of memory value
    /// Sets V flag to bit 6 of memory value
    pub(crate) fn bit(&mut self, value: u8) {
        let result = self.a & value;
        self.set_flag(flags::ZERO, result == 0);
        self.set_flag(flags::NEGATIVE, (value & 0x80) != 0);
        self.set_flag(flags::OVERFLOW, (value & 0x40) != 0);
    }
    
    /// BIT Zero Page
    pub(crate) fn bit_zp(&mut self) {
        let addr = self.read_byte(self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        let value = self.read_byte(addr);
        self.bit(value);
        self.cycles += 3;
    }
    
    /// BIT Absolute
    pub(crate) fn bit_abs(&mut self) {
        let addr = self.read_word(self.pc);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte(addr);
        self.bit(value);
        self.cycles += 4;
    }
    
    // ========== Shift and Rotate Operations ==========
    
    /// ASL - Arithmetic Shift Left (Accumulator)
    pub(crate) fn asla(&mut self) {
        let result = self.a << 1;
        self.set_flag(flags::CARRY, (self.a & 0x80) != 0);
        self.a = result;
        self.update_nz(self.a);
        self.cycles += 2;
    }
    
    /// ASL - Arithmetic Shift Left (Memory)
    pub(crate) fn asl(&mut self, addr: u16) {
        let value = self.read_byte(addr);
        let result = value << 1;
        self.set_flag(flags::CARRY, (value & 0x80) != 0);
        self.write_byte(addr, result);
        self.update_nz(result);
    }
    
    /// ASL Zero Page
    pub(crate) fn asl_zp(&mut self) {
        let addr = self.read_byte(self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.asl(addr);
        self.cycles += 5;
    }
    
    /// ASL Zero Page,X
    pub(crate) fn asl_zpx(&mut self) {
        let addr = self.read_byte(self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.asl(addr);
        self.cycles += 6;
    }
    
    /// ASL Absolute
    pub(crate) fn asl_abs(&mut self) {
        let addr = self.read_word(self.pc);
        self.pc = self.pc.wrapping_add(2);
        self.asl(addr);
        self.cycles += 6;
    }
    
    /// ASL Absolute,X
    pub(crate) fn asl_absx(&mut self) {
        let addr = self.read_word(self.pc).wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        self.asl(addr);
        self.cycles += 7;
    }
    
    /// LSR - Logical Shift Right (Accumulator)
    pub(crate) fn lsra(&mut self) {
        self.set_flag(flags::CARRY, (self.a & 0x01) != 0);
        self.a >>= 1;
        self.update_nz(self.a);
        self.cycles += 2;
    }
    
    /// LSR - Logical Shift Right (Memory)
    pub(crate) fn lsr(&mut self, addr: u16) {
        let value = self.read_byte(addr);
        self.set_flag(flags::CARRY, (value & 0x01) != 0);
        let result = value >> 1;
        self.write_byte(addr, result);
        self.update_nz(result);
    }
    
    /// LSR Zero Page
    pub(crate) fn lsr_zp(&mut self) {
        let addr = self.read_byte(self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.lsr(addr);
        self.cycles += 5;
    }
    
    /// LSR Zero Page,X
    pub(crate) fn lsr_zpx(&mut self) {
        let addr = self.read_byte(self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.lsr(addr);
        self.cycles += 6;
    }
    
    /// LSR Absolute
    pub(crate) fn lsr_abs(&mut self) {
        let addr = self.read_word(self.pc);
        self.pc = self.pc.wrapping_add(2);
        self.lsr(addr);
        self.cycles += 6;
    }
    
    /// LSR Absolute,X
    pub(crate) fn lsr_absx(&mut self) {
        let addr = self.read_word(self.pc).wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        self.lsr(addr);
        self.cycles += 7;
    }
    
    /// ROL - Rotate Left (Accumulator)
    pub(crate) fn rola(&mut self) {
        let old_carry = if self.get_flag(flags::CARRY) { 1 } else { 0 };
        self.set_flag(flags::CARRY, (self.a & 0x80) != 0);
        self.a = (self.a << 1) | old_carry;
        self.update_nz(self.a);
        self.cycles += 2;
    }
    
    /// ROL - Rotate Left (Memory)
    pub(crate) fn rol(&mut self, addr: u16) {
        let value = self.read_byte(addr);
        let old_carry = if self.get_flag(flags::CARRY) { 1 } else { 0 };
        self.set_flag(flags::CARRY, (value & 0x80) != 0);
        let result = (value << 1) | old_carry;
        self.write_byte(addr, result);
        self.update_nz(result);
    }
    
    /// ROL Zero Page
    pub(crate) fn rol_zp(&mut self) {
        let addr = self.read_byte(self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.rol(addr);
        self.cycles += 5;
    }
    
    /// ROL Zero Page,X
    pub(crate) fn rol_zpx(&mut self) {
        let addr = self.read_byte(self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.rol(addr);
        self.cycles += 6;
    }
    
    /// ROL Absolute
    pub(crate) fn rol_abs(&mut self) {
        let addr = self.read_word(self.pc);
        self.pc = self.pc.wrapping_add(2);
        self.rol(addr);
        self.cycles += 6;
    }
    
    /// ROL Absolute,X
    pub(crate) fn rol_absx(&mut self) {
        let addr = self.read_word(self.pc).wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        self.rol(addr);
        self.cycles += 7;
    }
    
    /// ROR - Rotate Right (Accumulator)
    pub(crate) fn rora(&mut self) {
        let old_carry = if self.get_flag(flags::CARRY) { 0x80 } else { 0 };
        self.set_flag(flags::CARRY, (self.a & 0x01) != 0);
        self.a = (self.a >> 1) | old_carry;
        self.update_nz(self.a);
        self.cycles += 2;
    }
    
    /// ROR - Rotate Right (Memory)
    pub(crate) fn ror(&mut self, addr: u16) {
        let value = self.read_byte(addr);
        let old_carry = if self.get_flag(flags::CARRY) { 0x80 } else { 0 };
        self.set_flag(flags::CARRY, (value & 0x01) != 0);
        let result = (value >> 1) | old_carry;
        self.write_byte(addr, result);
        self.update_nz(result);
    }
    
    /// ROR Zero Page
    pub(crate) fn ror_zp(&mut self) {
        let addr = self.read_byte(self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.ror(addr);
        self.cycles += 5;
    }
    
    /// ROR Zero Page,X
    pub(crate) fn ror_zpx(&mut self) {
        let addr = self.read_byte(self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.ror(addr);
        self.cycles += 6;
    }
    
    /// ROR Absolute
    pub(crate) fn ror_abs(&mut self) {
        let addr = self.read_word(self.pc);
        self.pc = self.pc.wrapping_add(2);
        self.ror(addr);
        self.cycles += 6;
    }
    
    /// ROR Absolute,X
    pub(crate) fn ror_absx(&mut self) {
        let addr = self.read_word(self.pc).wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        self.ror(addr);
        self.cycles += 7;
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
    
    // ========== Illegal/Undocumented Instructions ==========
    // These instructions are not part of the official 6502 specification
    // but are implemented for compatibility with programs that use them
    
    /// LAX - Load A and X (illegal opcode)
    /// Loads value into both A and X registers
    pub(crate) fn lax(&mut self, addr: u16) {
        let value = self.read_byte(addr);
        self.a = value;
        self.x = value;
        self.update_nz(value);
    }
    
    /// LAX Zero Page
    pub(crate) fn lax_zp(&mut self) {
        let addr = self.read_byte(self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.lax(addr);
        self.cycles += 3;
    }
    
    /// LAX Zero Page,Y
    pub(crate) fn lax_zpy(&mut self) {
        let addr = self.read_byte(self.pc).wrapping_add(self.y) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.lax(addr);
        self.cycles += 4;
    }
    
    /// LAX Absolute
    pub(crate) fn lax_abs(&mut self) {
        let addr = self.read_word(self.pc);
        self.pc = self.pc.wrapping_add(2);
        self.lax(addr);
        self.cycles += 4;
    }
    
    /// LAX Absolute,Y
    pub(crate) fn lax_aby(&mut self) {
        let base = self.read_word(self.pc);
        let addr = base.wrapping_add(self.y as u16);
        self.pc = self.pc.wrapping_add(2);
        self.lax(addr);
        self.cycles += if (base & 0xFF00) != (addr & 0xFF00) { 5 } else { 4 };
    }
    
    /// LAX Indexed Indirect (zp,X)
    pub(crate) fn lax_izx(&mut self) {
        let base = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        let ptr = base.wrapping_add(self.x);
        let addr = self.read_word_zp(ptr);
        self.lax(addr);
        self.cycles += 6;
    }
    
    /// LAX Indirect Indexed (zp),Y
    pub(crate) fn lax_izy(&mut self) {
        let ptr = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        let base = self.read_word_zp(ptr);
        let addr = base.wrapping_add(self.y as u16);
        self.lax(addr);
        self.cycles += if (base & 0xFF00) != (addr & 0xFF00) { 6 } else { 5 };
    }
    
    /// SAX - Store A AND X (illegal opcode)
    /// Stores A & X to memory
    pub(crate) fn sax(&mut self, addr: u16) {
        let value = self.a & self.x;
        self.write_byte(addr, value);
    }
    
    /// SAX Zero Page
    pub(crate) fn sax_zp(&mut self) {
        let addr = self.read_byte(self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.sax(addr);
        self.cycles += 3;
    }
    
    /// SAX Zero Page,Y
    pub(crate) fn sax_zpy(&mut self) {
        let addr = self.read_byte(self.pc).wrapping_add(self.y) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.sax(addr);
        self.cycles += 4;
    }
    
    /// SAX Absolute
    pub(crate) fn sax_abs(&mut self) {
        let addr = self.read_word(self.pc);
        self.pc = self.pc.wrapping_add(2);
        self.sax(addr);
        self.cycles += 4;
    }
    
    /// SAX Indexed Indirect (zp,X)
    pub(crate) fn sax_izx(&mut self) {
        let base = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        let ptr = base.wrapping_add(self.x);
        let addr = self.read_word_zp(ptr);
        self.sax(addr);
        self.cycles += 6;
    }
    
    /// SLO - Shift Left then OR (illegal opcode)
    /// ASL + ORA combined
    pub(crate) fn slo(&mut self, addr: u16) {
        let value = self.read_byte(addr);
        let result = value << 1;
        self.set_flag(flags::CARRY, (value & 0x80) != 0);
        self.write_byte(addr, result);
        self.a |= result;
        self.update_nz(self.a);
    }
    
    /// SLO Zero Page
    pub(crate) fn slo_zp(&mut self) {
        let addr = self.read_byte(self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.slo(addr);
        self.cycles += 5;
    }
    
    /// SLO Zero Page,X
    pub(crate) fn slo_zpx(&mut self) {
        let addr = self.read_byte(self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.slo(addr);
        self.cycles += 6;
    }
    
    /// SLO Absolute
    pub(crate) fn slo_abs(&mut self) {
        let addr = self.read_word(self.pc);
        self.pc = self.pc.wrapping_add(2);
        self.slo(addr);
        self.cycles += 6;
    }
    
    /// SLO Absolute,X
    pub(crate) fn slo_absx(&mut self) {
        let addr = self.read_word(self.pc).wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        self.slo(addr);
        self.cycles += 7;
    }
    
    /// SLO Absolute,Y  
    pub(crate) fn slo_absy(&mut self) {
        let addr = self.read_word(self.pc).wrapping_add(self.y as u16);
        self.pc = self.pc.wrapping_add(2);
        self.slo(addr);
        self.cycles += 7;
    }
    
    /// SLO Indexed Indirect (zp,X)
    pub(crate) fn slo_izx(&mut self) {
        let base = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        let ptr = base.wrapping_add(self.x);
        let addr = self.read_word_zp(ptr);
        self.slo(addr);
        self.cycles += 8;
    }
    
    /// SLO Indirect Indexed (zp),Y
    pub(crate) fn slo_izy(&mut self) {
        let ptr = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        let base = self.read_word_zp(ptr);
        let addr = base.wrapping_add(self.y as u16);
        self.slo(addr);
        self.cycles += 8;
    }
    
    /// SRE - Shift Right then EOR (illegal opcode)
    /// LSR + EOR combined
    pub(crate) fn sre(&mut self, addr: u16) {
        let value = self.read_byte(addr);
        self.set_flag(flags::CARRY, (value & 0x01) != 0);
        let result = value >> 1;
        self.write_byte(addr, result);
        self.a ^= result;
        self.update_nz(self.a);
    }
    
    /// SRE Zero Page
    pub(crate) fn sre_zp(&mut self) {
        let addr = self.read_byte(self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.sre(addr);
        self.cycles += 5;
    }
    
    /// SRE Zero Page,X
    pub(crate) fn sre_zpx(&mut self) {
        let addr = self.read_byte(self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.sre(addr);
        self.cycles += 6;
    }
    
    /// SRE Absolute
    pub(crate) fn sre_abs(&mut self) {
        let addr = self.read_word(self.pc);
        self.pc = self.pc.wrapping_add(2);
        self.sre(addr);
        self.cycles += 6;
    }
    
    /// SRE Absolute,X
    pub(crate) fn sre_absx(&mut self) {
        let addr = self.read_word(self.pc).wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        self.sre(addr);
        self.cycles += 7;
    }
    
    /// SRE Absolute,Y
    pub(crate) fn sre_absy(&mut self) {
        let addr = self.read_word(self.pc).wrapping_add(self.y as u16);
        self.pc = self.pc.wrapping_add(2);
        self.sre(addr);
        self.cycles += 7;
    }
    
    /// SRE Indexed Indirect (zp,X)
    pub(crate) fn sre_izx(&mut self) {
        let base = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        let ptr = base.wrapping_add(self.x);
        let addr = self.read_word_zp(ptr);
        self.sre(addr);
        self.cycles += 8;
    }
    
    /// SRE Indirect Indexed (zp),Y
    pub(crate) fn sre_izy(&mut self) {
        let ptr = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        let base = self.read_word_zp(ptr);
        let addr = base.wrapping_add(self.y as u16);
        self.sre(addr);
        self.cycles += 8;
    }
    
    /// RLA - Rotate Left then AND (illegal opcode)
    /// ROL + AND combined
    pub(crate) fn rla(&mut self, addr: u16) {
        let value = self.read_byte(addr);
        let old_carry = if self.get_flag(flags::CARRY) { 1 } else { 0 };
        self.set_flag(flags::CARRY, (value & 0x80) != 0);
        let result = (value << 1) | old_carry;
        self.write_byte(addr, result);
        self.a &= result;
        self.update_nz(self.a);
    }
    
    /// RLA Zero Page
    pub(crate) fn rla_zp(&mut self) {
        let addr = self.read_byte(self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.rla(addr);
        self.cycles += 5;
    }
    
    /// RLA Zero Page,X
    pub(crate) fn rla_zpx(&mut self) {
        let addr = self.read_byte(self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.rla(addr);
        self.cycles += 6;
    }
    
    /// RLA Absolute
    pub(crate) fn rla_abs(&mut self) {
        let addr = self.read_word(self.pc);
        self.pc = self.pc.wrapping_add(2);
        self.rla(addr);
        self.cycles += 6;
    }
    
    /// RLA Absolute,X
    pub(crate) fn rla_absx(&mut self) {
        let addr = self.read_word(self.pc).wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        self.rla(addr);
        self.cycles += 7;
    }
    
    /// RLA Absolute,Y
    pub(crate) fn rla_absy(&mut self) {
        let addr = self.read_word(self.pc).wrapping_add(self.y as u16);
        self.pc = self.pc.wrapping_add(2);
        self.rla(addr);
        self.cycles += 7;
    }
    
    /// RLA Indexed Indirect (zp,X)
    pub(crate) fn rla_izx(&mut self) {
        let base = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        let ptr = base.wrapping_add(self.x);
        let addr = self.read_word_zp(ptr);
        self.rla(addr);
        self.cycles += 8;
    }
    
    /// RLA Indirect Indexed (zp),Y
    pub(crate) fn rla_izy(&mut self) {
        let ptr = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        let base = self.read_word_zp(ptr);
        let addr = base.wrapping_add(self.y as u16);
        self.rla(addr);
        self.cycles += 8;
    }
    
    /// RRA - Rotate Right then ADC (illegal opcode)
    /// ROR + ADC combined
    pub(crate) fn rra(&mut self, addr: u16) {
        let value = self.read_byte(addr);
        let old_carry = if self.get_flag(flags::CARRY) { 0x80 } else { 0 };
        self.set_flag(flags::CARRY, (value & 0x01) != 0);
        let result = (value >> 1) | old_carry;
        self.write_byte(addr, result);
        self.adc(result);
    }
    
    /// RRA Zero Page
    pub(crate) fn rra_zp(&mut self) {
        let addr = self.read_byte(self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.rra(addr);
        self.cycles += 5;
    }
    
    /// RRA Zero Page,X
    pub(crate) fn rra_zpx(&mut self) {
        let addr = self.read_byte(self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.rra(addr);
        self.cycles += 6;
    }
    
    /// RRA Absolute
    pub(crate) fn rra_abs(&mut self) {
        let addr = self.read_word(self.pc);
        self.pc = self.pc.wrapping_add(2);
        self.rra(addr);
        self.cycles += 6;
    }
    
    /// RRA Absolute,X
    pub(crate) fn rra_absx(&mut self) {
        let addr = self.read_word(self.pc).wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        self.rra(addr);
        self.cycles += 7;
    }
    
    /// RRA Absolute,Y
    pub(crate) fn rra_absy(&mut self) {
        let addr = self.read_word(self.pc).wrapping_add(self.y as u16);
        self.pc = self.pc.wrapping_add(2);
        self.rra(addr);
        self.cycles += 7;
    }
    
    /// RRA Indexed Indirect (zp,X)
    pub(crate) fn rra_izx(&mut self) {
        let base = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        let ptr = base.wrapping_add(self.x);
        let addr = self.read_word_zp(ptr);
        self.rra(addr);
        self.cycles += 8;
    }
    
    /// RRA Indirect Indexed (zp),Y
    pub(crate) fn rra_izy(&mut self) {
        let ptr = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        let base = self.read_word_zp(ptr);
        let addr = base.wrapping_add(self.y as u16);
        self.rra(addr);
        self.cycles += 8;
    }
    
    /// DCP - Decrement then Compare (illegal opcode)
    /// DEC + CMP combined
    pub(crate) fn dcp(&mut self, addr: u16) {
        let value = self.read_byte(addr).wrapping_sub(1);
        self.write_byte(addr, value);
        self.compare(self.a, value);
    }
    
    /// DCP Zero Page
    pub(crate) fn dcp_zp(&mut self) {
        let addr = self.read_byte(self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.dcp(addr);
        self.cycles += 5;
    }
    
    /// DCP Zero Page,X
    pub(crate) fn dcp_zpx(&mut self) {
        let addr = self.read_byte(self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.dcp(addr);
        self.cycles += 6;
    }
    
    /// DCP Absolute
    pub(crate) fn dcp_abs(&mut self) {
        let addr = self.read_word(self.pc);
        self.pc = self.pc.wrapping_add(2);
        self.dcp(addr);
        self.cycles += 6;
    }
    
    /// DCP Absolute,X
    pub(crate) fn dcp_absx(&mut self) {
        let addr = self.read_word(self.pc).wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        self.dcp(addr);
        self.cycles += 7;
    }
    
    /// DCP Absolute,Y
    pub(crate) fn dcp_absy(&mut self) {
        let addr = self.read_word(self.pc).wrapping_add(self.y as u16);
        self.pc = self.pc.wrapping_add(2);
        self.dcp(addr);
        self.cycles += 7;
    }
    
    /// DCP Indexed Indirect (zp,X)
    pub(crate) fn dcp_izx(&mut self) {
        let base = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        let ptr = base.wrapping_add(self.x);
        let addr = self.read_word_zp(ptr);
        self.dcp(addr);
        self.cycles += 8;
    }
    
    /// DCP Indirect Indexed (zp),Y
    pub(crate) fn dcp_izy(&mut self) {
        let ptr = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        let base = self.read_word_zp(ptr);
        let addr = base.wrapping_add(self.y as u16);
        self.dcp(addr);
        self.cycles += 8;
    }
    
    /// ISC - Increment then SBC (illegal opcode)
    /// INC + SBC combined
    pub(crate) fn isc(&mut self, addr: u16) {
        let value = self.read_byte(addr).wrapping_add(1);
        self.write_byte(addr, value);
        self.sbc(value);
    }
    
    /// ISC Zero Page
    pub(crate) fn isc_zp(&mut self) {
        let addr = self.read_byte(self.pc) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.isc(addr);
        self.cycles += 5;
    }
    
    /// ISC Zero Page,X
    pub(crate) fn isc_zpx(&mut self) {
        let addr = self.read_byte(self.pc).wrapping_add(self.x) as u16;
        self.pc = self.pc.wrapping_add(1);
        self.isc(addr);
        self.cycles += 6;
    }
    
    /// ISC Absolute
    pub(crate) fn isc_abs(&mut self) {
        let addr = self.read_word(self.pc);
        self.pc = self.pc.wrapping_add(2);
        self.isc(addr);
        self.cycles += 6;
    }
    
    /// ISC Absolute,X
    pub(crate) fn isc_absx(&mut self) {
        let addr = self.read_word(self.pc).wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        self.isc(addr);
        self.cycles += 7;
    }
    
    /// ISC Absolute,Y
    pub(crate) fn isc_absy(&mut self) {
        let addr = self.read_word(self.pc).wrapping_add(self.y as u16);
        self.pc = self.pc.wrapping_add(2);
        self.isc(addr);
        self.cycles += 7;
    }
    
    /// ISC Indexed Indirect (zp,X)
    pub(crate) fn isc_izx(&mut self) {
        let base = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        let ptr = base.wrapping_add(self.x);
        let addr = self.read_word_zp(ptr);
        self.isc(addr);
        self.cycles += 8;
    }
    
    /// ISC Indirect Indexed (zp),Y
    pub(crate) fn isc_izy(&mut self) {
        let ptr = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        let base = self.read_word_zp(ptr);
        let addr = base.wrapping_add(self.y as u16);
        self.isc(addr);
        self.cycles += 8;
    }
    
    /// ANC - AND with Carry (illegal opcode)
    /// AND immediate, copy N to C
    pub(crate) fn anc(&mut self) {
        let value = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        self.a &= value;
        self.update_nz(self.a);
        self.set_flag(flags::CARRY, self.get_flag(flags::NEGATIVE));
        self.cycles += 2;
    }
    
    /// ALR - AND then LSR (illegal opcode)
    /// AND immediate + LSR
    pub(crate) fn alr(&mut self) {
        let value = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        self.a &= value;
        self.set_flag(flags::CARRY, (self.a & 0x01) != 0);
        self.a >>= 1;
        self.update_nz(self.a);
        self.cycles += 2;
    }
    
    /// ARR - AND then ROR (illegal opcode)
    /// Complex BCD-aware operation
    pub(crate) fn arr(&mut self) {
        let value = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        self.a &= value;
        self.a = (self.a >> 1) | (if self.get_flag(flags::CARRY) { 0x80 } else { 0 });
        self.set_flag(flags::CARRY, (self.a & 0x40) != 0);
        self.set_flag(flags::OVERFLOW, ((self.a & 0x40) ^ ((self.a & 0x20) << 1)) != 0);
        self.update_nz(self.a);
        self.cycles += 2;
    }
    
    /// AXS/SBX - A AND X minus immediate (illegal opcode)
    /// X = (A & X) - immediate
    pub(crate) fn axs(&mut self) {
        let value = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        let result = (self.a & self.x).wrapping_sub(value);
        self.x = result;
        self.set_flag(flags::CARRY, (self.a & self.x) >= value);
        self.update_nz(self.x);
        self.cycles += 2;
    }
    
    /// AHX - Store A & X & (H+1) (illegal opcode)
    /// Unstable on real hardware
    pub(crate) fn ahx(&mut self, addr: u16) {
        let high_byte = ((addr >> 8) as u8).wrapping_add(1);
        let value = self.a & self.x & high_byte;
        self.write_byte(addr, value);
    }
    
    /// AHX Absolute,Y
    pub(crate) fn ahx_aby(&mut self) {
        let base = self.read_word(self.pc);
        let addr = base.wrapping_add(self.y as u16);
        self.pc = self.pc.wrapping_add(2);
        self.ahx(addr);
        self.cycles += 5;
    }
    
    /// AHX Indirect Indexed (zp),Y
    pub(crate) fn ahx_izy(&mut self) {
        let ptr = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        let base = self.read_word_zp(ptr);
        let addr = base.wrapping_add(self.y as u16);
        self.ahx(addr);
        self.cycles += 6;
    }
    
    /// SHY - Store Y & (H+1) (illegal opcode)
    /// Unstable on real hardware
    pub(crate) fn shy(&mut self) {
        let base = self.read_word(self.pc);
        let addr = base.wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        let high_byte = ((addr >> 8) as u8).wrapping_add(1);
        let value = self.y & high_byte;
        self.write_byte(addr, value);
        self.cycles += 5;
    }
    
    /// SHX - Store X & (H+1) (illegal opcode)
    /// Unstable on real hardware
    pub(crate) fn shx(&mut self) {
        let base = self.read_word(self.pc);
        let addr = base.wrapping_add(self.y as u16);
        self.pc = self.pc.wrapping_add(2);
        let high_byte = ((addr >> 8) as u8).wrapping_add(1);
        let value = self.x & high_byte;
        self.write_byte(addr, value);
        self.cycles += 5;
    }
    
    /// TAS - Transfer A&X to S, store A&X&(H+1) (illegal opcode)
    /// Unstable on real hardware
    pub(crate) fn tas(&mut self) {
        let base = self.read_word(self.pc);
        let addr = base.wrapping_add(self.y as u16);
        self.pc = self.pc.wrapping_add(2);
        self.s = self.a & self.x;
        let high_byte = ((addr >> 8) as u8).wrapping_add(1);
        let value = self.a & self.x & high_byte;
        self.write_byte(addr, value);
        self.cycles += 5;
    }
    
    /// LAS - Load A, X, S with memory & S (illegal opcode)
    pub(crate) fn las(&mut self) {
        let base = self.read_word(self.pc);
        let addr = base.wrapping_add(self.y as u16);
        self.pc = self.pc.wrapping_add(2);
        let value = self.read_byte(addr) & self.s;
        self.a = value;
        self.x = value;
        self.s = value;
        self.update_nz(value);
        self.cycles += if (base & 0xFF00) != (addr & 0xFF00) { 5 } else { 4 };
    }
    
    /// XAA - Transfer X to A, then AND with immediate (illegal opcode)
    /// Highly unstable on real hardware - simplified implementation
    pub(crate) fn xaa(&mut self) {
        let value = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        self.a = self.x & value;
        self.update_nz(self.a);
        self.cycles += 2;
    }
    
    /// KIL/JAM - Halt the CPU (illegal opcode)
    /// Freezes execution at current PC
    pub(crate) fn kil(&mut self) {
        // In real hardware this would jam the CPU requiring a reset
        // For emulation, we decrement PC to simulate the jam state
        self.pc = self.pc.wrapping_sub(1);
        self.cycles += 2;
    }
    
    /// NOP variants for illegal opcodes
    /// Various NOPs with different addressing modes
    pub(crate) fn nop_zp(&mut self) {
        let _addr = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        self.cycles += 3;
    }
    
    pub(crate) fn nop_zpx(&mut self) {
        let _addr = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        self.cycles += 4;
    }
    
    pub(crate) fn nop_abs(&mut self) {
        let _addr = self.read_word(self.pc);
        self.pc = self.pc.wrapping_add(2);
        self.cycles += 4;
    }
    
    pub(crate) fn nop_abx(&mut self) {
        let base = self.read_word(self.pc);
        let addr = base.wrapping_add(self.x as u16);
        self.pc = self.pc.wrapping_add(2);
        self.cycles += if (base & 0xFF00) != (addr & 0xFF00) { 5 } else { 4 };
    }
    
    pub(crate) fn nop_implied(&mut self) {
        self.cycles += 2;
    }
}