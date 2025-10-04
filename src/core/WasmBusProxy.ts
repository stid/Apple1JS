/**
 * WASM Bus Proxy
 *
 * Wraps WASM Bus implementation while providing the same interface
 * as the TypeScript Bus class. This enables WASM linear memory to be
 * the single source of truth for the entire memory system.
 */

import type {
    IInspectableComponent,
    InspectableData,
    InspectableChild,
    WithBusMetadata
} from './types';
import type { Bus as WasmBus } from '../wasm/apple1_cpu_wasm';
import { WasmRAMProxy } from './WasmRAMProxy';
import { WasmROMProxy } from './WasmROMProxy';
import { Formatters } from '../utils/formatters';

/**
 * Proxy class that delegates to WASM Bus
 */
export class WasmBusProxy implements IInspectableComponent {
    id = 'bus';
    type = 'Bus';
    name?: string;

    private wasmBus: WasmBus;
    private ramProxy: WasmRAMProxy | null = null;
    private romProxy: WasmROMProxy | null = null;

    constructor(wasmBus: WasmBus, ramProxy?: WasmRAMProxy, romProxy?: WasmROMProxy) {
        this.wasmBus = wasmBus;
        this.ramProxy = ramProxy || null;
        this.romProxy = romProxy || null;
    }

    /**
     * Set the RAM proxy after initialization
     */
    setRAMProxy(ramProxy: WasmRAMProxy): void {
        this.ramProxy = ramProxy;
    }

    /**
     * Set the ROM proxy after initialization
     */
    setROMProxy(romProxy: WasmROMProxy): void {
        this.romProxy = romProxy;
    }

    /**
     * Get the RAM proxy (for direct access)
     */
    getRAMProxy(): WasmRAMProxy | null {
        return this.ramProxy;
    }

    /**
     * Get the ROM proxy (for direct access)
     */
    getROMProxy(): WasmROMProxy | null {
        return this.romProxy;
    }

    // ============ Bus Operations ============

    /**
     * Read a byte from the bus
     */
    read(address: number): number {
        return this.wasmBus.read(address);
    }

    /**
     * Write a byte to the bus
     */
    write(address: number, value: number): void {
        this.wasmBus.write(address, value);
    }

    /**
     * Clear the address cache
     */
    clearCache(): void {
        // WASM bus doesn't expose cache clearing yet
        // This is a no-op for compatibility
    }

    // ============ IInspectableComponent Implementation ============

    getInspectable(): InspectableData {
        const self = this as WithBusMetadata<typeof this>;

        const children: InspectableChild[] = [];

        // Add RAM child if available
        if (this.ramProxy) {
            children.push({
                id: this.ramProxy.id,
                type: 'BusMapping',
                name: `RAM [${Formatters.hexWord(0x0000)}-${Formatters.hexWord(0x0FFF)}]`,
                component: this.ramProxy.getInspectable()
            });

            // Extended RAM
            children.push({
                id: 'ram-ext',
                type: 'BusMapping',
                name: `RAM-EXT [${Formatters.hexWord(0xE000)}-${Formatters.hexWord(0xEFFF)}]`,
                component: this.ramProxy.getInspectable()
            });
        }

        // Add ROM child if available
        if (this.romProxy) {
            children.push({
                id: this.romProxy.id,
                type: 'BusMapping',
                name: `ROM [${Formatters.hexWord(0xFF00)}-${Formatters.hexWord(0xFFFF)}]`,
                component: this.romProxy.getInspectable()
            });
        }

        // I/O region
        children.push({
            id: 'pia',
            type: 'BusMapping',
            name: `PIA [${Formatters.hexWord(0xD010)}-${Formatters.hexWord(0xD013)}]`
        });

        return {
            id: this.id,
            type: this.type,
            name: this.name ?? '',
            ...(self.__address !== undefined && { address: self.__address }),
            ...(self.__addressName !== undefined && { addressName: self.__addressName }),
            state: {
                mappingCount: 4, // RAM, RAM-EXT, ROM, PIA
                sorted: true,
                backend: 'WASM'
            },
            stats: {
                cacheHitRate: 'N/A', // WASM bus doesn't expose cache stats yet
                cacheAccesses: 0,
                cacheHits: 0
            },
            children,
            // Backward compatibility - flat properties
            mappingCount: 4,
            sorted: true,
            cacheSize: 0,
            cacheHitRate: 0
        };
    }

    /**
     * Debug output (compatible with TypeScript Bus)
     */
    toDebug(): { [key: string]: string } {
        const result: { [key: string]: string } = {};

        // Memory address mappings
        result['RAM'] = `[${Formatters.hex(0x0000, 4)}]:[${Formatters.hex(0x0FFF, 4)}]`;
        result['PIA'] = `[${Formatters.hex(0xD010, 4)}]:[${Formatters.hex(0xD013, 4)}]`;
        result['RAM-EXT'] = `[${Formatters.hex(0xE000, 4)}]:[${Formatters.hex(0xEFFF, 4)}]`;
        result['ROM'] = `[${Formatters.hex(0xFF00, 4)}]:[${Formatters.hex(0xFFFF, 4)}]`;

        // Backend info
        result['BACKEND'] = 'WASM';

        return result;
    }

    // ============ Direct Access to WASM Bus ============

    /**
     * Get the underlying WASM Bus instance
     */
    getWasmInstance(): WasmBus {
        return this.wasmBus;
    }

    /**
     * Get mapping info from WASM bus
     */
    getMappingInfo(): string {
        return this.wasmBus.get_mapping_info();
    }
}
