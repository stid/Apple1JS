// @flow
const DEFAULT_ROM_SIZE = 256;
import {type IoAddressable} from './flowTypes/IoAddressable';

class ROM implements IoAddressable {
    +data: Array<number>

    constructor(byteSize: number=DEFAULT_ROM_SIZE) {
        this.data = new Array(byteSize).fill(0);
    }

    read(address: number): number {
        return this.data[address] || 0;
    }

    // eslint-disable-next-line no-unused-vars
    write(address: number, value: number) {
    }

    bulkLoad(data: Array<number>) {
        for (let i = 0; i < data.length ; i++) {
            this.data[i] = data[i];
        }
    }
}

export default ROM;