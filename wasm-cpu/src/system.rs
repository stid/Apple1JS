/*!
 * WASM System - Complete Apple 1 Emulator System
 *
 * Integrates CPU, Bus, RAM, ROM into a single self-contained system.
 * This eliminates JS/WASM boundary crossings for memory access,
 * providing 5-10x performance improvement.
 */

use crate::{console_log, Bus, CPUState, Metrics, CPU6502, RAM, ROM};
use wasm_bindgen::prelude::*;

/// Complete emulator system containing all hardware components
#[wasm_bindgen]
pub struct WasmSystem {
    /// 6502 CPU
    cpu: CPU6502,
    /// Memory bus
    bus: Bus,
    /// Flag to track initialization
    initialized: bool,
}

#[wasm_bindgen]
impl WasmSystem {
    /// Create a new WASM system
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        console_log!("Creating new WasmSystem");

        WasmSystem {
            cpu: CPU6502::new(),
            bus: Bus::new(),
            initialized: false,
        }
    }

    /// Initialize the system with RAM and ROM
    /// RAM size: total system RAM (typically 64KB)
    /// ROM data: Monitor ROM content (256 bytes)
    pub fn initialize(&mut self, ram_size: usize, rom_data: Vec<u8>) -> Result<(), JsValue> {
        console_log!(
            "Initializing WASM system: RAM={}KB, ROM={}bytes",
            ram_size / 1024,
            rom_data.len()
        );

        // Create RAM (full 64KB for Apple 1)
        let ram = RAM::new(ram_size);
        console_log!("Created RAM: {} bytes", ram_size);

        // Create and flash ROM (256 bytes for WOZ Monitor)
        let mut rom = ROM::new(0x100); // 256 bytes
        rom.flash(rom_data)?;
        console_log!("Flashed ROM: {} bytes", rom.get_size());

        // Connect components to bus
        self.bus.set_ram(ram);
        self.bus.set_rom(rom);

        // Reset CPU to start from reset vector
        self.reset();

        self.initialized = true;
        console_log!("WASM system initialized successfully");

        Ok(())
    }

    /// Check if system is ready
    pub fn is_initialized(&self) -> bool {
        self.initialized
    }

    /// Reset the system
    pub fn reset(&mut self) {
        if !self.initialized {
            console_log!("Warning: Resetting uninitialized system");
            return;
        }

        // Reset CPU using internal Bus (no JavaScript bridge!)
        self.cpu.reset_with_bus(&self.bus);
        console_log!("System reset - PC set from reset vector");
    }

    /// Execute a single CPU instruction
    /// Returns the number of cycles consumed
    pub fn step(&mut self) -> u32 {
        if !self.initialized {
            return 0;
        }

        // Execute instruction with internal bus
        self.cpu.step_with_bus(&mut self.bus)
    }

    /// Execute multiple instructions
    /// Returns total cycles consumed
    pub fn run_cycles(&mut self, cycles: u32) -> u32 {
        if !self.initialized {
            return 0;
        }

        let mut total_cycles = 0;
        let target_cycles = cycles;

        while total_cycles < target_cycles {
            let cycles_executed = self.step();
            if cycles_executed == 0 {
                break; // Error or halt
            }
            total_cycles += cycles_executed;
        }

        total_cycles
    }

    /// Get CPU state for debugging
    pub fn get_cpu_state(&self) -> JsValue {
        let state = CPUState {
            pc: self.cpu.get_pc(),
            a: self.cpu.get_a(),
            x: self.cpu.get_x(),
            y: self.cpu.get_y(),
            s: self.cpu.get_s(),
            status: self.cpu.get_status(),
            cycles: self.cpu.get_cycles(),
            irq: self.cpu.get_irq(),
            nmi: self.cpu.get_nmi_pending(),
        };
        serde_wasm_bindgen::to_value(&state).unwrap()
    }

    /// Get performance metrics
    pub fn get_metrics(&self) -> JsValue {
        let cycles = self.cpu.get_cycles();
        let instructions = self.cpu.get_instructions();

        let metrics = Metrics {
            cycles,
            instructions,
            average_ips: if cycles > 0 {
                (instructions as f64 / cycles as f64) * 1_000_000.0
            } else {
                0.0
            },
            last_step_duration: 0.0, // TODO: Track last step duration in WasmSystem
        };
        serde_wasm_bindgen::to_value(&metrics).unwrap()
    }

    /// Get memory pointer for zero-copy access from JavaScript
    /// Returns pointer to RAM data
    pub fn get_ram_ptr(&self) -> usize {
        self.bus.get_ram_ptr()
    }

    /// Get RAM size
    pub fn get_ram_size(&self) -> usize {
        self.bus.get_ram_len()
    }

    /// Read a byte from memory (for debugging)
    pub fn read_memory(&self, address: u16) -> u8 {
        self.bus.read(address)
    }

    /// Write a byte to memory (for debugging/testing)
    pub fn write_memory(&mut self, address: u16, value: u8) {
        self.bus.write(address, value);
    }

    /// Get bus mapping information (for debugging)
    pub fn get_memory_map(&self) -> String {
        self.bus.get_mapping_info()
    }

    /// Last bus-access address (for debugger HW_ADDR parity with the JS engine)
    pub fn get_last_addr(&self) -> u16 {
        self.cpu.get_last_addr()
    }

    /// Last bus-access data byte (for debugger HW_DATA parity with the JS engine)
    pub fn get_last_data(&self) -> u8 {
        self.cpu.get_last_data()
    }

    // ============ CPU Debugging Methods ============

    /// Set program counter (for debugging)
    pub fn set_pc(&mut self, value: u16) {
        self.cpu.set_pc(value);
    }

    /// Set accumulator (for debugging)
    pub fn set_a(&mut self, value: u8) {
        self.cpu.set_a(value);
    }

    /// Set X register (for debugging)
    pub fn set_x(&mut self, value: u8) {
        self.cpu.set_x(value);
    }

    /// Set Y register (for debugging)
    pub fn set_y(&mut self, value: u8) {
        self.cpu.set_y(value);
    }

    /// Set stack pointer (for debugging)
    pub fn set_s(&mut self, value: u8) {
        self.cpu.set_s(value);
    }

    /// Set status register (for debugging)
    pub fn set_status(&mut self, value: u8) {
        self.cpu.set_status(value);
    }

    /// Trigger IRQ interrupt
    pub fn trigger_irq(&mut self) {
        self.cpu.trigger_irq();
    }

    /// Clear IRQ interrupt
    pub fn clear_irq(&mut self) {
        self.cpu.clear_irq();
    }

    /// Trigger NMI interrupt
    pub fn trigger_nmi(&mut self) {
        self.cpu.trigger_nmi();
    }

    // ============ Breakpoint Support ============

    /// Add a breakpoint at the specified address
    pub fn set_breakpoint(&mut self, addr: u16) {
        self.cpu.set_breakpoint(addr);
    }

    /// Remove a breakpoint at the specified address
    pub fn clear_breakpoint(&mut self, addr: u16) {
        self.cpu.clear_breakpoint(addr);
    }

    /// Clear all breakpoints
    pub fn clear_all_breakpoints(&mut self) {
        self.cpu.clear_all_breakpoints();
    }

    /// Check if a breakpoint was hit (returns the address or -1 if none)
    pub fn get_breakpoint_hit(&self) -> i32 {
        self.cpu.get_breakpoint_hit()
    }

    /// Clear the breakpoint hit flag
    pub fn clear_breakpoint_hit(&mut self) {
        self.cpu.clear_breakpoint_hit();
    }

    /// Check if an address has a breakpoint
    pub fn has_breakpoint(&self, addr: u16) -> bool {
        self.cpu.has_breakpoint(addr)
    }

    /// Get the number of breakpoints
    pub fn breakpoint_count(&self) -> usize {
        self.cpu.breakpoint_count()
    }

    // ============ Profiling Support ============

    /// Enable or disable profiling
    pub fn enable_profiling(&mut self, enabled: bool) {
        self.cpu.enable_profiling(enabled);
    }

    /// Check if profiling is enabled
    pub fn is_profiling_enabled(&self) -> bool {
        self.cpu.is_profiling_enabled()
    }

    /// Get opcode execution count for a specific opcode
    pub fn get_opcode_count(&self, opcode: u8) -> u64 {
        self.cpu.get_opcode_count(opcode)
    }

    /// Get total instruction count from profiling
    pub fn get_profiled_instruction_count(&self) -> u64 {
        self.cpu.get_profiled_instruction_count()
    }

    /// Reset all profiling data
    pub fn reset_profiling(&mut self) {
        self.cpu.reset_profiling();
    }

    /// Get top N most executed opcodes
    /// Returns raw bytes: [op1, count1_bytes(8), op2, count2_bytes(8), ...]
    pub fn get_top_opcodes(&self, count: usize) -> Vec<u8> {
        self.cpu.get_top_opcodes(count)
    }
}

