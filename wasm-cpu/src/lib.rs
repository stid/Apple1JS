/*!
 * Apple1 6502 CPU Emulator in Rust/WASM
 *
 * High-performance implementation of the MOS 6502 processor
 * optimized for WebAssembly execution.
 */

// RAM, ROM and CPU6502 are the names of the parts, not acronyms to re-case.
#![allow(clippy::upper_case_acronyms)]

use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

// Module declarations
mod bus;
mod cpu;
mod instructions_bus_impl; // Full Bus-aware instruction implementations
mod instructions_with_bus; // Helper methods for Bus-aware instructions
mod opcodes; // Shared opcode constant table
mod opcodes_with_bus; // Bus-aware opcode dispatch
mod ram;
mod rom;
mod system;

// `WasmSystem` is the only type exported to JavaScript. The components below
// are internal: keeping them out of the JS API lets the compiler see (and
// strip) what is unused, which a `#[wasm_bindgen]` export hides from it.
pub(crate) use bus::Bus;
pub(crate) use cpu::CPU6502;
pub(crate) use ram::RAM;
pub(crate) use rom::ROM;
pub use system::WasmSystem;

// Console logging for debugging
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);

    // Memory bridge functions for I/O operations
    // These are only called for I/O regions (0xD010-0xD013 PIA)
    // RAM and ROM are handled internally in WASM for performance
    // The bridge must be installed before WASM initialization via installMemoryBridge()
    #[wasm_bindgen(js_namespace = ["globalThis", "wasmMemoryBridge"])]
    fn readByte(address: u16) -> u8;

    #[wasm_bindgen(js_namespace = ["globalThis", "wasmMemoryBridge"])]
    fn writeByte(address: u16, value: u8);
}

// Native stand-ins for the JS imports above. wasm-bindgen imports panic when
// called outside a WASM host, which used to make every CPU / WasmSystem code path
// untestable under `cargo test`. With these, the CPU core runs natively: logging
// is a no-op and the I/O block ($D000-$DFFF, the only region that crosses to JS)
// reads as zero and ignores writes.
#[cfg(not(target_arch = "wasm32"))]
mod native_host {
    pub fn log(_s: &str) {}
    #[allow(non_snake_case)]
    pub fn readByte(_address: u16) -> u8 {
        0
    }
    #[allow(non_snake_case)]
    pub fn writeByte(_address: u16, _value: u8) {}
}
#[cfg(not(target_arch = "wasm32"))]
use native_host::{log, readByte, writeByte};

// Export memory bridge functions for internal use
pub(crate) fn bus_read(address: u16) -> u8 {
    readByte(address)
}

pub(crate) fn bus_write(address: u16, value: u8) {
    writeByte(address, value)
}

// Macro for console logging
#[macro_export]
macro_rules! console_log {
    ($($t:tt)*) => ($crate::log(&format_args!($($t)*).to_string()))
}

/// CPU State structure for serialization
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CPUState {
    pub pc: u16,
    pub a: u8,
    pub x: u8,
    pub y: u8,
    pub s: u8,
    pub status: u8,
    pub cycles: u64,
    pub irq: bool,
    pub nmi: bool,
}

/// Performance metrics
#[derive(Serialize, Deserialize, Debug)]
pub struct Metrics {
    pub cycles: u64,
    pub instructions: u64,
    pub average_ips: f64,
    pub last_step_duration: f64,
}

/// Initialize the WASM module
#[wasm_bindgen(start)]
pub fn init() {
    // Set panic hook for better error messages in browser
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();

    console_log!("Apple1 WASM CPU initialized");
}
