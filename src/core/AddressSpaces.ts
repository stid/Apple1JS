const FAddressSpace = (addressMapping: Array<AddressSpaceType>) => {

    const _validate = () => {
        // Validate Start < End
        addressMapping.forEach((item: AddressSpaceType) => {
            if (item.addr[0] > item.addr[1]) {
                throw Error(`${item.name} Starting address > ending address`);
            }
        });

        // Validate No Overlap
        const sortedAddrs = addressMapping.sort(
            (itemA: AddressSpaceType, itemB: AddressSpaceType): number => itemA.addr[0] - itemB.addr[0],
        );

        for (let i = 0; i < sortedAddrs.length - 1; i++) {
            if (sortedAddrs[i].addr[1] >= sortedAddrs[i + 1].addr[0]) {
                throw Error(`Space ${sortedAddrs[i].name} overlap with ${sortedAddrs[i + 1].name}`);
            }
        }
    }


    const _findInstanceWithAddress = (address: number): AddressSpaceType | void => {
        return addressMapping.find((item: AddressSpaceType) => address >= item.addr[0] && address <= item.addr[1]);
    }

    const read = (address: number): number => {
        const addrInstance = _findInstanceWithAddress(address);

        if (addrInstance) {
            if (typeof  addrInstance.component === 'function') {
                return addrInstance.component().read(address - addrInstance.addr[0])
            } else {
                return addrInstance.component.read(address - addrInstance.addr[0])
            }
        }

        return 0;
    }

    const write = (address: number, value: number): void => {
        const addrInstance = _findInstanceWithAddress(address);
        if (addrInstance) {
            if (typeof  addrInstance.component === 'function') {
                addrInstance.component().write(address - addrInstance.addr[0], value);
            } else {
                addrInstance.component.write(address - addrInstance.addr[0], value);

            }
        }
    }

    _validate(); 

    return {
        read,
        write
    }
}




class AddressSpaces {
    private addressMapping: Array<AddressSpaceType>;

    constructor(addressMapping: Array<AddressSpaceType>) {
        this.addressMapping = addressMapping;
        this._validate();
    }

    private _validate() {
        // Validate Start < End
        this.addressMapping.forEach((item: AddressSpaceType) => {
            if (item.addr[0] > item.addr[1]) {
                throw Error(`${item.name} Starting address > ending address`);
            }
        });

        // Validate No Overlap
        const sortedAddrs = this.addressMapping.sort(
            (itemA: AddressSpaceType, itemB: AddressSpaceType): number => itemA.addr[0] - itemB.addr[0],
        );

        for (let i = 0; i < sortedAddrs.length - 1; i++) {
            if (sortedAddrs[i].addr[1] >= sortedAddrs[i + 1].addr[0]) {
                throw Error(`Space ${sortedAddrs[i].name} overlap with ${sortedAddrs[i + 1].name}`);
            }
        }
    }

    private _findInstanceWithAddress(address: number): AddressSpaceType | void {
        return this.addressMapping.find((item: AddressSpaceType) => address >= item.addr[0] && address <= item.addr[1]);
    }

    read(address: number): number {
        const addrInstance = this._findInstanceWithAddress(address);

        if (addrInstance) {
            if (typeof  addrInstance.component === 'function') {
                return addrInstance.component().read(address - addrInstance.addr[0])
            } else {
                return addrInstance.component.read(address - addrInstance.addr[0])
            }
        }

        return 0;
    }

    write(address: number, value: number): void {
        const addrInstance = this._findInstanceWithAddress(address);
        if (addrInstance) {
            addrInstance.component.write(address - addrInstance.addr[0], value);
        }
    }

    toLog(): void {
        console.log(this.toDebug());
    }

    toDebug(): { [key: string]: string } {
        const result: { [key: string]: string } = {};
        this.addressMapping.forEach((element) => {
            const from: string = element.addr[0].toString(16).padStart(4, '0').toUpperCase();
            const to: string = element.addr[1].toString(16).padStart(4, '0').toUpperCase();
            const name: string = element.name || 'Unknown';
            result[name] = `[${from}]:[${to}]`;
        });
        return result;
    }
}

export default AddressSpaces;
