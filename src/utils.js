export const bitClear = function(num, bit){
    return num & ~(1<<bit);
}

export const bitSet= function(num, bit){
    return num | 1<<bit;
}
