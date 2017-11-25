const DEFAULT_RAM_BANK_SIZE = 4096;

class RAM {
    constructor(byteSize = DEFAULT_RAM_BANK_SIZE) {
        this.data = new Array(byteSize);
        this.data.fill(0)
    }

    read(address) {
        return this.data[address] || 0;
    }

    write(address, value) {
        this.data[address] = value;
    }

    bulkLoad(data) {
        // LOAD A PROG
        const prg_addr = data[1] | data[0] << 8;
        for (let i = 0; i < (data.length)-2 ; i++) {
            this.data[prg_addr+i] = data[i+2];
        }
    }
}

export default RAM;