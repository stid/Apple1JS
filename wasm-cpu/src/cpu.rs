/*!
 * 6502 CPU Core Implementation
 */

use wasm_bindgen::prelude::*;
use crate::{CPUState, Metrics, console_log};

/// Status register flags
pub mod flags {
    pub const CARRY: u8 = 0x01;      // C
    pub const ZERO: u8 = 0x02;       // Z
    pub const INTERRUPT: u8 = 0x04;  // I
    pub const DECIMAL: u8 = 0x08;    // D
    pub const BREAK: u8 = 0x10;      // B
    pub const UNUSED: u8 = 0x20;     // Always 1
    pub const OVERFLOW: u8 = 0x40;   // V
    pub const NEGATIVE: u8 = 0x80;   // N
}

/// 6502 CPU implementation
#[wasm_bindgen]
pub struct CPU6502 {
    // Registers
    pub(crate) pc: u16,  // Program Counter
    pub(crate) a: u8,    // Accumulator
    pub(crate) x: u8,    // X Index Register
    pub(crate) y: u8,    // Y Index Register
    pub(crate) s: u8,    // Stack Pointer
    pub(crate) status: u8, // Status Register (NV-BDIZC)
    
    // No internal memory - all memory access goes through JavaScript Bus
    
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
impl CPU6502 {
    /// Create a new CPU instance
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        console_log!("Creating new WASM CPU6502 instance");
        
        CPU6502 {
            pc: 0xFFFC,  // Reset vector
            a: 0,
            x: 0,
            y: 0,
            s: 0xFF,
            status: flags::UNUSED | flags::INTERRUPT, // Start with interrupts disabled
            irq: false,
            nmi: false,
            nmi_pending: false,
            cycles: 0,
            instructions: 0,
            last_step_start: 0.0,
        }
    }
    
    /// Reset the CPU (uses JavaScript bridge)
    pub fn reset(&mut self) {
        // Read reset vector from 0xFFFC-0xFFFD via Bus
        let low = crate::bus_read(0xFFFC) as u16;
        let high = crate::bus_read(0xFFFD) as u16;
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

        console_log!("CPU reset, PC = 0x{:04X}", self.pc);
    }

    /// Reset the CPU using internal Bus (for WasmSystem)
    pub(crate) fn reset_with_bus(&mut self, bus: &crate::Bus) {
        // Read reset vector from 0xFFFC-0xFFFD from internal Bus
        let low = bus.read(0xFFFC) as u16;
        let high = bus.read(0xFFFD) as u16;
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

        console_log!("CPU reset (Bus-aware), PC = 0x{:04X}", self.pc);
    }
    
    /// Execute a single instruction (using JavaScript Bus bridge)
    pub fn step(&mut self) -> u32 {
        #[cfg(feature = "performance")]
        let start = crate::now();

        let start_cycles = self.cycles;

        // Check for interrupts
        if self.nmi_pending {
            self.handle_nmi();
            self.nmi_pending = false;
        } else if self.irq && !self.get_flag(flags::INTERRUPT) {
            self.handle_irq();
        }

        // Fetch opcode
        let opcode = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);

        // Execute instruction
        self.execute_instruction(opcode);

        self.instructions += 1;

        #[cfg(feature = "performance")]
        {
            self.last_step_start = crate::now() - start;
        }

