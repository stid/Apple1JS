/*!
 * Bus Implementation for WASM
 * 
 * Manages memory mapping and address decoding for the 6502 system.
 * Provides efficient routing between RAM, ROM, and I/O devices.
 */

use crate::rom::ROM;

/// Memory region types
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum MemoryRegion {
    RAM,
    ROM,
    IO,
}

/// Address range mapping
#[derive(Debug, Clone)]
pub struct AddressRange {
    pub start: u16,
    pub end: u16,
    pub region: MemoryRegion,
}

/// What a 256-byte page does with an access. Every region of the Apple 1 map
/// starts and ends on a page boundary, so one entry per page is exact.
#[derive(Debug, Clone, Copy, PartialEq)]
enum PageKind {
    /// Reads and writes go to `mem`.
    Ram,
    /// Reads come from `mem`, writes are ignored: ROM, and every address
    /// nothing answers (where `mem` holds the floating-bus value).
    Fixed,
    /// Both directions are forwarded to the JavaScript bus.
    Io,
}

const ADDRESS_SPACE: usize = 0x10000;
const PAGE_COUNT: usize = 256;
/// What a floating data bus reads back.
const OPEN_BUS: u8 = 0xFF;
const ROM_START: usize = 0xFF00;

/// Bus component that manages memory mapping
pub struct Bus {
    /// The contents of the whole address space in one array: RAM, the ROM
    /// image at $FF00, and the floating-bus value everywhere else. A `u16`
    /// address always indexes it in bounds, so a RAM or ROM access is a single
    /// load with no range check.
    mem: Box<[u8; ADDRESS_SPACE]>,
    /// One entry per page; see `PageKind`.
    pages: [PageKind; PAGE_COUNT],
    /// Address mappings
    mappings: Vec<AddressRange>,
    /// RAM size given to `set_ram`, 0 until RAM is installed.
    ram_len: usize,
}

impl Bus {
    /// Create a new Bus instance
    pub fn new() -> Self {
        let mem: Box<[u8; ADDRESS_SPACE]> = vec![OPEN_BUS; ADDRESS_SPACE]
            .into_boxed_slice()
            .try_into()
            .expect("the vector has ADDRESS_SPACE elements");
        let mut bus = Bus {
            mem,
            pages: [PageKind::Fixed; PAGE_COUNT],
            mappings: Vec::new(),
            ram_len: 0,
        };

        // Set up default Apple 1 memory map
        bus.setup_default_mappings();
        bus
    }

    /// Install `size` bytes of RAM, addressed from $0000: every RAM-mapped page
    /// below `size` becomes readable and writable and starts out zeroed. A
    /// RAM-mapped page at or above `size` reads zero and ignores writes.
    /// `size` must be a whole number of pages.
    pub fn set_ram(&mut self, size: usize) -> Result<(), String> {
        if !size.is_multiple_of(PAGE_COUNT) {
            return Err(format!(
                "RAM size must be a whole number of 256-byte pages, got {size}"
            ));
        }
        for mapping in &self.mappings {
            if mapping.region != MemoryRegion::RAM {
                continue;
            }
            let (start, end) = (mapping.start as usize, mapping.end as usize);
            self.mem[start..=end].fill(0);
            // The part of this region that lies below `size`, in pages.
            let installed_end = (end + 1).min(size) >> 8;
            if installed_end > start >> 8 {
                self.pages[start >> 8..installed_end].fill(PageKind::Ram);
            }
        }
        self.ram_len = size;
        Ok(())
    }

    /// Install the ROM image at $FF00.
    pub fn set_rom(&mut self, rom: &ROM) {
        let image = rom.bytes();
        self.mem[ROM_START..ROM_START + image.len()].copy_from_slice(image);
    }

    /// Read a byte from the bus
    #[inline]
    pub fn read(&self, address: u16) -> u8 {
        if self.pages[(address >> 8) as usize] == PageKind::Io {
            // Delegate to JavaScript for I/O devices
            crate::bus_read(address)
        } else {
            self.mem[address as usize]
        }
    }

    /// Write a byte to the bus
    #[inline]
    pub fn write(&mut self, address: u16, value: u8) {
        match self.pages[(address >> 8) as usize] {
            PageKind::Ram => self.mem[address as usize] = value,
            // Delegate to JavaScript for I/O devices
            PageKind::Io => crate::bus_write(address, value),
            PageKind::Fixed => {}
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
        self.ram_len
    }

}

// Internal implementation
impl Bus {

