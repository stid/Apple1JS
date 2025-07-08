/**
 * UI Update and Refresh Constants
 * 
 * Standardized timing constants for component updates across the application.
 * These values balance responsiveness with performance.
 */

// Component refresh rates in milliseconds
export const REFRESH_RATES = {
    /** Fast refresh for real-time components (e.g., CPU registers during execution) */
    FAST: 100,
    
    /** Normal refresh for active debugging components */
    NORMAL: 500,
    
    /** Slow refresh for mostly static components */
    SLOW: 1000,
    
    /** Very slow refresh for background monitoring */
    BACKGROUND: 5000,
} as const;

// Debug component specific rates
export const DEBUG_REFRESH_RATES = {
    /** CPU state and registers */
    CPU_STATE: REFRESH_RATES.NORMAL,
    
    /** Memory viewer */
    MEMORY_VIEW: REFRESH_RATES.NORMAL,
    
    /** Disassembler view */
    DISASSEMBLER: REFRESH_RATES.NORMAL,
    
    /** Stack viewer */
    STACK_VIEW: REFRESH_RATES.NORMAL,
    
    /** Component inspector tree */
    INSPECTOR: REFRESH_RATES.SLOW,
} as const;

// Animation and UI effect timings
export const UI_TIMINGS = {
    /** Debounce delay for user input */
    DEBOUNCE_DELAY: 300,
    
    /** Throttle delay for frequent updates */
    THROTTLE_DELAY: 100,
    
    /** Animation duration for transitions */
    ANIMATION_DURATION: 200,
    
    /** Delay before showing loading indicators */
    LOADING_DELAY: 1000,
    
    /** CRT cursor blink rate */
    CURSOR_BLINK_RATE: 530,
} as const;

// Hook update patterns
export const UPDATE_PATTERNS = {
    /** Update only when component is visible */
    WHEN_VISIBLE: 'whenVisible',
    
    /** Update continuously regardless of visibility */
    ALWAYS: 'always',
    
    /** Update only when emulation is paused */
    WHEN_PAUSED: 'whenPaused',
    
    /** Update only when emulation is running */
    WHEN_RUNNING: 'whenRunning',
} as const;

export type UpdatePattern = typeof UPDATE_PATTERNS[keyof typeof UPDATE_PATTERNS];