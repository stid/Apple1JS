/*!
 * ROM Implementation for WASM
 * 
 * Provides high-performance ROM storage using WASM linear memory.
 * ROM is write-once (via flash) and read-many.
 */

use wasm_bindgen::prelude::*;

/// ROM component with direct memory access
pub struct ROM {
    /// Memory storage
    data: Vec<u8>,
    /// Size of the ROM in bytes
    size: usize,
    /// Whether ROM has been flashed with data
    initialized: bool,
}

impl ROM {
    /// Create a new ROM instance with specified size
    pub fn new(size: usize) -> Self {
        ROM {
            data: vec![0xFF; size], // Uninitialized ROM typically reads as 0xFF
            size,
            initialized: false,
        }
    }
    
    /// Read a byte from ROM
    pub fn read(&self, address: u16) -> u8 {
        let addr = address as usize;
        if addr < self.size {
            self.data[addr]
        } else {
            // Out of bounds reads return 0xFF (uninitialized)
            0xFF
        }
    }
    
    /// Flash ROM with data (write-once operation)
    /// Data format: [low_addr, high_addr, ...bytes]
    pub fn flash(&mut self, data: Vec<u8>) -> Result<(), JsValue> {
        if data.len() < 2 {
            return Err(JsValue::from_str("Flash data must include 2-byte address header"));
        }
        
        // Extract starting address (little-endian)
        let low_addr = data[0] as u16;
        let high_addr = data[1] as u16;
        let _start_address = (high_addr << 8) | low_addr;
        
        // Get the actual ROM data (skip address header)
        let rom_data = &data[2..];
        
        // Validate size
        if rom_data.len() > self.size {
            return Err(JsValue::from_str(&format!(
                "ROM data too large: {} bytes > {} bytes",
                rom_data.len(),
                self.size
            )));
        }
        
        // Flash the ROM
        self.data[..rom_data.len()].copy_from_slice(rom_data);
        self.initialized = true;
        
        Ok(())
    }
    
    /// Get the size of ROM
    pub fn get_size(&self) -> usize {
        self.size
    }
    
}

// Internal implementation for use within WASM
impl ROM {

}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_rom_creation() {
        let rom = ROM::new(0x100);
        assert_eq!(rom.get_size(), 0x100);
        // Uninitialized ROM reads as 0xFF
        assert_eq!(rom.read(0), 0xFF);
    }
    
    #[test]
    fn test_rom_flash() {
        let mut rom = ROM::new(0x100);
        
        // Create flash data with address header
        let mut flash_data = vec![0x00, 0xFF]; // Address 0xFF00
        flash_data.extend_from_slice(&[0xAA, 0xBB, 0xCC, 0xDD]);
        
        rom.flash(flash_data).unwrap();
        
        assert_eq!(rom.read(0), 0xAA);
        assert_eq!(rom.read(1), 0xBB);
        assert_eq!(rom.read(2), 0xCC);
        assert_eq!(rom.read(3), 0xDD);
    }
    
    #[test]
    fn test_rom_read_only() {
        let mut rom = ROM::new(0x100);
        
        // Flash initial data
        let flash_data = vec![0x00, 0xFF, 0x12, 0x34, 0x56];
        rom.flash(flash_data).unwrap();
        
        // Verify data
        assert_eq!(rom.read(0), 0x12);
        assert_eq!(rom.read(1), 0x34);
        assert_eq!(rom.read(2), 0x56);
        
        // ROM doesn't have a write method (read-only after flash)
    }
    }