        (self.cycles - start_cycles) as u32
    }

    /// Execute a single instruction with internal Bus (for WasmSystem)
    pub(crate) fn step_with_bus(&mut self, bus: &mut crate::Bus) -> u32 {
        #[cfg(feature = "performance")]
        let start = crate::now();

        let start_cycles = self.cycles;

        // Check for interrupts
        if self.nmi_pending {
            self.handle_nmi_with_bus(bus);
            self.nmi_pending = false;
        } else if self.irq && !self.get_flag(flags::INTERRUPT) {
            self.handle_irq_with_bus(bus);
        }

        // Fetch opcode
        let opcode = self.read_byte_from_bus(bus, self.pc);
        self.pc = self.pc.wrapping_add(1);

        // Execute instruction with bus
        self.execute_instruction_with_bus(opcode, bus);

        self.instructions += 1;

        #[cfg(feature = "performance")]
        {
            self.last_step_start = crate::now() - start;
        }

        (self.cycles - start_cycles) as u32
    }
    
    /// Execute multiple cycles
    pub fn step_cycles(&mut self, target_cycles: u32) -> u32 {
        let start_cycles = self.cycles;
        let target = start_cycles + target_cycles as u64;
        
        while self.cycles < target {
            self.step();
        }
        
        (self.cycles - start_cycles) as u32
    }
    
    // ============ State Management ============
    
    /// Save CPU state
    pub fn save_state(&self) -> JsValue {
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
    
    /// Load CPU state
    pub fn load_state(&mut self, state: &JsValue) {
        let state: CPUState = serde_wasm_bindgen::from_value(state.clone()).unwrap();
        
        self.pc = state.pc;
        self.a = state.a;
        self.x = state.x;
        self.y = state.y;
        self.s = state.s;
        self.status = state.status;
        self.cycles = state.cycles;
        self.irq = state.irq;
        self.nmi = state.nmi;
    }
    
    // ============ Register Access ============

    #[wasm_bindgen(getter)]
    pub fn pc(&self) -> u16 { self.pc }

    #[wasm_bindgen(setter)]
    pub fn set_pc(&mut self, value: u16) { self.pc = value; }

    #[wasm_bindgen(getter)]
    pub fn a(&self) -> u8 { self.a }

    #[wasm_bindgen(setter)]
    pub fn set_a(&mut self, value: u8) { self.a = value; }

    #[wasm_bindgen(getter)]
    pub fn x(&self) -> u8 { self.x }

    #[wasm_bindgen(setter)]
    pub fn set_x(&mut self, value: u8) { self.x = value; }

    #[wasm_bindgen(getter)]
    pub fn y(&self) -> u8 { self.y }

    #[wasm_bindgen(setter)]
    pub fn set_y(&mut self, value: u8) { self.y = value; }

    #[wasm_bindgen(getter)]
    pub fn s(&self) -> u8 { self.s }

    #[wasm_bindgen(setter)]
    pub fn set_s(&mut self, value: u8) { self.s = value; }

    #[wasm_bindgen(getter)]
    pub fn status(&self) -> u8 { self.status }

    #[wasm_bindgen(setter)]
    pub fn set_status(&mut self, value: u8) { self.status = value; }

    /// Get CPU status as byte (internal)
    pub(crate) fn get_status(&self) -> u8 {
        self.status | flags::UNUSED // Bit 5 is always 1
    }

    // ============ Internal Getters for WasmSystem ============

    /// Get program counter (internal)
    pub(crate) fn get_pc(&self) -> u16 { self.pc }

    /// Get accumulator (internal)
    pub(crate) fn get_a(&self) -> u8 { self.a }

    /// Get X register (internal)
    pub(crate) fn get_x(&self) -> u8 { self.x }

    /// Get Y register (internal)
    pub(crate) fn get_y(&self) -> u8 { self.y }

    /// Get stack pointer (internal)
    pub(crate) fn get_s(&self) -> u8 { self.s }

    /// Get cycle count (internal)
    pub(crate) fn get_cycles(&self) -> u64 { self.cycles }

    /// Get instruction count (internal)
    pub(crate) fn get_instructions(&self) -> u64 { self.instructions }

    /// Get IRQ state (internal)
    pub(crate) fn get_irq(&self) -> bool { self.irq }

    /// Get NMI pending state (internal)
    pub(crate) fn get_nmi_pending(&self) -> bool { self.nmi_pending }

    // ============ Memory Access ============
    
    /// Read a byte from memory via JavaScript Bus
    pub fn read_memory(&self, address: u16) -> u8 {
        crate::bus_read(address)
    }
    
    /// Write a byte to memory via JavaScript Bus
    pub fn write_memory(&mut self, address: u16, value: u8) {
        crate::bus_write(address, value);
    }
    
    /// Read a range of memory via JavaScript Bus
    pub fn read_memory_range(&self, start: u16, length: u16) -> Vec<u8> {
        let mut result = Vec::with_capacity(length as usize);
        for i in 0..length {
            result.push(crate::bus_read(start + i));
        }
        result
    }
    
    /// Write a range of memory via JavaScript Bus
    pub fn write_memory_range(&mut self, start: u16, data: &[u8]) {
        for (i, &byte) in data.iter().enumerate() {
            crate::bus_write(start + i as u16, byte);
        }
    }
    
    // Note: memory_ptr removed as we no longer have internal memory
    // All memory access goes through JavaScript Bus
    
    // ============ Performance Metrics ============
    
    /// Get performance metrics
    pub fn get_metrics(&self) -> JsValue {
        let metrics = Metrics {
            cycles: self.cycles,
            instructions: self.instructions,
            average_ips: if self.cycles > 0 {
                (self.instructions as f64 / self.cycles as f64) * 1_000_000.0
            } else {
                0.0
            },
            last_step_duration: self.last_step_start,
        };
        
        serde_wasm_bindgen::to_value(&metrics).unwrap()
    }
    
    /// Reset metrics
    pub fn reset_metrics(&mut self) {
        self.cycles = 0;
        self.instructions = 0;
    }
    
    // ============ Interrupt Handling ============
    
    /// Trigger IRQ
    pub fn trigger_irq(&mut self) {
        self.irq = true;
    }
    
    /// Clear IRQ
    pub fn clear_irq(&mut self) {
        self.irq = false;
    }
    
    /// Trigger NMI
    pub fn trigger_nmi(&mut self) {
        self.nmi_pending = true;
    }
}

