/**
 * UI update and refresh timings, in milliseconds.
 */

// Component refresh rates
export const REFRESH_RATES = {
    /** Normal refresh for active debugging components */
    NORMAL: 500,

    /** Shared engine-status poll (useEngineStatus) */
    ENGINE_STATUS: 2000,
} as const;

// Debug component specific rates
export const DEBUG_REFRESH_RATES = {
    /** Memory viewer */
    MEMORY_VIEW: REFRESH_RATES.NORMAL,

    /** Stack viewer */
    STACK_VIEW: REFRESH_RATES.NORMAL,

    /** Machine tree behind the Board view */
    BOARD: REFRESH_RATES.NORMAL,
} as const;

// Animation and UI effect timings
export const UI_TIMINGS = {
    /** CRT cursor blink rate */
    CURSOR_BLINK_RATE: 530,

    /** How long a non-error toast stays on screen before auto-dismissing */
    TOAST_DURATION: 4000,
} as const;
