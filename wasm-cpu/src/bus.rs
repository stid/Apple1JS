/*!
 * Bus Implementation for WASM
 * 
 * Manages memory mapping and address decoding for the 6502 system.
 * Provides efficient routing between RAM, ROM, and I/O devices.
 */

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

impl Bus {
    /// Create a new Bus instance
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

    /// Get RAM memory length
    pub fn get_ram_len(&self) -> usize {
        self.ram.as_ref().map_or(0, |ram| ram.get_memory_len())
    }

}

// Internal implementation
impl Bus {

    /// Set up default Apple 1 memory mappings
    fn setup_default_mappings(&mut self) {
        // RAM at 0x0000-0x0FFF (4KB)
        self.region_cache[0x0000..=0x0FFF].fill(MemoryRegion::RAM);
        self.mappings.push(AddressRange {
            start: 0x0000,
            end: 0x0FFF,
            region: MemoryRegion::RAM,
        });
        
        // I/O at 0xD000-0xDFFF (PIA at 0xD010-0xD013, repeated through the
        // block). The Apple 1 decodes only enough address lines to place the
        // chip in its 4K bank, so its four registers repeat every four bytes.
        // The full address is forwarded to the JavaScript bus, which applies
        // the offset mask — this side only has to route the whole block to I/O.
        self.region_cache[0xD000..=0xDFFF].fill(MemoryRegion::IO);
        self.mappings.push(AddressRange {
            start: 0xD000,
            end: 0xDFFF,
            region: MemoryRegion::IO,
        });
        
        // Extended RAM at 0xE000-0xEFFF (4KB, for BASIC)
        self.region_cache[0xE000..=0xEFFF].fill(MemoryRegion::RAM);
        self.mappings.push(AddressRange {
            start: 0xE000,
            end: 0xEFFF,
            region: MemoryRegion::RAM,
        });
        
        // ROM at 0xFF00-0xFFFF (256 bytes, WOZ Monitor)
        self.region_cache[0xFF00..=0xFFFF].fill(MemoryRegion::ROM);
        self.mappings.push(AddressRange {
            start: 0xFF00,
            end: 0xFFFF,
            region: MemoryRegion::ROM,
        });
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