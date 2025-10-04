/*!
 * RAM Implementation for WASM
 * 
 * Provides high-performance RAM storage using WASM linear memory
 * to eliminate JS↔WASM boundary crossings for memory operations.
 */

use wasm_bindgen::prelude::*;

/// RAM component with direct memory access
#[wasm_bindgen]
pub struct RAM {
    /// Memory storage using a Vec for flexibility
    data: Vec<u8>,
    /// Size of the RAM in bytes
    size: usize,
}

#[wasm_bindgen]
impl RAM {
    /// Create a new RAM instance with specified size
    #[wasm_bindgen(constructor)]
    pub fn new(size: usize) -> Self {
        RAM {
            data: vec![0; size],
            size,
        }
    }
    
    /// Read a byte from RAM
    #[inline(always)]
    pub fn read(&self, address: u16) -> u8 {
        let addr = address as usize;
        if addr < self.size {
            self.data[addr]
        } else {
            // Out of bounds reads return 0 (matches TypeScript behavior)
            0
        }
    }
    
    /// Write a byte to RAM
    #[inline(always)]
    pub fn write(&mut self, address: u16, value: u8) {
        let addr = address as usize;
        if addr < self.size {
            self.data[addr] = value;
        }
        // Out of bounds writes are ignored (matches TypeScript behavior)
    }
    
    /// Clear all RAM (fill with zeros)
    pub fn clear(&mut self) {
        self.data.fill(0);
    }
    
    /// Get the size of RAM
    pub fn get_size(&self) -> usize {
        self.size
    }
    
    /// Load data into RAM at specified address
    pub fn load(&mut self, start_address: u16, data: &[u8]) {
        let start = start_address as usize;
        let end = (start + data.len()).min(self.size);
        
        if start < self.size {
            let copy_len = end - start;
            self.data[start..end].copy_from_slice(&data[..copy_len]);
        }
    }
    
    /// Get a copy of RAM contents for debugging/saving
    pub fn get_data(&self) -> Vec<u8> {
        self.data.clone()
    }

    /// Set RAM contents from external data (for loading state)
    pub fn set_data(&mut self, data: Vec<u8>) {
        if data.len() == self.size {
            self.data = data;
        }
    }

    /// Get pointer to RAM data for direct JavaScript access
    /// This enables zero-copy memory sharing with JavaScript
    pub fn get_memory_ptr(&self) -> *const u8 {
        self.data.as_ptr()
    }

    /// Get length of RAM for bounds checking in JavaScript
    pub fn get_memory_len(&self) -> usize {
        self.size
    }

    /// Get a slice of RAM data for bulk operations
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
impl RAM {
    /// Internal read without bounds checking for performance
    #[inline(always)]
    pub(crate) fn read_unchecked(&self, address: u16) -> u8 {
        unsafe {
            *self.data.get_unchecked(address as usize)
        }
    }
    
    /// Internal write without bounds checking for performance
    #[inline(always)]
    pub(crate) fn write_unchecked(&mut self, address: u16, value: u8) {
        unsafe {
            *self.data.get_unchecked_mut(address as usize) = value;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_ram_creation() {
        let ram = RAM::new(0x1000); // 4KB
        assert_eq!(ram.get_size(), 0x1000);
        assert_eq!(ram.read(0), 0);
    }
    
    #[test]
    fn test_ram_read_write() {
        let mut ram = RAM::new(0x1000);
        
        // Write and read back
        ram.write(0x100, 0x42);
        assert_eq!(ram.read(0x100), 0x42);
        
        // Test boundaries
        ram.write(0x0, 0xFF);
        assert_eq!(ram.read(0x0), 0xFF);
        
        ram.write(0xFFF, 0xAA);
        assert_eq!(ram.read(0xFFF), 0xAA);
    }
    
    #[test]
    fn test_ram_out_of_bounds() {
        let mut ram = RAM::new(0x1000);
        
        // Out of bounds read returns 0
        assert_eq!(ram.read(0x1000), 0);
        assert_eq!(ram.read(0xFFFF), 0);
        
        // Out of bounds write is ignored
        ram.write(0x1000, 0x42);
        assert_eq!(ram.read(0x0), 0); // Verify nothing was corrupted
    }
    
    #[test]
    fn test_ram_clear() {
        let mut ram = RAM::new(0x100);
        
        // Fill with data
        for i in 0..0x100 {
            ram.write(i, (i & 0xFF) as u8);
        }
        
        // Clear and verify
        ram.clear();
        for i in 0..0x100 {
            assert_eq!(ram.read(i), 0);
        }
    }
    
    #[test]
    fn test_ram_load() {
        let mut ram = RAM::new(0x1000);
        let data = vec![0x01, 0x02, 0x03, 0x04, 0x05];
        
        ram.load(0x100, &data);
        
        for (i, &byte) in data.iter().enumerate() {
            assert_eq!(ram.read(0x100 + i as u16), byte);
        }
    }
}