/*!
 * Bus Implementation for WASM
 * 
 * Manages memory mapping and address decoding for the 6502 system.
 * Provides efficient routing between RAM, ROM, and I/O devices.
 */

use wasm_bindgen::prelude::*;
use crate::ram::RAM;
use crate::rom::ROM;

/// Memory region types
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum MemoryRegion {
    RAM,
    ROM,
    IO,
    Unmapped,
}

/// Address range mapping
#[derive(Debug, Clone)]
pub struct AddressRange {
    pub start: u16,
    pub end: u16,
    pub region: MemoryRegion,
}

/// Bus component that manages memory mapping
#[wasm_bindgen]
pub struct Bus {
    /// RAM component (typically 0x0000-0x0FFF and 0xE000-0xEFFF for Apple 1)
    ram: Option<RAM>,
    /// ROM component (typically 0xFF00-0xFFFF for Apple 1)
    rom: Option<ROM>,
    /// Address mappings
    mappings: Vec<AddressRange>,
    /// Cache for fast address lookup
    region_cache: Vec<MemoryRegion>,
}

#[wasm_bindgen]
impl Bus {
    /// Create a new Bus instance
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        let mut bus = Bus {
            ram: None,
            rom: None,
            mappings: Vec::new(),
            region_cache: vec![MemoryRegion::Unmapped; 0x10000],
        };
        
        // Set up default Apple 1 memory map
        bus.setup_default_mappings();
        bus
    }
    
    /// Initialize with RAM component
    pub fn set_ram(&mut self, ram: RAM) {
        self.ram = Some(ram);
    }
    
    /// Initialize with ROM component
    pub fn set_rom(&mut self, rom: ROM) {
        self.rom = Some(rom);
    }
    
    /// Read a byte from the bus
    pub fn read(&self, address: u16) -> u8 {
        let region = self.region_cache[address as usize];

        match region {
            MemoryRegion::RAM => {
                if let Some(ref ram) = self.ram {
                    ram.read(address)
                } else {
                    0xFF // Unconnected bus reads as 0xFF
                }
            }
            MemoryRegion::ROM => {
                if let Some(ref rom) = self.rom {
                    rom.read(address - 0xFF00) // ROM is offset
                } else {
                    0xFF
                }
            }
            MemoryRegion::IO => {
                // Delegate to JavaScript for I/O devices
                #[cfg(feature = "debug")]
                crate::console_log!("WASM Bus: I/O Read at ${:04X}", address);
                crate::bus_read(address)
            }
            MemoryRegion::Unmapped => {
                0xFF // Unmapped regions read as 0xFF
            }
        }
    }
    
    /// Write a byte to the bus
    pub fn write(&mut self, address: u16, value: u8) {
        let region = self.region_cache[address as usize];
        
        match region {
            MemoryRegion::RAM => {
                if let Some(ref mut ram) = self.ram {
                    ram.write(address, value);
                }
            }
            MemoryRegion::ROM => {
                // ROM writes are ignored (could log warning)
            }
            MemoryRegion::IO => {
                // Delegate to JavaScript for I/O devices
                crate::bus_write(address, value);
            }
            MemoryRegion::Unmapped => {
                // Unmapped writes are ignored
            }
        }
    }
    
    /// Add an address mapping
    pub fn add_mapping(&mut self, start: u16, end: u16, region_type: String) {
        let region = match region_type.as_str() {
            "RAM" => MemoryRegion::RAM,
            "ROM" => MemoryRegion::ROM,
            "IO" => MemoryRegion::IO,
            _ => MemoryRegion::Unmapped,
        };
        
        self.mappings.push(AddressRange {
            start,
            end,
            region,
        });
        
        // Update cache
        for addr in start..=end {
            self.region_cache[addr as usize] = region;
        }
    }
    
    /// Clear all mappings
    pub fn clear_mappings(&mut self) {
        self.mappings.clear();
        self.region_cache.fill(MemoryRegion::Unmapped);
    }
    
    /// Get mapping info for debugging
    pub fn get_mapping_info(&self) -> String {
        let mut info = String::new();
        for mapping in &self.mappings {
            info.push_str(&format!(
                "${:04X}-${:04X}: {:?}\n",
                mapping.start,
                mapping.end,
                mapping.region
            ));
        }
        info
    }

    /// Get RAM memory pointer for JavaScript access
    /// Returns 0 if RAM is not set
    pub fn get_ram_ptr(&self) -> usize {
        self.ram.as_ref().map_or(0, |ram| ram.get_memory_ptr() as usize)
    }

    /// Get RAM memory length
    pub fn get_ram_len(&self) -> usize {
        self.ram.as_ref().map_or(0, |ram| ram.get_memory_len())
    }

    /// Get ROM memory pointer for JavaScript access
    /// Returns 0 if ROM is not set
    pub fn get_rom_ptr(&self) -> usize {
        self.rom.as_ref().map_or(0, |rom| rom.get_memory_ptr() as usize)
    }

    /// Get ROM memory length
    pub fn get_rom_len(&self) -> usize {
        self.rom.as_ref().map_or(0, |rom| rom.get_memory_len())
    }

    /// Check if RAM is initialized
    pub fn has_ram(&self) -> bool {
        self.ram.is_some()
    }

    /// Check if ROM is initialized
    pub fn has_rom(&self) -> bool {
        self.rom.is_some()
    }
}

