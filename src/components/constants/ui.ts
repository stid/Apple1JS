/**
 * UI-related constants
 */

// CRT display dimensions
export const CRT_TOP_PADDING = 10;
export const CRT_LEFT_PADDING = 10;
export const CRT_CHAR_WIDTH = 16;
export const CRT_CHAR_HEIGHT = 16;
export const CRT_FONT_RECT = [CRT_CHAR_WIDTH, CRT_CHAR_HEIGHT] as const;

// Character rendering
export const CHAR_PIXEL_SIZE = 8; // 8x8 pixel characters
export const CHAR_RENDER_SCALE = 2; // 2x scaling for display
export const CHAR_SPACING_ADJUSTMENT = 4; // Character spacing

// Monitor dimensions calculation
export const MONITOR_WIDTH = CRT_CHAR_WIDTH * 30 + CRT_LEFT_PADDING + 8;
export const MONITOR_HEIGHT = CRT_CHAR_HEIGHT * 24 + CRT_TOP_PADDING * 2;

// Cursor
export const CURSOR_BLINK_INTERVAL_MS = 500;
export const CURSOR_X_OFFSET = -4;
export const CURSOR_Y_OFFSET = -11;

// UI timing
export const MESSAGE_INFO_TIMEOUT_MS = 3000; // 3 seconds
export const MESSAGE_WARNING_TIMEOUT_MS = 10000; // 10 seconds
export const FADE_IN_DURATION_MS = 300;

// CSS values
export const FONT_SIZE_PX = 13;
export const SCANLINE_SPACING_PX = [2, 3, 4] as const;
export const BUTTON_RIGHT_OFFSET_PX = 3;
export const ANIMATION_TRANSLATE_Y_PX = -10;

// Message panel
export const MESSAGE_MAX_HEIGHT_CLASS = 'max-h-32'; // Tailwind class

// Formatting
export const HEX_ADDRESS_PADDING = 4;
export const HIT_RATE_DECIMAL_PLACES = 1;
export const PERCENTAGE_MULTIPLIER = 100;