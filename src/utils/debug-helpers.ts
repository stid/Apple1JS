/**
 * Helper functions for working with debug data
 */

/**
 * Type guard to check if a value is a string or number (not an object)
 */
export function isStringOrNumber(value: unknown): value is string | number {
    return typeof value === 'string' || typeof value === 'number';
}

/**
 * Safely extract a string or number value from debug data
 * @param value The value from debug data which could be of any type
 * @returns The value if it's a string or number, undefined otherwise
 */
export function getDebugValue(value: unknown): string | number | undefined {
    if (typeof value === 'string' || typeof value === 'number') {
        return value;
    }
    return undefined;
}

/**
 * Safely extract a string or number value with a default fallback
 * @param value The value from FilteredDebugData
 * @param defaultValue The default value to return if value is not string/number
 * @returns The value if it's a string or number, otherwise the defaultValue
 */
export function getDebugValueOrDefault(
    value: string | number | object | undefined,
    defaultValue: string | number
): string | number {
    if (value === undefined || value === null) {
        return defaultValue;
    }
    
    if (isStringOrNumber(value)) {
        return value;
    }
    
    // If it's an object (like _PERF_DATA), return the default
    return defaultValue;
}

/**
 * Extract a numeric value from a debug value that might be a hex string
 * Handles both string values like "$FF" and numeric values
 */
export function getNumericDebugValue(
    value: string | number | object | undefined,
    defaultValue: number
): number {
    const extracted = getDebugValueOrDefault(value, defaultValue);
    
    if (typeof extracted === 'number') {
        return extracted;
    }
    
    // Handle hex strings like "$FF" or "0xFF"
    if (typeof extracted === 'string') {
        const cleanValue = extracted.replace('$', '');
        const parsed = parseInt(cleanValue, 16);
        return isNaN(parsed) ? defaultValue : parsed;
    }
    
    return defaultValue;
}

/**
 * Safely extract a boolean value from debug data
 * @param value The value from debug data which could be of any type
 * @returns The value if it's a boolean, false otherwise
 */
export function getDebugBoolean(value: unknown): boolean {
    return typeof value === 'boolean' ? value : false;
}

/**
 * Type guard to check if a value is a debug data object
 * @param value The value to check
 * @returns True if the value is an object with string keys
 */
export function isDebugObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}