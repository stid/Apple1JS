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

impl Default for WasmSystem {
    fn default() -> Self {
        Self::new()
    }
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

    /// Bus accesses made by the CPU since reset, per 256-byte page: 512 counts,
    /// reads of page `p` at index `p` and writes at `256 + p`. 32-bit, wrapping.
    /// Arrives in JavaScript as a Uint32Array (a copy).
    pub fn get_page_activity(&self) -> Box<[u32]> {
        Box::new(*self.cpu.get_page_activity())
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

    // ============ Profiling Support ============

    /// Enable or disable profiling
    pub fn enable_profiling(&mut self, enabled: bool) {
        self.cpu.enable_profiling(enabled);
    }

    /// Check if profiling is enabled
    pub fn is_profiling_enabled(&self) -> bool {
        self.cpu.is_profiling_enabled()
    }

    /// Get total instruction count from profiling
    pub fn get_profiled_instruction_count(&self) -> u64 {
        self.cpu.get_profiled_instruction_count()
    }

    /// Get top N most executed opcodes
    /// Returns raw bytes: [op1, count1_bytes(8), op2, count2_bytes(8), ...]
    pub fn get_top_opcodes(&self, count: usize) -> Vec<u8> {
        self.cpu.get_top_opcodes(count)
    }
}

// Internal implementation

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

    /// Build a system with a 64KB RAM and a NOP-filled ROM, then place `program`
    /// at $0300 and point PC at it.
    fn system_with_program(program: &[u8]) -> WasmSystem {
        let mut system = WasmSystem::new();
        let mut rom_data = vec![0x00, 0xFF];
        rom_data.extend_from_slice(&[0xEA; 256]);
        system.initialize(0x10000, rom_data).unwrap();
        for (i, byte) in program.iter().enumerate() {
            system.write_memory(0x0300 + i as u16, *byte);
        }
        system.cpu.pc = 0x0300;
        system
    }

    /// The board-activity program: touches both RAM banks, the I/O block and the
    /// PROMs. The vitest fixture page-activity-board-activity.fixture.ts runs the
    /// same bytes and asserts the same counts on the JS engine.
    const ACTIVITY_PROGRAM: [u8; 19] = [
        0xA9, 0x42, // LDA #$42
        0x8D, 0x00, 0xE0, // STA $E000
        0xAD, 0x00, 0xE0, // LDA $E000
        0xAD, 0x11, 0xD0, // LDA $D011
        0x8D, 0x12, 0xD0, // STA $D012
        0xAD, 0x00, 0xFF, // LDA $FF00
        0x48, // PHA
        0x68, // PLA
    ];

    /// Non-zero (slot, count) pairs: slot = page for reads, 256 + page for writes.
    fn non_zero_activity(system: &WasmSystem) -> Vec<(usize, u32)> {
        system
            .get_page_activity()
            .iter()
            .enumerate()
            .filter(|(_, &count)| count != 0)
            .map(|(slot, &count)| (slot, count))
            .collect()
    }

    // AC-1: the CPU's reads and writes are counted per page
    #[test]
    fn ac_1_page_activity_counts_cpu_accesses_per_page() {
        let mut system = system_with_program(&ACTIVITY_PROGRAM);
        for _ in 0..8 {
            system.step();
        }

        assert_eq!(system.get_page_activity().len(), 512);
        assert_eq!(
            non_zero_activity(&system),
            vec![
                (0x01, 1),        // PLA
                (0x03, 19),       // every program byte fetched once
                (0xD0, 1),        // LDA $D011
                (0xE0, 1),        // LDA $E000
                (0xFF, 1),        // LDA $FF00
                (256 + 0x01, 1),  // PHA
                (256 + 0xD0, 1),  // STA $D012
                (256 + 0xE0, 1),  // STA $E000
            ]
        );
    }

    // AC-1: reset clears the counts
    #[test]
    fn ac_1_reset_clears_page_activity() {
        let mut system = system_with_program(&ACTIVITY_PROGRAM);
        for _ in 0..8 {
            system.step();
        }
        system.reset();

        assert_eq!(non_zero_activity(&system), vec![]);
    }

    // AC-1: the counters are 32-bit and wrap instead of trapping
    #[test]
    fn ac_1_page_activity_wraps_at_32_bits() {
        let mut system = system_with_program(&[0xEA]); // NOP at $0300
        system.cpu.page_activity[0x03] = u32::MAX;

        system.step();

        assert_eq!(system.get_page_activity()[0x03], 0);
    }

    // AC-3: debugger memory access is not counted
    #[test]
    fn ac_3_debug_memory_access_is_not_counted() {
        // system_with_program writes the program through write_memory.
        let mut system = system_with_program(&ACTIVITY_PROGRAM);
        system.write_memory(0xE000, 0x55);
        for address in [0x0000u16, 0x0300, 0xE000, 0xFF00] {
            system.read_memory(address);
        }

        assert_eq!(non_zero_activity(&system), vec![]);
    }

