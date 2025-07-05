/**
 * Standardized types for IInspectableComponent implementations
 */

/**
 * Base properties that all inspectable components must provide
 */
export interface InspectableBase {
    id: string;
    type: string;
    name?: string;
}

/**
 * Memory address information
 */
export interface InspectableAddress {
    address?: string;
    addressName?: string;
}

/**
 * Performance statistics
 */
export interface InspectableStats {
    [key: string]: string | number;
}

/**
 * Child component reference
 */
export interface InspectableChild {
    id: string;
    type: string;
    name?: string;
    component?: InspectableData;
}

/**
 * Standard structure for component data
 */
export interface InspectableData extends InspectableBase, InspectableAddress {
    // Memory/Size information
    size?: number;
    
    // Performance/Statistics
    stats?: InspectableStats;
    
    // Hierarchical relationships
    children?: InspectableChild[];
    
    // Component state (formatted for display)
    state?: Record<string, string | number | boolean>;
    
    // Debug information (optional)
    debug?: {
        stack?: Array<{ addr: string; value: number }>;
        disasm?: unknown;
        trace?: unknown;
    };
    
    // Allow additional properties for backward compatibility
    [key: string]: unknown;
}

/**
 * Helper function to format frequency values
 */
export function formatFrequency(hz: number): string {
    if (hz >= 1_000_000) {
        return `${(hz / 1_000_000).toFixed(3)} MHz`;
    } else if (hz >= 1_000) {
        return `${(hz / 1_000).toFixed(3)} kHz`;
    }
    return `${hz.toFixed(3)} Hz`;
}

/**
 * Helper function to format memory addresses
 */
export function formatAddress(addr: number, width: number = 4): string {
    return '$' + addr.toString(16).padStart(width, '0').toUpperCase();
}

/**
 * Helper function to format byte values
 */
export function formatByte(value: number): string {
    return '$' + value.toString(16).padStart(2, '0').toUpperCase();
}