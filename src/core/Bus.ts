import type { IInspectableComponent, InspectableData, InspectableChild, BusSpaceType, WithBusMetadata, IoAddressable } from './types';
// formatAddress replaced by direct use of Formatters
import { BusError } from './errors';
import { Formatters } from '../utils/formatters';

/**
 * The value a floating Apple 1 data bus reads back when no device answers.
 */
const OPEN_BUS = 0xff;

/** 256-byte pages in the 64K address space. */
const PAGE_COUNT = 256;

/**
 * Offset of `address` within its mapping, honouring partial decoding.
 * Without a mask this is plain exact decoding.
 */
function decodeOffset(space: BusSpaceType, address: number): number {
    const offset = address - space.addr[0];
    return space.mirrorMask === undefined ? offset : offset & space.mirrorMask;
}

class Bus implements IInspectableComponent {
    id = 'bus';
    type = 'Bus';
    name?: string;
    private busMapping: Array<BusSpaceType>;
    private sortedAddrs: Array<BusSpaceType>;
    private pageTable: Array<BusSpaceType | null | undefined>;

    /**
     * Returns a standardized view of the Bus component.
     */
    getInspectable(): InspectableData {
        const self = this as WithBusMetadata<typeof this>;
        
        const children: InspectableChild[] = this.busMapping.map((b) => {
            const child: InspectableChild = {
                id: b.name || 'unknown',
                type: 'BusMapping',
                name: `${b.name} [${Formatters.hexWord(b.addr[0])}-${Formatters.hexWord(b.addr[1])}]`
            };
            
            // Check if component also implements IInspectableComponent
            const inspectableComponent = b.component as IoAddressable & Partial<IInspectableComponent>;
            if (inspectableComponent && typeof inspectableComponent.getInspectable === 'function') {
                child.component = inspectableComponent.getInspectable();
            }
            
            return child;
        });
        
        return {
            id: this.id,
            type: this.type,
            name: this.name ?? '',
            ...(self.__address !== undefined && { address: self.__address }),
            ...(self.__addressName !== undefined && { addressName: self.__addressName }),
            state: {
                mappingCount: this.busMapping.length,
                sorted: this.sortedAddrs.length > 0,
            },
            children,
            // Backward compatibility - flat properties
            mappingCount: this.busMapping.length,
            sorted: this.sortedAddrs.length > 0,
        };
    }

    /**
     * Construct a new Bus object.
     * @param busMapping - An array of BusSpaceType objects representing the bus address space mapping.
     */
    constructor(busMapping: Array<BusSpaceType>) {
        this.busMapping = busMapping;
        this.sortedAddrs = this.sortAddresses(busMapping);
        this.validate();
        this.pageTable = this.buildPageTable();
    }

    /**
     * Sort the busMapping array by starting addresses.
     * @param busMapping - An array of BusSpaceType objects to be sorted.
     * @returns A sorted array of BusSpaceType objects.
     */
    private sortAddresses(busMapping: Array<BusSpaceType>): Array<BusSpaceType> {
        return busMapping.sort((itemA: BusSpaceType, itemB: BusSpaceType): number => itemA.addr[0] - itemB.addr[0]);
    }

    /**
     * Validate the bus mapping by checking that start < end and there is no overlap between address ranges.
     * @throws Will throw an error if any validation fails.
     */
    private validate(): void {
        this.sortedAddrs.forEach((item: BusSpaceType) => {
            if (item.addr[0] > item.addr[1]) {
                throw new BusError(`"${item.name}": Starting address is greater than ending address`);
            }
        });

        for (let i = 0; i < this.sortedAddrs.length - 1; i++) {
            if (this.sortedAddrs[i].addr[1] >= this.sortedAddrs[i + 1].addr[0]) {
                throw new BusError(`Space "${this.sortedAddrs[i].name}" overlaps with "${this.sortedAddrs[i + 1].name}"`);
            }
        }
    }

    /**
     * Build the per-page decode table: for each 256-byte page, the mapping that
     * covers all of it, `null` when no mapping touches it, or `undefined` when
     * the page is only partly covered or shared and needs a search.
     */
    private buildPageTable(): Array<BusSpaceType | null | undefined> {
        const table: Array<BusSpaceType | null | undefined> = new Array(PAGE_COUNT);
        for (let page = 0; page < PAGE_COUNT; page++) {
            const first = page << 8;
            const last = first | 0xff;
            const touching = this.sortedAddrs.filter((space) => space.addr[0] <= last && space.addr[1] >= first);
            if (touching.length === 0) {
                table[page] = null;
            } else if (touching.length === 1 && touching[0].addr[0] <= first && touching[0].addr[1] >= last) {
                table[page] = touching[0];
            } else {
                table[page] = undefined;
            }
        }
        return table;
    }

    /**
     * Find the mapping that contains the given address.
     *
     * One table read settles every page that is wholly mapped or wholly empty,
     * which on the Apple 1 is all of them. A page index outside the table (an
     * address the CPU formed beyond $FFFF) reads `undefined` like a mixed page
     * and falls through to the search, which finds nothing.
     */
    private findInstanceWithAddress(address: number): BusSpaceType | null {
        const space = this.pageTable[address >> 8];
        return space !== undefined ? space : this.searchMappings(address);
    }

    /** Binary search over the sorted mappings, for pages the table cannot settle. */
    private searchMappings(address: number): BusSpaceType | null {
        let left = 0;
        let right = this.sortedAddrs.length - 1;

        while (left <= right) {
            const mid = (left + right) >> 1;
            const current = this.sortedAddrs[mid];

            if (address < current.addr[0]) {
                right = mid - 1;
            } else if (address > current.addr[1]) {
                left = mid + 1;
            } else {
                return current;
            }
        }

        return null;
    }

    /**
     * Read a value from a specific address.
     * @param address - The memory address to read from.
     * @returns The value at the specified address, or the floating-bus value
     *          when no device answers.
     */
    read(address: number): number {
        const addrInstance = this.findInstanceWithAddress(address);
        // Nothing drives an unmapped address, so the bus floats high.
        return addrInstance ? addrInstance.component.read(decodeOffset(addrInstance, address)) : OPEN_BUS;
    }

    /**
     * Read for inspection: same value as read(), but a device that reacts to
     * being read (the PIA clears its interrupt flags) is left untouched.
     */
    peek(address: number): number {
        const addrInstance = this.findInstanceWithAddress(address);
        if (!addrInstance) {
            return OPEN_BUS;
        }
        const offset = decodeOffset(addrInstance, address);
        const { component } = addrInstance;
        return component.peek ? component.peek(offset) : component.read(offset);
    }

    /**
     * Write a value to a specific address.
     * @param address - The memory address to write to.
     * @param value - The value to be written.
     */
    write(address: number, value: number): void {
        const addrInstance = this.findInstanceWithAddress(address);
        if (addrInstance) {
            addrInstance.component.write(decodeOffset(addrInstance, address), value);
        }
    }


    toDebug(): { [key: string]: string } {
        const result: { [key: string]: string } = {};
        
        // Memory address mappings
        this.busMapping.forEach((element) => {
            const from: string = Formatters.hex(element.addr[0], 4);
            const to: string = Formatters.hex(element.addr[1], 4);
            const name: string = element.name || 'Unknown';
            result[name] = `[${from}]:[${to}]`;
        });
        
        return result;
    }
}

export default Bus;
