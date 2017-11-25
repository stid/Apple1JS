export const bitClear = function(num, bit){
    return num & ~(1<<bit);
}

export const bitSet= function(num, bit){
    return num | 1<<bit;
}

export function bitTest(num, bit){
    return ((num>>bit) % 2 != 0)
}

export function bit_toggle(num, bit){
    return bitTest(num, bit) ? bitClear(num, bit) : bitSet(num, bit);
}

