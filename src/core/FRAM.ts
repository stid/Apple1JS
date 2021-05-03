const DEFAULT_RAM_BANK_SIZE = 4096;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const FRAM = (byteSize: number = DEFAULT_RAM_BANK_SIZE, initWithData?: number[]) => {
    const data: number[] = initWithData || new Array(byteSize).fill(0);

    const read = (address: number) => {
        return data[address] || 0;
    };

    const write = (address: number, value: number) => {
        const newData = Object.assign([], data, { [address]: value });
        return FRAM(byteSize, newData);
    };

    const flash = (flashData: number[]) => {
        // LOAD A PROG
        const [highAddr, lowAddr, ...coreData] = flashData;
        const prgAddr: number = highAddr | (lowAddr << 8);

        const newData = data.map((byte: number, index: number) => {
            if (index >= prgAddr && index < prgAddr + coreData.length) {
                return coreData[index - prgAddr];
            } else {
                return byte;
            }
        });
        return FRAM(byteSize, newData);
    };

    return {
        read,
        write,
        flash,
    };
};

export default FRAM;
