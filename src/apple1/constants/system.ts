/**
 * Apple 1 system constants
 */

// Timing constants
export const CPU_SPEED_MHZ = 1; // 1 MHz
export const CPU_STEP_INTERVAL_MS = 30; // CPU stepping interval in milliseconds

// Display constants
export const DISPLAY_DELAY_MS = 17; // one NTSC video field — ~60 characters/second

// Character codes
export const CHAR_BACKSPACE = 95; // Underscore character used as backspace
export const CHAR_CARRIAGE_RETURN = 13;
export const CHAR_ESCAPE = 27;
export const CHAR_CLEAR_SCREEN = 12;

// Bit masks
export const BIT_7_MASK = 0x7f;