    /// Set up default Apple 1 memory mappings
    fn setup_default_mappings(&mut self) {
        // RAM at 0x0000-0x0FFF (4KB)
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
        self.pages[0xD0..=0xDF].fill(PageKind::Io);
        self.mappings.push(AddressRange {
            start: 0xD000,
            end: 0xDFFF,
            region: MemoryRegion::IO,
        });
        
        // Extended RAM at 0xE000-0xEFFF (4KB, for BASIC)
        self.mappings.push(AddressRange {
            start: 0xE000,
            end: 0xEFFF,
            region: MemoryRegion::RAM,
        });
        
        // ROM at 0xFF00-0xFFFF (256 bytes, WOZ Monitor)
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

    fn bus_with_ram() -> Bus {
        let mut bus = Bus::new();
        bus.set_ram(ADDRESS_SPACE).unwrap();
        bus
    }

    #[test]
    fn test_bus_creation() {
        let bus = Bus::new();
        // Verify default mappings are set up
        assert!(!bus.mappings.is_empty());
    }

    #[test]
    fn test_bus_ram_access() {
        let mut bus = bus_with_ram();

        // Write to RAM region
        bus.write(0x0100, 0x42);
        assert_eq!(bus.read(0x0100), 0x42);

        // Write to extended RAM
        bus.write(0xE000, 0xAA);
        assert_eq!(bus.read(0xE000), 0xAA);
    }

    #[test]
    fn test_ram_starts_zeroed_and_covers_both_banks_to_their_last_byte() {
        let mut bus = bus_with_ram();

        for address in [0x0000u16, 0x0FFF, 0xE000, 0xEFFF] {
            assert_eq!(bus.read(address), 0x00, "${address:04X} before a write");
            bus.write(address, 0x5A);
            assert_eq!(bus.read(address), 0x5A, "${address:04X} after a write");
        }
    }

    #[test]
    fn test_ram_reads_open_bus_until_it_is_installed() {
        let mut bus = Bus::new();

        bus.write(0x0100, 0x42);
        assert_eq!(bus.read(0x0100), 0xFF);
        assert_eq!(bus.get_ram_len(), 0);
    }

    #[test]
    fn test_ram_mapped_page_beyond_the_installed_size_reads_zero_and_ignores_writes() {
        let mut bus = Bus::new();
        bus.set_ram(0x1000).unwrap(); // covers bank 1 only

        bus.write(0x0FFF, 0x11);
        bus.write(0xE000, 0x22);

        assert_eq!(bus.read(0x0FFF), 0x11);
        assert_eq!(bus.read(0xE000), 0x00);
        assert_eq!(bus.get_ram_len(), 0x1000);
    }

    #[test]
    fn test_ram_size_must_be_whole_pages() {
        let mut bus = Bus::new();
        assert!(bus.set_ram(0x1001).is_err());
    }

    #[test]
    fn test_unmapped_addresses_float_and_ignore_writes() {
        let mut bus = bus_with_ram();

        // Just past each mapped region, and the middle of the gap.
        for address in [0x1000u16, 0x8000, 0xCFFF, 0xF000, 0xFEFF] {
            bus.write(address, 0x42);
            assert_eq!(bus.read(address), 0xFF, "${address:04X}");
        }
    }

    #[test]
    fn test_bus_rom_access() {
        let mut bus = bus_with_ram();
        let mut rom = ROM::new(0x100); // 256 bytes

        // Flash ROM with test data
        let flash_data = vec![0x00, 0xFF, 0x12, 0x34, 0x56, 0x78];
        rom.flash(flash_data).unwrap();
        bus.set_rom(&rom);

        // Read from ROM region (0xFF00-0xFFFF)
        assert_eq!(bus.read(0xFF00), 0x12);
        assert_eq!(bus.read(0xFF01), 0x34);
        // Bytes the image did not reach stay unprogrammed
        assert_eq!(bus.read(0xFFFF), 0xFF);

        // ROM writes should be ignored
        bus.write(0xFF00, 0xFF);
        assert_eq!(bus.read(0xFF00), 0x12); // Still original value
    }

    #[test]
    fn test_rom_reads_open_bus_until_it_is_installed() {
        let bus = bus_with_ram();
        assert_eq!(bus.read(0xFFFC), 0xFF);
    }
}
