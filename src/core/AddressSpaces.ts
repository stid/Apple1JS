class AddressSpaces {
    private addressMapping: Array<AddressSpaceType>;

    constructor(addressMapping: Array<AddressSpaceType>) {
        this.addressMapping = addressMapping;
    }

    private _findInstanceWithAddress(address: number): AddressSpaceType | void {
        return this.addressMapping.find((item: AddressSpaceType) => address >= item.addr[0] && address <= item.addr[1]);
    }

    read(address: number): number {
        const addrInstance: AddressSpaceType | void = this._findInstanceWithAddress(address);
        if (addrInstance != null && addrInstance != undefined) {
            return addrInstance.component.read(address - addrInstance.addr[0]);
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
