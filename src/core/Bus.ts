import type { IInspectableComponent, InspectableData, InspectableChild, BusSpaceType, WithBusMetadata, IoAddressable } from './types';
import { formatAddress } from './@types/InspectableTypes'; // TODO: Remove after full migration
import { BusError } from './errors';
import { Formatters } from '../utils/formatters';

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
     * Returns a standardized view of the Bus component.
     */
    getInspectable(): InspectableData {
        const self = this as WithBusMetadata<typeof this>;
        
        const children: InspectableChild[] = this.busMapping.map((b) => {
            const child: InspectableChild = {
                id: b.name || 'unknown',
                type: 'BusMapping',
                name: `${b.name} [${formatAddress(b.addr[0])}-${formatAddress(b.addr[1])}]`
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
                cacheSize: this.addressCache.size,
            },
            stats: {
                cacheHitRate: this.getCacheHitRate().toFixed(1) + '%',
                cacheAccesses: this.cacheAccesses,
                cacheHits: this.cacheHits
            },
            children,
            // Backward compatibility - flat properties
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
            const from: string = Formatters.hex(element.addr[0], 4);
            const to: string = Formatters.hex(element.addr[1], 4);
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
