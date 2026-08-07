/**
 * Apple 1 system constants
 */

// Timing constants
export const CPU_SPEED_MHZ = 1; // 1 MHz
export const CPU_STEP_INTERVAL_MS = 30; // CPU stepping interval in milliseconds

// Display constants
export const DISPLAY_COLUMNS = 40;
export const DISPLAY_ROWS = 24;
export const DISPLAY_DELAY_MS = 17; // one NTSC video field — ~60 characters/second
// The terminal stores characters in recirculating shift registers, so the
// processor waits a full video field (~16.7ms) for the target position to come
// round again. At ~1MHz that is roughly this many CPU cycles.
export const DISPLAY_FIELD_CYCLES = 17_000;

// Character codes
export const CHAR_BACKSPACE = 95; // Underscore character used as backspace
export const CHAR_CARRIAGE_RETURN = 13;
export const CHAR_ESCAPE = 27;
export const CHAR_CLEAR_SCREEN = 12;

// ASCII character range
export const ASCII_PRINTABLE_MIN = 32;
export const ASCII_PRINTABLE_MAX = 126;
export const ASCII_MAX = 255;

// Special codes
export const RESET_SIGNAL_CODE = -255;

// Bit masks
export const BIT_7_MASK = 0x7f;