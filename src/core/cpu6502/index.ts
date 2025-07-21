/**
 * 6502 CPU Module
 * 
 * This module exports the complete 6502 CPU implementation.
 */

// Export the main CPU class as default
export { default } from './core';
export { default as CPU6502 } from './core';

// Export types
export type { CPU6502Interface } from './types';

// Export the opcode table if needed by external modules
export { default as CPU6502op } from './opcodes';

// Re-export addressing modes and instructions for testing or extension
export * as addressing from './addressing';
export * as instructions from './instructions';
export * as debug from './debug';