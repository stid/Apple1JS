/*!
 * Apple1 6502 CPU Emulator in Rust/WASM
 * 
 * High-performance implementation of the MOS 6502 processor
 * optimized for WebAssembly execution.
 */

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

// Module declarations
mod cpu;
mod memory;
mod instructions;
mod opcodes;

// Re-exports
pub use cpu::CPU6502;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global allocator.
// This is smaller but slower than the default allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

// Console logging for debugging
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
    
    #[wasm_bindgen(js_namespace = console)]
    fn error(s: &str);
    
    #[wasm_bindgen(js_namespace = performance)]
    fn now() -> f64;
    
    // Memory bridge functions - these call back to JavaScript Bus
    #[wasm_bindgen(js_namespace = wasmMemoryBridge)]
    fn readByte(address: u16) -> u8;
    
    #[wasm_bindgen(js_namespace = wasmMemoryBridge)]
    fn writeByte(address: u16, value: u8);
}

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

// Macro for console error
#[macro_export]
macro_rules! console_error {
    ($($t:tt)*) => ($crate::error(&format_args!($($t)*).to_string()))
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