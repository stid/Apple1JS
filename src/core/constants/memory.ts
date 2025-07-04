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
export const ROM_SIZE = ROM_END - ROM_START + 1;

// PIA (Peripheral Interface Adapter) addresses
export const PIA_START = 0xd010;
export const PIA_END = 0xd013;
export const PIA_SIZE = PIA_END - PIA_START + 1;

// PIA register offsets
export const PIA_ORA_DDRA = 0x0; // $D010
export const PIA_CRA = 0x1;      // $D011
export const PIA_ORB_DDRB = 0x2; // $D012
export const PIA_CRB = 0x3;      // $D013

// Memory value constraints
export const MIN_BYTE_VALUE = 0;
export const MAX_BYTE_VALUE = 255;
export const BYTE_MASK = 0xff;

// Bus cache
export const MAX_BUS_CACHE_SIZE = 256;