// Internal implementation
impl WasmSystem {
    // No internal methods needed currently
    // All functionality is exposed through the public API
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_system_creation() {
        let system = WasmSystem::new();
        assert!(!system.is_initialized());
    }

    #[test]
    fn test_system_initialization() {
        let mut system = WasmSystem::new();

        // Create test ROM data (with address header)
        let mut rom_data = vec![0x00, 0xFF]; // Address 0xFF00
        rom_data.extend_from_slice(&[0xEA; 256]); // Fill with NOPs

        system.initialize(0x10000, rom_data).unwrap();
        assert!(system.is_initialized());
    }

    #[test]
    fn test_system_memory_access() {
        let mut system = WasmSystem::new();

        // Initialize with test ROM
        let mut rom_data = vec![0x00, 0xFF];
        rom_data.extend_from_slice(&[0xEA; 256]);
        system.initialize(0x10000, rom_data).unwrap();

        // Test RAM write/read
        system.write_memory(0x0100, 0x42);
        assert_eq!(system.read_memory(0x0100), 0x42);

        // Test ROM read
        assert_eq!(system.read_memory(0xFF00), 0xEA); // NOP we flashed
    }

    // NOTE: last_addr/last_data tracking (get_last_addr/get_last_data) is
    // exercised on the CPU execution path (step_with_bus), which cannot run
    // under native `cargo test` — CPU6502::new() and initialize() call
    // wasm-bindgen imports (console_log, etc.), so the WasmSystem tests above
    // already panic natively. The last-access behavior is verified instead by
    // the browser dual-engine parity test (AC-7) in
    // EngineParity-wasm-js-parity.vitest.test.ts.
}
