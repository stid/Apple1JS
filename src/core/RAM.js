// @flow
import {type IoAddressable} from './flowTypes/IoAddressable';

const DEFAULT_RAM_BANK_SIZE: number = 4096;

class RAM implements IoAddressable {
    +data: Array<number>;

    constructor(byteSize: number = DEFAULT_RAM_BANK_SIZE) {
        this.data = new Array(byteSize).fill(0);
    }

    read(address: number): number {
        return this.data[address] || 0;
    }

    write(address: number, value: number): void {
        this.data[address] = value;
    }

    flash(data: Array<number>): void {
        // LOAD A PROG
        const [high_addr, low_addr, ...coreData] = data;
        const prg_addr: number = high_addr | low_addr << 8;

        for (let i: number = 0; i < (coreData.length) ; i++) {
            this.data[prg_addr+i] = coreData[i];
        }
    }

}

export default RAM;