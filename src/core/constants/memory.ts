/**
 * Memory-related constants for the Apple 1 system
 */

// Memory sizes
export const DEFAULT_RAM_BANK_SIZE = 4096; // 4KB
export const DEFAULT_ROM_SIZE = 256; // 256 bytes

// Memory address ranges
export const RAM_BANK1_START = 0x0000;
export const RAM_BANK1_END = 0x0fff;
export const RAM_BANK1_SIZE = RAM_BANK1_END - RAM_BANK1_START + 1;

export const RAM_BANK2_START = 0xe000;
export const RAM_BANK2_END = 0xefff;
export const RAM_BANK2_SIZE = RAM_BANK2_END - RAM_BANK2_START + 1;

export const ROM_START = 0xff00;
export const ROM_END = 0xffff;

// PIA (Peripheral Interface Adapter) addresses
export const PIA_START = 0xd010;
export const PIA_END = 0xd013;

// Memory value constraints
export const MIN_BYTE_VALUE = 0;
export const MAX_BYTE_VALUE = 255;
export const BYTE_MASK = 0xff;

// I/O block as decoded by the WASM bus: the PIA and its mirrors. The only region
// where a write has a side effect on a device, so it must be performed once.
export const IO_START = 0xd000;
export const IO_END = 0xdfff;
export const isIoAddress = (address: number): boolean => address >= IO_START && address <= IO_END;
