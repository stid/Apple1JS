/*!
 * RAM Implementation for WASM
 * 
 * Provides high-performance RAM storage using WASM linear memory
 * to eliminate JS↔WASM boundary crossings for memory operations.
 */


/// RAM component with direct memory access
pub struct RAM {
    /// Memory storage using a Vec for flexibility
    data: Vec<u8>,
    /// Size of the RAM in bytes
    size: usize,
}

impl RAM {
    /// Create a new RAM instance with specified size
    pub fn new(size: usize) -> Self {
        RAM {
            data: vec![0; size],
            size,
        }
    }
    
    /// Read a byte from RAM
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
    pub fn write(&mut self, address: u16, value: u8) {
        let addr = address as usize;
        if addr < self.size {
            self.data[addr] = value;
        }
        // Out of bounds writes are ignored (matches TypeScript behavior)
    }
    
    /// Get length of RAM for bounds checking in JavaScript
    pub fn get_memory_len(&self) -> usize {
        self.size
    }

}

// Internal implementation for use within WASM
impl RAM {

}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_ram_creation() {
        let ram = RAM::new(0x1000); // 4KB
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
        }