// Internal implementation
impl Bus {
    /// Get reference to RAM for internal Rust use
    /// Returns None if RAM is not set
    #[allow(dead_code)]
    pub(crate) fn get_ram(&self) -> Option<&RAM> {
        self.ram.as_ref()
    }

    /// Get mutable reference to RAM for internal Rust use
    /// Returns None if RAM is not set
    #[allow(dead_code)]
    pub(crate) fn get_ram_mut(&mut self) -> Option<&mut RAM> {
        self.ram.as_mut()
    }

    /// Get reference to ROM for internal Rust use
    /// Returns None if ROM is not set
    #[allow(dead_code)]
    pub(crate) fn get_rom(&self) -> Option<&ROM> {
        self.rom.as_ref()
    }

    /// Get mutable reference to ROM for internal Rust use
    /// Returns None if ROM is not set
    #[allow(dead_code)]
    pub(crate) fn get_rom_mut(&mut self) -> Option<&mut ROM> {
        self.rom.as_mut()
    }

    /// Set up default Apple 1 memory mappings
    fn setup_default_mappings(&mut self) {
        // RAM at 0x0000-0x0FFF (4KB)
        for addr in 0x0000..=0x0FFF {
            self.region_cache[addr] = MemoryRegion::RAM;
        }
        self.mappings.push(AddressRange {
            start: 0x0000,
            end: 0x0FFF,
            region: MemoryRegion::RAM,
        });
        
        // I/O at 0xD010-0xD013 (PIA)
        for addr in 0xD010..=0xD013 {
            self.region_cache[addr] = MemoryRegion::IO;
        }
        self.mappings.push(AddressRange {
            start: 0xD010,
            end: 0xD013,
            region: MemoryRegion::IO,
        });
        
        // Extended RAM at 0xE000-0xEFFF (4KB, for BASIC)
        for addr in 0xE000..=0xEFFF {
            self.region_cache[addr] = MemoryRegion::RAM;
        }
        self.mappings.push(AddressRange {
            start: 0xE000,
            end: 0xEFFF,
            region: MemoryRegion::RAM,
        });
        
        // ROM at 0xFF00-0xFFFF (256 bytes, WOZ Monitor)
        for addr in 0xFF00..=0xFFFF {
            self.region_cache[addr] = MemoryRegion::ROM;
        }
        self.mappings.push(AddressRange {
            start: 0xFF00,
            end: 0xFFFF,
            region: MemoryRegion::ROM,
        });
    }
    
    /// Direct read for internal use (no bounds checking)
    #[allow(dead_code)]
    #[inline(always)]
    pub(crate) fn read_direct(&self, address: u16) -> u8 {
        match self.region_cache[address as usize] {
            MemoryRegion::RAM => {
                self.ram.as_ref().map_or(0xFF, |ram| ram.read(address))
            }
            MemoryRegion::ROM => {
                self.rom.as_ref().map_or(0xFF, |rom| rom.read(address - 0xFF00))
            }
            MemoryRegion::IO => crate::bus_read(address),
            MemoryRegion::Unmapped => 0xFF,
        }
    }

    /// Direct write for internal use (no bounds checking)
    #[allow(dead_code)]
    #[inline(always)]
    pub(crate) fn write_direct(&mut self, address: u16, value: u8) {
        match self.region_cache[address as usize] {
            MemoryRegion::RAM => {
                if let Some(ref mut ram) = self.ram {
                    ram.write(address, value);
                }
            }
            MemoryRegion::ROM => {
                // ROM writes ignored
            }
            MemoryRegion::IO => {
                crate::bus_write(address, value);
            }
            MemoryRegion::Unmapped => {
                // Unmapped writes ignored
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_bus_creation() {
        let bus = Bus::new();
        // Verify default mappings are set up
        assert!(!bus.mappings.is_empty());
    }
    
    #[test]
    fn test_bus_ram_access() {
        let mut bus = Bus::new();
        let ram = RAM::new(0x10000); // Full 64KB
        bus.set_ram(ram);
        
        // Write to RAM region
        bus.write(0x0100, 0x42);
        assert_eq!(bus.read(0x0100), 0x42);
        
        // Write to extended RAM
        bus.write(0xE000, 0xAA);
        assert_eq!(bus.read(0xE000), 0xAA);
    }
    
    #[test]
    fn test_bus_rom_access() {
        let mut bus = Bus::new();
        let mut rom = ROM::new(0x100); // 256 bytes
        
        // Flash ROM with test data
        let flash_data = vec![0x00, 0xFF, 0x12, 0x34, 0x56, 0x78];
        rom.flash(flash_data).unwrap();
        bus.set_rom(rom);
        
        // Read from ROM region (0xFF00-0xFFFF)
        assert_eq!(bus.read(0xFF00), 0x12);
        assert_eq!(bus.read(0xFF01), 0x34);
        
        // ROM writes should be ignored
        bus.write(0xFF00, 0xFF);
        assert_eq!(bus.read(0xFF00), 0x12); // Still original value
    }
}