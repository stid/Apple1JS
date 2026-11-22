/*!
 * 6502 CPU Core Implementation
 */

use crate::console_log;
use std::collections::HashSet;

/// Status register flags
pub mod flags {
    pub const CARRY: u8 = 0x01; // C
    pub const ZERO: u8 = 0x02; // Z
    pub const INTERRUPT: u8 = 0x04; // I
    pub const DECIMAL: u8 = 0x08; // D
    pub const BREAK: u8 = 0x10; // B
    pub const UNUSED: u8 = 0x20; // Always 1
    pub const OVERFLOW: u8 = 0x40; // V
    pub const NEGATIVE: u8 = 0x80; // N
}

/// 6502 CPU implementation
pub struct CPU6502 {
    // Registers
    pub(crate) pc: u16,    // Program Counter
    pub(crate) a: u8,      // Accumulator
    pub(crate) x: u8,      // X Index Register
    pub(crate) y: u8,      // Y Index Register
    pub(crate) s: u8,      // Stack Pointer
    pub(crate) status: u8, // Status Register (NV-BDIZC)

    // No internal memory - all memory access goes through JavaScript Bus

    // Interrupt state
    pub(crate) irq: bool,
    pub(crate) nmi: bool,
    pub(crate) nmi_pending: bool,

    // Performance tracking
    pub(crate) cycles: u64,
    pub(crate) instructions: u64,

    // Breakpoint support
    breakpoints: HashSet<u16>,
    breakpoint_hit: Option<u16>,

    // Profiling support
    profiling_enabled: bool,
    opcode_counts: [u64; 256],

    // Last bus access (for debugger HW_ADDR / HW_DATA parity with the JS engine)
    last_addr: u16,
    last_data: u8,

    // Bus accesses made by the CPU, per 256-byte page: slot `page` counts reads,
    // slot `256 + page` counts writes. The Board turns these into per-part
    // activity. Debugger access goes straight to the bus and is not counted.
    // 32-bit and wrapping, like the JS engine's Uint32Array: consumers compare
    // two samples and treat a count that went down as a restart.
    pub(crate) page_activity: [u32; PAGE_ACTIVITY_SLOTS],
}

/// One read slot and one write slot per page of the 64K address space.
pub(crate) const PAGE_ACTIVITY_SLOTS: usize = 512;

impl CPU6502 {
    /// Create a new CPU instance
    pub fn new() -> Self {
        console_log!("Creating new WASM CPU6502 instance");

        CPU6502 {
            pc: 0xFFFC, // Reset vector
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
            breakpoints: HashSet::new(),
            breakpoint_hit: None,
            profiling_enabled: false,
            opcode_counts: [0; 256],
            last_addr: 0,
            last_data: 0,
            page_activity: [0; PAGE_ACTIVITY_SLOTS],
        }
    }

    /// Reset the CPU using internal Bus (for WasmSystem)
    pub(crate) fn reset_with_bus(&mut self, bus: &crate::Bus) {
        // Read reset vector from 0xFFFC-0xFFFD from internal Bus
        let low = bus.read(0xFFFC) as u16;
        let high = bus.read(0xFFFD) as u16;
        self.pc = (high << 8) | low;

        // Reset performs three *fake* stack reads: it pushes nothing, but the
        // stack pointer still decrements three times. A/X/Y and the flags are
        // untouched apart from setting I — on the NMOS part D is simply left
        // undefined, which is why WOZMON opens with CLD.
        self.s = self.s.wrapping_sub(3);
        self.status |= flags::UNUSED | flags::INTERRUPT;
        self.irq = false;
        self.nmi = false;
        // A latched NMI must not survive reset.
        self.nmi_pending = false;
        self.cycles = 0;
        self.instructions = 0;
        // Counts restart at reset. The JS engine clears them at the same point,
        // so "since reset" means the same thing on both.
        self.page_activity = [0; PAGE_ACTIVITY_SLOTS];

        console_log!("CPU reset (Bus-aware), PC = 0x{:04X}", self.pc);
    }

