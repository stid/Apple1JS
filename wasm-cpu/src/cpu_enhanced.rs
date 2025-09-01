/*!
 * Enhanced 6502 CPU Core with WASM Memory System
 * 
 * This CPU implementation uses internal WASM memory for maximum performance,
 * eliminating JS↔WASM boundary crossings for most memory operations.
 */

use wasm_bindgen::prelude::*;
use serde_wasm_bindgen;
use crate::{CPUState, Metrics, console_log};
use crate::bus::Bus;
use crate::cpu::flags;

/// Enhanced 6502 CPU with internal WASM memory
#[wasm_bindgen]
pub struct CPU6502Enhanced {
    // Registers
    pub(crate) pc: u16,  // Program Counter
    pub(crate) a: u8,    // Accumulator
    pub(crate) x: u8,    // X Index Register
    pub(crate) y: u8,    // Y Index Register
    pub(crate) s: u8,    // Stack Pointer
    pub(crate) status: u8, // Status Register (NV-BDIZC)
    
    // Internal memory system
    bus: Option<Bus>,
    
    // Interrupt state
    pub(crate) irq: bool,
    pub(crate) nmi: bool,
    pub(crate) nmi_pending: bool,
    
    // Performance tracking
    pub(crate) cycles: u64,
    pub(crate) instructions: u64,
    
    // Timing
    last_step_start: f64,
}

#[wasm_bindgen]
impl CPU6502Enhanced {
    /// Create a new enhanced CPU instance
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        console_log!("Creating new Enhanced WASM CPU6502 with internal memory");
        
        CPU6502Enhanced {
            pc: 0xFFFC,  // Reset vector
            a: 0,
            x: 0,
            y: 0,
            s: 0xFF,
            status: flags::UNUSED | flags::INTERRUPT,
            bus: None,
            irq: false,
            nmi: false,
            nmi_pending: false,
            cycles: 0,
            instructions: 0,
            last_step_start: 0.0,
        }
    }
    
    /// Set the internal bus
    pub fn set_bus(&mut self, bus: Bus) {
        self.bus = Some(bus);
        console_log!("Enhanced CPU: Internal WASM memory system attached");
    }
    
    /// Check if using internal memory
    pub fn has_internal_memory(&self) -> bool {
        self.bus.is_some()
    }
    
    /// Reset the CPU
    pub fn reset(&mut self) {
        // Read reset vector from 0xFFFC-0xFFFD
        let low = self.read_byte(0xFFFC) as u16;
        let high = self.read_byte(0xFFFD) as u16;
        self.pc = (high << 8) | low;
        
        self.a = 0;
        self.x = 0;
        self.y = 0;
        self.s = 0xFF;
        self.status = flags::UNUSED | flags::INTERRUPT;
        self.irq = false;
        self.nmi = false;
        self.cycles = 0;
        self.instructions = 0;
        
        console_log!("Enhanced CPU reset, PC = 0x{:04X}", self.pc);
    }
    
    /// Execute a single instruction
    pub fn step(&mut self) -> u32 {
        let start_cycles = self.cycles;
        
        // Check for interrupts
        if self.nmi_pending {
            self.handle_nmi();
            self.nmi_pending = false;
        } else if self.irq && !self.get_flag(flags::INTERRUPT) {
            self.handle_irq();
        }
        
        // Fetch and execute instruction
        let opcode = self.fetch_byte();
        self.execute_opcode(opcode);
        
        self.instructions += 1;
        
        (self.cycles - start_cycles) as u32
    }
    
    /// Get current state
    pub fn get_state(&self) -> JsValue {
        let state = CPUState {
            pc: self.pc,
            a: self.a,
            x: self.x,
            y: self.y,
            s: self.s,
            status: self.status,
            cycles: self.cycles,
            irq: self.irq,
            nmi: self.nmi,
        };
        
        serde_wasm_bindgen::to_value(&state).unwrap()
    }
    
    /// Set state from JavaScript
    pub fn set_state(&mut self, state: &JsValue) {
        if let Ok(cpu_state) = serde_wasm_bindgen::from_value::<CPUState>(state.clone()) {
            self.pc = cpu_state.pc;
            self.a = cpu_state.a;
            self.x = cpu_state.x;
            self.y = cpu_state.y;
            self.s = cpu_state.s;
            self.status = cpu_state.status;
            self.cycles = cpu_state.cycles;
            self.irq = cpu_state.irq;
            self.nmi = cpu_state.nmi;
        }
    }
    
    /// Get performance metrics
    pub fn get_metrics(&self) -> JsValue {
        let metrics = Metrics {
            cycles: self.cycles,
            instructions: self.instructions,
            average_ips: if self.cycles > 0 {
                self.instructions as f64 / (self.cycles as f64 / 1_000_000.0)
            } else {
                0.0
            },
            last_step_duration: 0.0,
        };
        
        serde_wasm_bindgen::to_value(&metrics).unwrap()
    }
    
    /// Trigger IRQ
    pub fn trigger_irq(&mut self) {
        self.irq = true;
    }
    
    /// Trigger NMI
    pub fn trigger_nmi(&mut self) {
        self.nmi_pending = true;
    }
}