// Internal implementation
impl CPU6502 {
    /// Read a byte from memory (internal) via JavaScript Bus
    pub(crate) fn read_byte(&mut self, address: u16) -> u8 {
        self.cycles += 1;
        // Use JavaScript Bus.read() as single source of truth
        crate::bus_read(address)
    }

    /// Write a byte to memory (internal) via JavaScript Bus
    pub(crate) fn write_byte(&mut self, address: u16, value: u8) {
        self.cycles += 1;
        // Use JavaScript Bus.write() as single source of truth
        crate::bus_write(address, value);
    }

    /// Read a byte from memory using internal Bus (for WasmSystem)
    pub(crate) fn read_byte_from_bus(&mut self, bus: &crate::Bus, address: u16) -> u8 {
        self.cycles += 1;
        bus.read(address)
    }

    /// Write a byte to memory using internal Bus (for WasmSystem)
    pub(crate) fn write_byte_to_bus(&mut self, bus: &mut crate::Bus, address: u16, value: u8) {
        self.cycles += 1;
        bus.write(address, value);
    }
    
    /// Read a word from memory (little-endian)
    pub(crate) fn read_word(&mut self, address: u16) -> u16 {
        let low = self.read_byte(address) as u16;
        let high = self.read_byte(address.wrapping_add(1)) as u16;
        (high << 8) | low
    }
    
    /// Read a word from zero page memory (handles wrap-around within zero page)
    pub(crate) fn read_word_zp(&mut self, address: u8) -> u16 {
        let low = self.read_byte(address as u16) as u16;
        let high = self.read_byte(address.wrapping_add(1) as u16) as u16;
        (high << 8) | low
    }
    
    /// Push byte to stack
    pub(crate) fn push(&mut self, value: u8) {
        self.write_byte(0x0100 | self.s as u16, value);
        self.s = self.s.wrapping_sub(1);
    }
    
    /// Pop byte from stack
    #[allow(dead_code)]
    pub(crate) fn pop(&mut self) -> u8 {
        self.s = self.s.wrapping_add(1);
        self.read_byte(0x0100 | self.s as u16)
    }
    
    /// Set a status flag
    pub(crate) fn set_flag(&mut self, flag: u8, value: bool) {
        if value {
            self.status |= flag;
        } else {
            self.status &= !flag;
        }
    }
    
    /// Get a status flag
    pub(crate) fn get_flag(&self, flag: u8) -> bool {
        (self.status & flag) != 0
    }
    
    /// Update Zero and Negative flags
    pub(crate) fn update_nz(&mut self, value: u8) {
        self.set_flag(flags::ZERO, value == 0);
        self.set_flag(flags::NEGATIVE, (value & 0x80) != 0);
    }
    
    /// Push a byte onto the stack
    pub(crate) fn push_byte(&mut self, value: u8) {
        self.write_byte(0x0100 | (self.s as u16), value);
        self.s = self.s.wrapping_sub(1);
    }
    
    /// Pop a byte from the stack
    pub(crate) fn pop_byte(&mut self) -> u8 {
        self.s = self.s.wrapping_add(1);
        self.read_byte(0x0100 | (self.s as u16))
    }
    
    /// Push a word onto the stack (high byte first)
    pub(crate) fn push_word(&mut self, value: u16) {
        self.push_byte((value >> 8) as u8);
        self.push_byte(value as u8);
    }
    
    /// Pop a word from the stack (low byte first)
    pub(crate) fn pop_word(&mut self) -> u16 {
        let low = self.pop_byte() as u16;
        let high = self.pop_byte() as u16;
        (high << 8) | low
    }
    
    /// Handle IRQ interrupt
    fn handle_irq(&mut self) {
        self.push((self.pc >> 8) as u8);
        self.push(self.pc as u8);
        self.push(self.status | flags::UNUSED);
        self.set_flag(flags::INTERRUPT, true);
        self.pc = self.read_word(0xFFFE);
        self.cycles += 7;
    }

    /// Handle NMI interrupt
    fn handle_nmi(&mut self) {
        self.push((self.pc >> 8) as u8);
        self.push(self.pc as u8);
        self.push(self.status | flags::UNUSED);
        self.set_flag(flags::INTERRUPT, true);
        self.pc = self.read_word(0xFFFA);
        self.cycles += 7;
    }

