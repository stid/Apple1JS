const DEFAULT_ROM_SIZE = 256;


export type FROMReturn = {
    read: (address: number) => any;
    write: (_address: number, _value: number) =>FROMReturn;
    flash: (data: number[]) => FROMReturn;
    burn: (data: Array<number>) => FROMReturn;
}


const FROM = (byteSize: number = DEFAULT_ROM_SIZE, initWithData?: number[]): FROMReturn => {
    const data = initWithData || new Array(byteSize).fill(0);

    const read = (address: number) => {
        return data[address] || 0;
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const write = (_address: number, _value: number) => {
        return FROM(byteSize, data);
    };
    const flash = (data: number[]) => {
        return FROM(byteSize, [...data].splice(2));
    };
    const burn = (data: Array<number>) => {
        return flash(data);
    };

    return {
        read,
        write,
        flash,
        burn,
    };
};

export default FROM;
