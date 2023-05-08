/**
 * Clears the specified bit in a given number.
 * @param num - The number whose bit will be cleared.
 * @param bit - The position of the bit to be cleared (0-indexed).
 * @returns The number with the specified bit cleared.
 */
export const bitClear = (num: number, bit: number): number => {
    return num & ~(1 << bit);
};

/**
 * Sets the specified bit in a given number.
 * @param num - The number whose bit will be set.
 * @param bit - The position of the bit to be set (0-indexed).
 * @returns The number with the specified bit set.
 */
export const bitSet = (num: number, bit: number): number => {
    return num | (1 << bit);
};

/**
 * Tests whether the specified bit is set in a given number.
 * @param num - The number to test for the presence of the specified bit.
 * @param bit - The position of the bit to test (0-indexed).
 * @returns A boolean indicating whether the specified bit is set or not.
 */
export const bitTest = (num: number, bit: number): boolean => {
    return ((num >> bit) & 1) === 1;
};

/**
 * Toggles the specified bit in a given number.
 * @param num - The number whose bit will be toggled.
 * @param bit - The position of the bit to be toggled (0-indexed).
 * @returns The number with the specified bit toggled.
 */
export const bitToggle = (num: number, bit: number): number => {
    return num ^ (1 << bit);
};
