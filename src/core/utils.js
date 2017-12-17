// @flow
export const bitClear = function(num: number, bit: number): number{
    return num & ~(1<<bit);
}

export const bitSet= function(num: number, bit: number): number{
    return num | 1<<bit;
}

export function bitTest(num: number, bit: number): boolean{
    return ((num>>bit) % 2 != 0)
}

export function bit_toggle(num: number, bit: number): number{
    return bitTest(num, bit) ? bitClear(num, bit) : bitSet(num, bit);
}
