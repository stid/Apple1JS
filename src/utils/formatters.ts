/**
 * Unified formatting utilities for consistent data representation across the application.
 * This module provides a single source of truth for all formatting operations.
 */

/**
 * Core hex formatting function
 * @param value - The numeric value to format
 * @param width - The minimum width of the output (padded with zeros)
 * @returns Uppercase hex string without prefix
 */
export function hex(value: number, width: number = 2): string {
    return value.toString(16).padStart(width, '0').toUpperCase();
}

/**
 * Format a byte value with $ prefix
 * @param value - Byte value (0-255)
 * @returns Formatted string like "$FF"
 */
export function hexByte(value: number): string {
    return '$' + hex(value & 0xFF, 2);
}

/**
 * Format a word value with $ prefix
 * @param value - Word value (0-65535)
 * @returns Formatted string like "$FFFF"
 */
export function hexWord(value: number): string {
    return '$' + hex(value & 0xFFFF, 4);
}

/**
 * Format a memory address
 * @param value - Address value (0-65535)
 * @returns Formatted string like "$FFFF"
 */
export function address(value: number): string {
    return hexWord(value);
}

/**
 * Format a value that could be either string or number
 * @param value - The value to format
 * @param width - The minimum width for numeric values
 * @returns Formatted hex string with $ prefix
 */
export function formatHex(value: string | number | undefined, width: number): string {
    if (value === undefined || value === null) {
        return width === 4 ? '$0000' : '$00';
    }
    if (typeof value === 'string' && value.startsWith('$')) {
        // Already formatted, ensure correct padding
        const hexPart = value.substring(1);
        return '$' + hexPart.padStart(width, '0').toUpperCase();
    }
    // For numeric values or plain strings, parse as number
    const num = typeof value === 'string' ? parseInt(value, 10) : value;
    return width === 4 ? hexWord(num) : hexByte(num);
}

/**
 * Format an array of bytes as space-separated hex values
 * @param bytes - Array of byte values
 * @returns Formatted string like "FF 00 1A"
 */
export function hexBytes(bytes: number[]): string {
    return bytes.map(b => hex(b, 2)).join(' ');
}

/**
 * Parse a hex string (with or without $ prefix) to number
 * @param str - Hex string to parse
 * @returns Numeric value or NaN if invalid
 */
export function parseHex(str: string): number {
    if (!str) return NaN;
    const cleaned = str.replace(/^\$/, '').replace(/^0x/i, '');
    return parseInt(cleaned, 16);
}

/**
 * Format a decimal number with thousand separators
 * @param value - Numeric value
 * @returns Formatted string like "1,234,567"
 */
export function decimal(value: number): string {
    return value.toLocaleString();
}

/**
 * Format a CPU flag value
 * @param value - Flag value (boolean or 0/1)
 * @returns "SET" or "CLR"
 */
export function flag(value: boolean | number): string {
    return value ? 'SET' : 'CLR';
}

/**
 * Format a binary value
 * @param value - Numeric value
 * @param width - The minimum width of the output
 * @returns Binary string like "10101010"
 */
export function binary(value: number, width: number = 8): string {
    return value.toString(2).padStart(width, '0');
}

/**
 * Unified formatters object for backward compatibility and convenience
 */
export const Formatters = {
    hex,
    hexByte,
    hexWord,
    address,
    formatHex,
    hexBytes,
    parseHex,
    decimal,
    flag,
    binary
};

// Default export for convenience
export default Formatters;