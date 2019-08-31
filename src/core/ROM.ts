const DEFAULT_ROM_SIZE = 256;

class ROM implements IoAddressable {
    private data: Array<number>;

    constructor(byteSize: number = DEFAULT_ROM_SIZE) {
        this.data = new Array(byteSize).fill(0);
    }

    read(address: number): number {
        return this.data[address] || 0;
    }

    // eslint-disable-next-line no-unused-vars
    write(_address: number, _value: number) {
        return;
    }

    flash(data: Array<number>) {
        this.data = [...data].splice(2);
    }

    burn(data: Array<number>) {
        this.flash(data);
    }
}

export default ROM;
