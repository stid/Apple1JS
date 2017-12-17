// @flow
import type {AddressSpaceType} from '../core/flowTypes/IoAddressable'

class AddressSpaces {
    +addressMapping: Array<AddressSpaceType>;

    constructor(addressMapping: Array<AddressSpaceType>) {
        this.addressMapping = addressMapping;
    }

    _findInstanceWithAddress(address: number): AddressSpaceType | void {
        return this.addressMapping.find( (item: AddressSpaceType) => address >= item.addr[0] && address <= item.addr[1] );
    }

    read(address: number): number {
        const addrInstance: AddressSpaceType | void = this._findInstanceWithAddress(address);
        if (addrInstance != null && addrInstance != undefined) {
            return addrInstance.component.read(address - addrInstance.addr[0])
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
        console.log(this.addressMapping);
    }

}

export default AddressSpaces;