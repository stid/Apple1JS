class ROM {

    constructor() {
        this.data = [];
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