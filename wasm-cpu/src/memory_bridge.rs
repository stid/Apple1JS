/*!
 * Memory Bridge for JavaScript Bus Integration
 * 
 * This module provides the interface for WASM CPU to use JavaScript's Bus
 * as the single source of truth for memory operations.
 */

use wasm_bindgen::prelude::*;

// External JavaScript functions that WASM will call
// These are implemented in TypeScript and passed to WASM
#[wasm_bindgen]
extern "C" {
    /// Read a byte from JavaScript Bus
    #[wasm_bindgen(js_namespace = ["window", "wasmMemoryBridge"], js_name = "readByte")]
    pub fn js_read_byte(address: u16) -> u8;
    
    /// Write a byte to JavaScript Bus
    #[wasm_bindgen(js_namespace = ["window", "wasmMemoryBridge"], js_name = "writeByte")]
    pub fn js_write_byte(address: u16, value: u8);
}

/// Memory interface that uses JavaScript Bus as backend
pub struct BusMemory;

impl BusMemory {
    /// Read a byte from Bus via JavaScript
    pub fn read(address: u16) -> u8 {
        js_read_byte(address)
    }
    
    /// Write a byte to Bus via JavaScript
    pub fn write(address: u16, value: u8) {
        js_write_byte(address, value);
    }
}