    /// Execute a single instruction with internal Bus (for WasmSystem)
    /// Returns 0 if a breakpoint was hit, otherwise returns cycles used
    pub(crate) fn step_with_bus(&mut self, bus: &mut crate::Bus) -> u32 {
        // Check for breakpoint BEFORE executing
        if !self.breakpoints.is_empty() && self.breakpoints.contains(&self.pc) {
            self.breakpoint_hit = Some(self.pc);
            return 0; // Signal breakpoint hit - no cycles consumed
        }

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

        // Track opcode execution if profiling is enabled
        if self.profiling_enabled {
            self.opcode_counts[opcode as usize] += 1;
        }

        // Execute instruction with bus
        self.execute_instruction_with_bus(opcode, bus);

        self.instructions += 1;

        (self.cycles - start_cycles) as u32
    }

    // ============ State Management ============

    // ============ Register Access ============

    pub fn set_pc(&mut self, value: u16) {
        self.pc = value;
    }

    pub fn set_a(&mut self, value: u8) {
        self.a = value;
    }

    pub fn set_x(&mut self, value: u8) {
        self.x = value;
    }

    pub fn set_y(&mut self, value: u8) {
        self.y = value;
    }

    pub fn set_s(&mut self, value: u8) {
        self.s = value;
    }

    pub fn set_status(&mut self, value: u8) {
        self.status = value;
    }

    /// Get CPU status as byte (internal)
    pub(crate) fn get_status(&self) -> u8 {
        self.status | flags::UNUSED // Bit 5 is always 1
    }

    // ============ Internal Getters for WasmSystem ============

    /// Get program counter (internal)
    pub(crate) fn get_pc(&self) -> u16 {
        self.pc
    }

    /// Get accumulator (internal)
    pub(crate) fn get_a(&self) -> u8 {
        self.a
    }

    /// Get X register (internal)
    pub(crate) fn get_x(&self) -> u8 {
        self.x
    }

    /// Get Y register (internal)
    pub(crate) fn get_y(&self) -> u8 {
        self.y
    }

    /// Get stack pointer (internal)
    pub(crate) fn get_s(&self) -> u8 {
        self.s
    }

    /// Get cycle count (internal)
    pub(crate) fn get_cycles(&self) -> u64 {
        self.cycles
    }

    /// Get instruction count (internal)
    pub(crate) fn get_instructions(&self) -> u64 {
        self.instructions
    }

    /// Get IRQ state (internal)
    pub(crate) fn get_irq(&self) -> bool {
        self.irq
    }

    /// Get NMI pending state (internal)
    pub(crate) fn get_nmi_pending(&self) -> bool {
        self.nmi_pending
    }

    // ============ Memory Access ============

    // Note: memory_ptr removed as we no longer have internal memory
    // All memory access goes through JavaScript Bus

    // ============ Performance Metrics ============

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

    // ============ Breakpoint Support ============

    /// Add a breakpoint at the specified address
    pub fn set_breakpoint(&mut self, addr: u16) {
        self.breakpoints.insert(addr);
    }

    /// Remove a breakpoint at the specified address
    pub fn clear_breakpoint(&mut self, addr: u16) {
        self.breakpoints.remove(&addr);
    }

    /// Clear all breakpoints
    pub fn clear_all_breakpoints(&mut self) {
        self.breakpoints.clear();
        self.breakpoint_hit = None;
    }

    /// Check if a breakpoint was hit (returns the address or -1 if none)
    pub fn get_breakpoint_hit(&self) -> i32 {
        match self.breakpoint_hit {
            Some(addr) => addr as i32,
            None => -1,
        }
    }

    /// Clear the breakpoint hit flag
    pub fn clear_breakpoint_hit(&mut self) {
        self.breakpoint_hit = None;
    }

    // ============ Profiling Support ============

    /// Enable or disable profiling
    pub fn enable_profiling(&mut self, enabled: bool) {
        self.profiling_enabled = enabled;
        if enabled {
            // Reset counts when profiling is enabled
            self.opcode_counts = [0; 256];
        }
    }

    /// Check if profiling is enabled
    pub fn is_profiling_enabled(&self) -> bool {
        self.profiling_enabled
    }

    /// Get total instruction count from profiling
    pub fn get_profiled_instruction_count(&self) -> u64 {
        self.opcode_counts.iter().sum()
    }