    #[test]
    fn test_adc_decimal_overflow_follows_adjusted_high_nibble() {
        use crate::cpu::flags;

        // NMOS 6502, D=1: $79 + $00 + C. The binary sum is $7A (no signed
        // overflow), but the BCD-adjusted high nibble is 8, so the real chip
        // (and the TypeScript reference engine) sets V along with N.
        let mut system = system_with_program(&[0x69, 0x00]); // ADC #$00
        system.cpu.a = 0x79;
        system.cpu.status = flags::DECIMAL | flags::CARRY | flags::UNUSED;

        assert_eq!(system.step(), 2);

        assert_eq!(system.cpu.a, 0x80);
        assert!(system.cpu.get_flag(flags::OVERFLOW), "V must be set");
        assert!(system.cpu.get_flag(flags::NEGATIVE), "N must be set");
        assert!(!system.cpu.get_flag(flags::CARRY), "C must be clear");
        assert!(!system.cpu.get_flag(flags::ZERO), "Z must be clear");
    }

    #[test]
    fn test_adc_binary_overflow_unchanged() {
        use crate::cpu::flags;

        // Guard for the binary path: $50 + $50 = $A0 overflows into the sign bit.
        let mut system = system_with_program(&[0x69, 0x50]);
        system.cpu.a = 0x50;
        system.cpu.status = flags::UNUSED;

        system.step();

        assert_eq!(system.cpu.a, 0xA0);
        assert!(system.cpu.get_flag(flags::OVERFLOW));
        assert!(system.cpu.get_flag(flags::NEGATIVE));
        assert!(!system.cpu.get_flag(flags::CARRY));
    }

    #[test]
    fn test_irq_pushes_status_with_break_clear() {
        use crate::cpu::flags;

        // PLP/RTI store the popped byte as-is, so bit 4 can sit in the status
        // register. It is not a real flag: an IRQ or NMI must push it clear,
        // which is how a handler tells a hardware interrupt from BRK.
        let mut system = system_with_program(&[0xEA]);
        system.cpu.status = flags::BREAK | flags::UNUSED;
        let stack_before = system.cpu.s;
        system.trigger_irq();

        system.step();

        // PCH, PCL, then status: the third byte pushed.
        let pushed = system.read_memory(0x0100 | stack_before.wrapping_sub(2) as u16);
        assert_eq!(pushed & flags::BREAK, 0, "B must be clear on an IRQ push");
        assert_eq!(pushed & flags::UNUSED, flags::UNUSED);
    }

    #[test]
    fn test_nmi_pushes_status_with_break_clear() {
        use crate::cpu::flags;

        let mut system = system_with_program(&[0xEA]);
        system.cpu.status = flags::BREAK | flags::UNUSED | flags::INTERRUPT;
        let stack_before = system.cpu.s;
        system.trigger_nmi();

        system.step();

        let pushed = system.read_memory(0x0100 | stack_before.wrapping_sub(2) as u16);
        assert_eq!(pushed & flags::BREAK, 0, "B must be clear on an NMI push");
    }

    #[test]
    fn test_lda_izy_cycles_with_and_without_page_cross() {
        // LDA ($10),Y: 5 cycles, 6 when adding Y crosses a page.
        let mut system = system_with_program(&[0xB1, 0x10, 0xB1, 0x10]);
        system.write_memory(0x0010, 0xF0); // pointer -> $02F0
        system.write_memory(0x0011, 0x02);
        system.write_memory(0x02F5, 0x11);
        system.write_memory(0x0310, 0x22);

        system.cpu.y = 0x05; // $02F5, same page
        assert_eq!(system.step(), 5);
        assert_eq!(system.cpu.a, 0x11);

        system.cpu.y = 0x20; // $0310, crosses into page 3
        assert_eq!(system.step(), 6);
        assert_eq!(system.cpu.a, 0x22);
    }

    #[test]
    fn test_lda_izy_at_the_top_of_memory_does_not_overflow() {
        // Opcode at $FFFE, operand at $FFFF: PC wraps to $0000 after the fetch.
        // The page-cross check used to recompute the operand address as PC - 1,
        // which overflows there (a panic in a debug build).
        let mut system = WasmSystem::new();
        let mut rom_data = vec![0x00, 0xFF];
        let mut rom = [0xEAu8; 256];
        rom[0xFE] = 0xB1; // LDA ($10),Y
        rom[0xFF] = 0x10;
        rom_data.extend_from_slice(&rom);
        system.initialize(0x10000, rom_data).unwrap();
        system.write_memory(0x0010, 0x00);
        system.write_memory(0x0011, 0x02);
        system.write_memory(0x0203, 0x5A);
        system.cpu.pc = 0xFFFE;
        system.cpu.y = 0x03;

        assert_eq!(system.step(), 5);
        assert_eq!(system.cpu.a, 0x5A);
        assert_eq!(system.cpu.pc, 0x0000);
    }

    // NOTE: last_addr/last_data tracking (get_last_addr/get_last_data) is
    // exercised on the CPU execution path (step_with_bus), which cannot run
    // under native `cargo test` — CPU6502::new() and initialize() call
    // wasm-bindgen imports (console_log, etc.), so the WasmSystem tests above
    // already panic natively. The last-access behavior is verified instead by
    // the browser dual-engine parity test (AC-7) in
    // EngineParity-wasm-js-parity.vitest.test.ts.
}
