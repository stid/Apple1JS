const DEFAULT_ROM_SIZE = 256;

class ROM {

    constructor(byteSize=DEFAULT_ROM_SIZE) {
        this.data = new Array(byteSize);
        this.data.fill(0);
    }

    read(address) {
        return this.data[address] || 0;
    }

    write(address, value) {
    }

    bulkLoad(data) {
        for (let i = 0; i < data.length ; i++) {
            this.data[i] = data[i];
        }
    }

}

export default ROM;