    /// Get top N most executed opcodes as JSON-compatible data
    /// Returns pairs of (opcode, count) sorted by count descending
    pub fn get_top_opcodes(&self, count: usize) -> Vec<u8> {
        // Create pairs of (opcode, count) for non-zero counts
        let mut pairs: Vec<(u8, u64)> = self
            .opcode_counts
            .iter()
            .enumerate()
            .filter(|(_, &c)| c > 0)
            .map(|(op, &c)| (op as u8, c))
            .collect();

        // Sort by count descending
        pairs.sort_by_key(|pair| std::cmp::Reverse(pair.1));

        // Take top N and flatten to bytes: [op1, count1_low, count1_high, ...]
        // Using 9 bytes per entry: 1 for opcode + 8 for u64 count
        let mut result = Vec::with_capacity(count * 9);
        for (op, cnt) in pairs.into_iter().take(count) {
            result.push(op);
            result.extend_from_slice(&cnt.to_le_bytes());
        }
        result
    }
}

// Internal implementation
impl CPU6502 {
    /// Read a byte from memory using internal Bus (for WasmSystem)
    pub(crate) fn read_byte_from_bus(&mut self, bus: &crate::Bus, address: u16) -> u8 {
        // Cycles are accounted per instruction by the opcode arms (the same
        // model as the JS engine); a bus access must not add to the count.
        let data = bus.read(address);
        self.last_addr = address;
        self.last_data = data;
        let reads = &mut self.page_activity[(address >> 8) as usize];
        *reads = reads.wrapping_add(1);
        data
    }

    /// Write a byte to memory using internal Bus (for WasmSystem)
    pub(crate) fn write_byte_to_bus(&mut self, bus: &mut crate::Bus, address: u16, value: u8) {
        self.last_addr = address;
        self.last_data = value;
        let writes = &mut self.page_activity[256 + (address >> 8) as usize];
        *writes = writes.wrapping_add(1);
        bus.write(address, value);
    }

    /// Per-page access counts since reset (see `page_activity`).
    pub(crate) fn get_page_activity(&self) -> &[u32; PAGE_ACTIVITY_SLOTS] {
        &self.page_activity
    }

    /// Last bus-access address (for debugger HW_ADDR)
    pub(crate) fn get_last_addr(&self) -> u16 {
        self.last_addr
    }

    /// Last bus-access data (for debugger HW_DATA)
    pub(crate) fn get_last_data(&self) -> u8 {
        self.last_data
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

    /// Handle IRQ interrupt with internal Bus
    fn handle_irq_with_bus(&mut self, bus: &mut crate::Bus) {
        self.push_byte_to_bus(bus, (self.pc >> 8) as u8);
        self.push_byte_to_bus(bus, self.pc as u8);
        // B is not a real flag: a hardware interrupt pushes it clear (only BRK
        // and PHP push it set), whatever PLP/RTI left in bit 4.
        self.push_byte_to_bus(bus, (self.status | flags::UNUSED) & !flags::BREAK);
        self.set_flag(flags::INTERRUPT, true);
        self.pc = self.read_word_from_bus(bus, 0xFFFE);
        self.cycles += 7;
    }

    /// Handle NMI interrupt with internal Bus
    fn handle_nmi_with_bus(&mut self, bus: &mut crate::Bus) {
        self.push_byte_to_bus(bus, (self.pc >> 8) as u8);
        self.push_byte_to_bus(bus, self.pc as u8);
        // B is not a real flag: a hardware interrupt pushes it clear (only BRK
        // and PHP push it set), whatever PLP/RTI left in bit 4.
        self.push_byte_to_bus(bus, (self.status | flags::UNUSED) & !flags::BREAK);
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
    pub(crate) fn pop_byte_from_bus(&mut self, bus: &crate::Bus) -> u8 {
        self.s = self.s.wrapping_add(1);
        self.read_byte_from_bus(bus, 0x0100 | (self.s as u16))
    }

    /// Execute an instruction with internal Bus (for WasmSystem)
    /// This implementation uses the internal Bus to eliminate WASM→JS boundary crossings
    pub(crate) fn execute_instruction_with_bus(&mut self, opcode: u8, bus: &mut crate::Bus) {
        // Use Bus-aware dispatch table for maximum performance
        self.dispatch_opcode_with_bus(bus, opcode);
    }
}
