/**
 * PIA6820-related constants
 */

// Control register bit positions
export const PIA_CR_C1_BIT = 0;        // CA1/CB1 control
export const PIA_CR_C1_EDGE_BIT = 1;  // CA1/CB1 edge control
export const PIA_CR_DDR_ACCESS_BIT = 2; // DDR access control
export const PIA_CR_C2_BIT_1 = 3;     // CA2/CB2 control bit 1
export const PIA_CR_C2_BIT_2 = 4;     // CA2/CB2 control bit 2
export const PIA_CR_C2_OUTPUT_BIT = 5; // CA2/CB2 output/input
export const PIA_CR_IRQ1_BIT = 6;      // IRQ1 flag
export const PIA_CR_IRQ2_BIT = 7;      // IRQ2 flag

// Control register masks
export const PIA_CR_DDR_ACCESS_MASK = 0x04;
export const PIA_CR_IRQ_FLAGS_MASK = 0xc0; // Bits 6-7
export const PIA_CR_CONTROL_BITS_MASK = 0x3f; // Bits 0-5

// Port bit masks
export const PIA_PA7_MASK = 0x80; // Port A bit 7 (keyboard strobe)
export const PIA_PB7_MASK = 0x80; // Port B bit 7 (display ready)
export const PIA_DDRB_APPLE1_MASK = 0x7f; // Bits 0-6 output, bit 7 input

// Other PIA constants
export const PIA_LOW_EDGE_TRIGGER = 0x01;
export const PIA_HIGH_EDGE_TRIGGER = 0x08;