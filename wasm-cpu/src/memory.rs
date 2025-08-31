/*!
 * Memory management module
 * 
 * Handles memory-mapped I/O and special memory regions
 */

use crate::CPU6502;

impl CPU6502 {
    /// Check if address is in ROM region
    pub(crate) fn is_rom(&self, address: u16) -> bool {
        address >= 0xFF00
    }
    
    /// Check if address is in I/O region (PIA)
    pub(crate) fn is_io(&self, address: u16) -> bool {
        (address >= 0xD010) && (address <= 0xD013)
    }
}