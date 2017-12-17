// @flow
import {type IoAddressable} from './flowTypes/IoAddressable'

const DEFAULT_RAM_BANK_SIZE: number = 4096;

class RAM implements IoAddressable {
    +data: Array<number>;

    constructor(byteSize: number = DEFAULT_RAM_BANK_SIZE) {
        this.data = new Array(byteSize);
        this.data.fill(0)
    }

    read(address: number): number {
        return this.data[address] || 0;
    }

    write(address: number, value: number): void {
        this.data[address] = value;
    }

    bulkLoad(data: Array<number>): void {
        // LOAD A PROG
        const prg_addr: number = data[1] | data[0] << 8;
        for (let i = 0; i < (data.length)-2 ; i++) {
            this.data[prg_addr+i] = data[i+2];
        }
    }
}

export default RAM;