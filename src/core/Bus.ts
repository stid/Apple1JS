import { IInspectableComponent } from './@types/IInspectableComponent';
import { BusSpaceType } from './@types/IoAddressable';

class Bus implements IInspectableComponent {
    id = 'bus';
    type = 'Bus';
    private busMapping: Array<BusSpaceType>;
    private sortedAddrs: Array<BusSpaceType>;

    get children() {
        // Return all mapped components as children
        return this.busMapping.map((b) => {
            if (
                b.component &&
                typeof b.component === 'object' &&
                'type' in b.component &&
                'id' in b.component &&
                typeof (b.component as { id: unknown }).id === 'string' &&
                typeof (b.component as { type: unknown }).type === 'string'
            ) {
                return b.component as import('./@types/IInspectableComponent').IInspectableComponent;
            }
            return { id: b.name || 'unknown', type: 'Unknown', children: [] };
        });
    }

    get details() {
        return {
            mapping: this.busMapping.map((b) => ({
                name: b.name,
                addr: b.addr.map((a) => a.toString(16).toUpperCase()).join(':'),
            })),
        };
    }

    /**
     * Construct a new Bus object.
     * @param busMapping - An array of BusSpaceType objects representing the bus address space mapping.
     */
    constructor(busMapping: Array<BusSpaceType>) {
        this.busMapping = busMapping;
        this.sortedAddrs = this._sortAddresses(busMapping);
        this._validate();
    }

    /**
     * Sort the busMapping array by starting addresses.
     * @param busMapping - An array of BusSpaceType objects to be sorted.
     * @returns A sorted array of BusSpaceType objects.
     */
    private _sortAddresses(busMapping: Array<BusSpaceType>): Array<BusSpaceType> {
        return busMapping.sort((itemA: BusSpaceType, itemB: BusSpaceType): number => itemA.addr[0] - itemB.addr[0]);
    }

    /**
     * Validate the bus mapping by checking that start < end and there is no overlap between address ranges.
     * @throws Will throw an error if any validation fails.
     */
    private _validate(): void {
        this.sortedAddrs.forEach((item: BusSpaceType) => {
            if (item.addr[0] > item.addr[1]) {
                throw Error(`"${item.name}": Starting address is greater than ending address`);
            }
        });

        for (let i = 0; i < this.sortedAddrs.length - 1; i++) {
            if (this.sortedAddrs[i].addr[1] >= this.sortedAddrs[i + 1].addr[0]) {
                throw Error(`Space "${this.sortedAddrs[i].name}" overlaps with "${this.sortedAddrs[i + 1].name}"`);
            }
        }
    }

    /**
     * Find the component instance containing the given address using binary search.
     * @param address - The memory address to search for.
     * @returns The BusSpaceType object containing the address, or undefined if not found.
     */
    private _findInstanceWithAddress(address: number): BusSpaceType | undefined {
        let left = 0;
        let right = this.sortedAddrs.length - 1;

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const current = this.sortedAddrs[mid];

            if (address >= current.addr[0] && address <= current.addr[1]) {
                return current;
            } else if (address < current.addr[0]) {
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        }

        return undefined;
    }

    /**
     * Read a value from a specific address.
     * @param address - The memory address to read from.
     * @returns The value at the specified address, or 0 if the address is not found.
     */
    read(address: number): number {
        const addrInstance = this._findInstanceWithAddress(address);
        return addrInstance ? addrInstance.component.read(address - addrInstance.addr[0]) : 0;
    }

    /**
     * Write a value to a specific address.
     * @param address - The memory address to write to.
     * @param value - The value to be written.
     */
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
