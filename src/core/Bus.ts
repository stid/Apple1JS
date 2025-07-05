import { IInspectableComponent } from './@types/IInspectableComponent';
import { BusSpaceType } from './@types/IoAddressable';
import { WithBusMetadata } from './@types/BusComponent';

class Bus implements IInspectableComponent {
    id = 'bus';
    type = 'Bus';
    name?: string;
    private busMapping: Array<BusSpaceType>;
    private sortedAddrs: Array<BusSpaceType>;
    private addressCache: Map<number, BusSpaceType> = new Map();
    private readonly maxCacheSize = 256;
    private cacheHits = 0;
    private cacheAccesses = 0;

    /**
     * Returns a serializable architecture view of the Bus and its children, suitable for inspectors.
     */
    getInspectable() {
        const self = this as WithBusMetadata<typeof this>;
        return {
            id: this.id,
            type: this.type,
            name: this.name,
            address: self.__address,
            addressName: self.__addressName,
            mapping: this.busMapping.map((b) => {
                const child =
                    b.component && typeof b.component.getInspectable === 'function'
                        ? b.component.getInspectable()
                        : undefined;
                return {
                    name: b.name,
                    addr: b.addr,
                    child,
                };
            }),
            mappingCount: this.busMapping.length,
            sorted: this.sortedAddrs.length > 0,
            cacheSize: this.addressCache.size,
            cacheHitRate: this.getCacheHitRate(),
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
    }

    /**
     * Get cache hit rate for performance monitoring.
     * @returns Cache hit rate as a percentage (0-100).
     */
    private getCacheHitRate(): number {
        return this.cacheAccesses === 0 ? 0 : (this.cacheHits / this.cacheAccesses) * 100;
    }

    /**
     * Clear the address cache.
     */
    clearCache(): void {
        this.addressCache.clear();
        this.cacheHits = 0;
        this.cacheAccesses = 0;
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
     * Find the component instance containing the given address using cached lookup with binary search fallback.
     * @param address - The memory address to search for.
     * @returns The BusSpaceType object containing the address, or undefined if not found.
     */
    private findInstanceWithAddress(address: number): BusSpaceType | undefined {
        this.cacheAccesses++;

        // Try cache first
        const cached = this.addressCache.get(address);
        if (cached && address >= cached.addr[0] && address <= cached.addr[1]) {
            this.cacheHits++;
            return cached;
        }

        // Binary search fallback
        let left = 0;
        let right = this.sortedAddrs.length - 1;

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const current = this.sortedAddrs[mid];

            if (address >= current.addr[0] && address <= current.addr[1]) {
                // Cache the result
                this.cacheAddress(address, current);
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
     * Cache an address mapping, implementing LRU eviction when cache is full.
     * @param address - The memory address to cache.
     * @param busSpace - The BusSpaceType containing this address.
     */
    private cacheAddress(address: number, busSpace: BusSpaceType): void {
        if (this.addressCache.size >= this.maxCacheSize) {
            // Simple LRU: remove the first (oldest) entry
            const firstKey = this.addressCache.keys().next().value;
            if (firstKey !== undefined) {
                this.addressCache.delete(firstKey);
            }
        }
        this.addressCache.set(address, busSpace);
    }

    /**
     * Read a value from a specific address.
     * @param address - The memory address to read from.
     * @returns The value at the specified address, or 0 if the address is not found.
     */
    read(address: number): number {
        const addrInstance = this.findInstanceWithAddress(address);
        return addrInstance ? addrInstance.component.read(address - addrInstance.addr[0]) : 0;
    }

    /**
     * Write a value to a specific address.
     * @param address - The memory address to write to.
     * @param value - The value to be written.
     */
    write(address: number, value: number): void {
        const addrInstance = this.findInstanceWithAddress(address);
        if (addrInstance) {
            addrInstance.component.write(address - addrInstance.addr[0], value);
        }
    }


    toDebug(): { [key: string]: string } {
        const result: { [key: string]: string } = {};
        
        // Memory address mappings
        this.busMapping.forEach((element) => {
            const from: string = element.addr[0].toString(16).padStart(4, '0').toUpperCase();
            const to: string = element.addr[1].toString(16).padStart(4, '0').toUpperCase();
            const name: string = element.name || 'Unknown';
            result[name] = `[${from}]:[${to}]`;
        });
        
        // Cache performance statistics
        result['CACHE'] = `${this.addressCache.size}/${this.maxCacheSize}`;
        result['HIT_RATE'] = `${this.getCacheHitRate().toFixed(1)}%`;
        result['ACCESSES'] = `${this.cacheAccesses}`;
        
        return result;
    }
}

export default Bus;
