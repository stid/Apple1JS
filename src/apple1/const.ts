import {
    CHAR_BACKSPACE,
    CHAR_CARRIAGE_RETURN,
    CHAR_ESCAPE,
    CHAR_CLEAR_SCREEN,
    DISPLAY_DELAY_MS,
    BIT_7_MASK
} from './constants/system';

export const BS = CHAR_BACKSPACE; // Backspace key, arrow left key
export const CR = CHAR_CARRIAGE_RETURN; // Carriage Return
export const ESC = CHAR_ESCAPE; // ESC key
export const CLEAR = CHAR_CLEAR_SCREEN;

export const DISPLAY_DELAY = DISPLAY_DELAY_MS; // Around 300 baud

export const B7 = BIT_7_MASK;
