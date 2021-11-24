class Bus {
    private busMapping: Array<BusSpaceType>;

    constructor(busMapping: Array<BusSpaceType>) {
        this.busMapping = busMapping;
        this._validate();
    }

    private _validate() {
        // Validate Start < End
        this.busMapping.forEach((item: BusSpaceType) => {
            if (item.addr[0] > item.addr[1]) {
                throw Error(`${item.name} Starting address > ending address`);
            }
        });

        // Validate No Overlap
        const sortedAddrs = this.busMapping.sort(
            (itemA: BusSpaceType, itemB: BusSpaceType): number => itemA.addr[0] - itemB.addr[0],
        );

        for (let i = 0; i < sortedAddrs.length - 1; i++) {
            if (sortedAddrs[i].addr[1] >= sortedAddrs[i + 1].addr[0]) {
                throw Error(`Space ${sortedAddrs[i].name} overlap with ${sortedAddrs[i + 1].name}`);
            }
        }
    }

    private _findInstanceWithAddress(address: number): BusSpaceType | void {
        return this.busMapping.find((item: BusSpaceType) => address >= item.addr[0] && address <= item.addr[1]);
    }

    read(address: number): number {
        const addrInstance = this._findInstanceWithAddress(address);
        return addrInstance ? addrInstance.component.read(address - addrInstance.addr[0]) : 0;
    }

    write(address: number, value: number): void {
        const addrInstance = this._findInstanceWithAddress(address);
        if (addrInstance) {
            addrInstance?.component.write(address - addrInstance.addr[0], value);
        }
    }

    toLog(): void {
        console.log(this.toDebug());
    }

    toDebug(): { [key: string]: string } {
        const result: { [key: string]: string } = {};
        this.busMapping.forEach((element) => {
            const from: string = element.addr[0].toString(16).padStart(4, '0').toUpperCase();
            const to: string = element.addr[1].toString(16).padStart(4, '0').toUpperCase();
            const name: string = element.name || 'Unknown';
            result[name] = `[${from}]:[${to}]`;
        });
        return result;
    }
}

export default Bus;
