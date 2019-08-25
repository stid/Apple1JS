export const bitClear = (num: number, bit: number): number => {
    return num & ~(1<<bit);
};

export const bitSet = (num: number, bit: number): number => {
    return num | 1<<bit;
};

export const bitTest = (num: number, bit: number): boolean => {
    return ((num>>bit) % 2 != 0);
};

export const bitToggle = (num: number, bit: number): number => {
    return bitTest(num, bit) ? bitClear(num, bit) : bitSet(num, bit);
};

export const isBrowser = () => (typeof window !== 'undefined');
