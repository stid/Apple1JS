/*!
 * ROM Implementation for WASM
 * 
 * Provides high-performance ROM storage using WASM linear memory.
 * ROM is write-once (via flash) and read-many.
 */

use wasm_bindgen::prelude::*;

/// ROM component with direct memory access
#[wasm_bindgen]
pub struct ROM {
    /// Memory storage
    data: Vec<u8>,
    /// Size of the ROM in bytes
    size: usize,
    /// Whether ROM has been flashed with data
    initialized: bool,
}

#[wasm_bindgen]
impl ROM {
    /// Create a new ROM instance with specified size
    #[wasm_bindgen(constructor)]
    pub fn new(size: usize) -> Self {
        ROM {
            data: vec![0xFF; size], // Uninitialized ROM typically reads as 0xFF
            size,
            initialized: false,
        }
    }
    
    /// Read a byte from ROM
    #[inline(always)]
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
    
    /// Check if ROM has been initialized
    pub fn is_initialized(&self) -> bool {
        self.initialized
    }
    
    /// Get the size of ROM
    pub fn get_size(&self) -> usize {
        self.size
    }
    
    /// Get a copy of ROM contents for debugging/saving
    pub fn get_data(&self) -> Vec<u8> {
        self.data.clone()
    }

    /// Reset ROM to uninitialized state (all 0xFF)
    pub fn reset(&mut self) {
        self.data.fill(0xFF);
        self.initialized = false;
    }

    /// Get pointer to ROM data for direct JavaScript access
    /// This enables zero-copy memory sharing with JavaScript
    pub fn get_memory_ptr(&self) -> *const u8 {
        self.data.as_ptr()
    }

    /// Get length of ROM for bounds checking in JavaScript
    pub fn get_memory_len(&self) -> usize {
        self.size
    }

    /// Get a slice of ROM data for bulk operations
    /// JavaScript can use this to create a Uint8Array view
    pub fn get_memory_slice(&self, start: usize, length: usize) -> Vec<u8> {
        let end = (start + length).min(self.size);
        if start < self.size {
            self.data[start..end].to_vec()
        } else {
            Vec::new()
        }
    }
}

// Internal implementation for use within WASM
impl ROM {
    /// Internal read without bounds checking for performance
    #[inline(always)]
    pub(crate) fn read_unchecked(&self, address: u16) -> u8 {
        unsafe {
            *self.data.get_unchecked(address as usize)
        }
    }
    
    /// Load ROM data directly (for internal use)
    pub(crate) fn load_direct(&mut self, data: &[u8]) {
        let copy_len = data.len().min(self.size);
        self.data[..copy_len].copy_from_slice(&data[..copy_len]);
        self.initialized = true;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_rom_creation() {
        let rom = ROM::new(0x100);
        assert_eq!(rom.get_size(), 0x100);
        assert!(!rom.is_initialized());
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
        
        assert!(rom.is_initialized());
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
    
    #[test]
    fn test_rom_reset() {
        let mut rom = ROM::new(0x100);
        
        // Flash data
        let flash_data = vec![0x00, 0xFF, 0x42];
        rom.flash(flash_data).unwrap();
        assert_eq!(rom.read(0), 0x42);
        
        // Reset
        rom.reset();
        assert!(!rom.is_initialized());
        assert_eq!(rom.read(0), 0xFF);
    }
}