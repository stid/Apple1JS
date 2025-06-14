import { IoAddressable } from './@types/IoAddressable';

const DEFAULT_RAM_BANK_SIZE = 4096;
class RAM implements IoAddressable {
    private data: Uint8Array;

    constructor(byteSize: number = DEFAULT_RAM_BANK_SIZE) {
        this.data = new Uint8Array(byteSize);
    }

    read(address: number): number {
        return this.data[address] || 0;
    }

    write(address: number, value: number): void {
        if (address < this.data.length && address >= 0) {
            this.data[address] = value;
        }
    }

    flash(data: Array<number>): void {
        const [highAddr, lowAddr, ...coreData] = data;

        if (coreData.length > this.data.length) {
            throw new Error(`Flash Data too large (${coreData.length} -> ${this.data.length})`);
        }

        const prgAddr: number = highAddr | (lowAddr << 8);

        if (prgAddr + coreData.length > this.data.length) {
            throw new Error(
                `Flash Data would write outside of bounds (address: ${prgAddr}, length: ${coreData.length})`,
            );
        }

        const coreDataTyped = new Uint8Array(coreData);
        this.data.set(coreDataTyped, prgAddr);
    }
}

export default RAM;