// Internal implementation
impl CPU6502Enhanced {
    /// Read a byte from memory (uses internal bus if available)
    #[inline(always)]
    fn read_byte(&self, address: u16) -> u8 {
        if let Some(ref bus) = self.bus {
            // Use internal WASM memory - FAST!
            bus.read(address)
        } else {
            // Fallback to JavaScript Bus - SLOW!
            crate::bus_read(address)
        }
    }
    
    /// Write a byte to memory (uses internal bus if available)
    #[inline(always)]
    fn write_byte(&mut self, address: u16, value: u8) {
        if let Some(ref mut bus) = self.bus {
            // Use internal WASM memory - FAST!
            bus.write(address, value);
        } else {
            // Fallback to JavaScript Bus - SLOW!
            crate::bus_write(address, value);
        }
    }
    
    /// Fetch the next byte and increment PC
    #[inline(always)]
    fn fetch_byte(&mut self) -> u8 {
        let byte = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        byte
    }
    
    /// Fetch the next word (little-endian) and increment PC
    #[inline(always)]
    fn fetch_word(&mut self) -> u16 {
        let low = self.fetch_byte() as u16;
        let high = self.fetch_byte() as u16;
        (high << 8) | low
    }
    
    /// Push a byte onto the stack
    #[inline(always)]
    fn push_byte(&mut self, value: u8) {
        self.write_byte(0x0100 | self.s as u16, value);
        self.s = self.s.wrapping_sub(1);
    }
    
    /// Pop a byte from the stack
    #[inline(always)]
    fn pop_byte(&mut self) -> u8 {
        self.s = self.s.wrapping_add(1);
        self.read_byte(0x0100 | self.s as u16)
    }
    
    /// Push a word onto the stack (little-endian)
    fn push_word(&mut self, value: u16) {
        self.push_byte((value >> 8) as u8);
        self.push_byte((value & 0xFF) as u8);
    }
    
    /// Pop a word from the stack (little-endian)
    fn pop_word(&mut self) -> u16 {
        let low = self.pop_byte() as u16;
        let high = self.pop_byte() as u16;
        (high << 8) | low
    }
    
    /// Get a status flag
    #[inline(always)]
    fn get_flag(&self, flag: u8) -> bool {
        (self.status & flag) != 0
    }
    
    /// Set a status flag
    #[inline(always)]
    fn set_flag(&mut self, flag: u8, value: bool) {
        if value {
            self.status |= flag;
        } else {
            self.status &= !flag;
        }
    }
    
    /// Update Zero and Negative flags based on a value
    #[inline(always)]
    fn update_zn_flags(&mut self, value: u8) {
        self.set_flag(flags::ZERO, value == 0);
        self.set_flag(flags::NEGATIVE, (value & 0x80) != 0);
    }
    
    /// Handle NMI
    fn handle_nmi(&mut self) {
        self.push_word(self.pc);
        self.push_byte(self.status | flags::UNUSED);
        self.set_flag(flags::INTERRUPT, true);
        
        let low = self.read_byte(0xFFFA) as u16;
        let high = self.read_byte(0xFFFB) as u16;
        self.pc = (high << 8) | low;
        
        self.cycles += 7;
    }
    
    /// Handle IRQ
    fn handle_irq(&mut self) {
        self.push_word(self.pc);
        self.push_byte(self.status | flags::UNUSED);
        self.set_flag(flags::INTERRUPT, true);
        
        let low = self.read_byte(0xFFFE) as u16;
        let high = self.read_byte(0xFFFF) as u16;
        self.pc = (high << 8) | low;
        
        self.cycles += 7;
    }
    
    /// Execute an opcode (simplified - would use full implementation)
    fn execute_opcode(&mut self, _opcode: u8) {
        // This would normally dispatch to the full instruction set
        // For now, just increment PC as a placeholder
        // TODO: Integrate with existing instruction implementations
        self.pc = self.pc.wrapping_add(1);
        self.cycles += 2; // Minimum cycles for an instruction
    }
}

// Make the enhanced CPU compatible with existing instruction implementations
impl CPU6502Enhanced {
    pub(crate) fn read_memory(&self, address: u16) -> u8 {
        self.read_byte(address)
    }
    
    pub(crate) fn write_memory(&mut self, address: u16, value: u8) {
        self.write_byte(address, value);
    }
}