    /// Handle IRQ interrupt with internal Bus
    fn handle_irq_with_bus(&mut self, bus: &mut crate::Bus) {
        self.push_byte_to_bus(bus, (self.pc >> 8) as u8);
        self.push_byte_to_bus(bus, self.pc as u8);
        self.push_byte_to_bus(bus, self.status | flags::UNUSED);
        self.set_flag(flags::INTERRUPT, true);
        self.pc = self.read_word_from_bus(bus, 0xFFFE);
        self.cycles += 7;
    }

    /// Handle NMI interrupt with internal Bus
    fn handle_nmi_with_bus(&mut self, bus: &mut crate::Bus) {
        self.push_byte_to_bus(bus, (self.pc >> 8) as u8);
        self.push_byte_to_bus(bus, self.pc as u8);
        self.push_byte_to_bus(bus, self.status | flags::UNUSED);
        self.set_flag(flags::INTERRUPT, true);
        self.pc = self.read_word_from_bus(bus, 0xFFFA);
        self.cycles += 7;
    }

    /// Read a word from memory using internal Bus
    pub(crate) fn read_word_from_bus(&mut self, bus: &crate::Bus, address: u16) -> u16 {
        let low = self.read_byte_from_bus(bus, address) as u16;
        let high = self.read_byte_from_bus(bus, address.wrapping_add(1)) as u16;
        (high << 8) | low
    }

    /// Push byte to stack using internal Bus
    pub(crate) fn push_byte_to_bus(&mut self, bus: &mut crate::Bus, value: u8) {
        self.write_byte_to_bus(bus, 0x0100 | (self.s as u16), value);
        self.s = self.s.wrapping_sub(1);
    }

    /// Pop byte from stack using internal Bus
    #[allow(dead_code)]
    pub(crate) fn pop_byte_from_bus(&mut self, bus: &crate::Bus) -> u8 {
        self.s = self.s.wrapping_add(1);
        self.read_byte_from_bus(bus, 0x0100 | (self.s as u16))
    }
    
    /// Execute an instruction
    pub(crate) fn execute_instruction(&mut self, opcode: u8) {
        self.dispatch_opcode(opcode);
    }

    /// Execute an instruction with internal Bus (for WasmSystem)
    /// This implementation uses the internal Bus to eliminate WASM→JS boundary crossings
    pub(crate) fn execute_instruction_with_bus(&mut self, opcode: u8, bus: &mut crate::Bus) {
        // Use Bus-aware dispatch table for maximum performance
        self.dispatch_opcode_with_bus(bus, opcode);
    }
    
    // ========== Addressing Mode Helpers ==========
    
    /// Get address for indexed indirect mode (zero page,X)
    /// Used for instructions like LDA ($20,X)
    pub(crate) fn get_izx_addr(&mut self) -> u16 {
        let base = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        let addr = base.wrapping_add(self.x);
        let low = self.read_byte(addr as u16) as u16;
        let high = self.read_byte(addr.wrapping_add(1) as u16) as u16;
        (high << 8) | low
    }
    
    /// Get address for indirect indexed mode (zero page),Y
    /// Used for instructions like LDA ($20),Y
    pub(crate) fn get_izy_addr(&mut self) -> u16 {
        let zp_addr = self.read_byte(self.pc);
        self.pc = self.pc.wrapping_add(1);
        let low = self.read_byte(zp_addr as u16) as u16;
        let high = self.read_byte(zp_addr.wrapping_add(1) as u16) as u16;
        let base_addr = (high << 8) | low;
        base_addr.wrapping_add(self.y as u16)
    }
    
    /// Check if page boundary was crossed for indirect indexed mode
    pub(crate) fn check_izy_page_cross(&mut self) -> bool {
        // Read the indirect address from zero page via Bus
        let zp_addr = crate::bus_read(self.pc - 1);
        let low = crate::bus_read(zp_addr as u16) as u16;
        let high = crate::bus_read(zp_addr.wrapping_add(1) as u16) as u16;
        let base_addr = (high << 8) | low;
        let final_addr = base_addr.wrapping_add(self.y as u16);
        (base_addr & 0xFF00) != (final_addr & 0xFF00)
    }
    
    /// Get address for zero page,Y mode
    pub(crate) fn get_zpy_addr(&mut self) -> u16 {
        let addr = self.read_byte(self.pc).wrapping_add(self.y);
        self.pc = self.pc.wrapping_add(1);
        addr as u16
    }
    
    /// Get address for absolute,Y mode
    #[allow(dead_code)]
    pub(crate) fn get_aby_addr(&mut self) -> u16 {
        let base_addr = self.read_word(self.pc);
        self.pc = self.pc.wrapping_add(2);
        base_addr.wrapping_add(self.y as u16)
    }
}