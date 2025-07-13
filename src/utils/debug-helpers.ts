/**
 * Helper functions for working with debug data
 */

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