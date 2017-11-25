class AddressSpaces {

    constructor(addressMapping) {
        this.addressMapping = addressMapping;
        this.addressMapArray = Object.values(this.addressMapping);
    }

    _findInstanceWithAddress(address) {
        return this.addressMapArray.find((item) => {
            return address >= item.addr[0] && address <= item.addr[1];
        })
    }

    read(address) {
        let val = 0;
        const addrInstance = this._findInstanceWithAddress(address);
        if (addrInstance) {
            val = addrInstance.instance.read(address - addrInstance.addr[0])
        }

        return val;
    }

    write(address, value) {
        const addrInstance = this._findInstanceWithAddress(address);
        if (addrInstance) {
            addrInstance.instance.write(address - addrInstance.addr[0], value);
        }
    }

}

export default AddressSpaces;