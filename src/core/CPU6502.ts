/**
 * CPU6502 Re-export
 * 
 * This file maintains backward compatibility by re-exporting
 * the modularized CPU6502 implementation.
 */

// Re-export the default CPU6502 class
export { default } from './cpu6502/core';

// Re-export the named export
export { default as CPU6502 } from './cpu6502/core';

// Re-export types if needed
export type { CPU6502Interface } from './cpu6502/types';

// Re-export opcodes if needed
export { default as CPU6502op } from './cpu6502/opcodes';