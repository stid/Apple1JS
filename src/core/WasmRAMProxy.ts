/**
 * WASM RAM Proxy
 *
 * Wraps WASM RAM implementation while providing the same interface
 * as the TypeScript RAM class. This enables WASM linear memory to be
 * the single source of truth while maintaining compatibility with
 * existing code.
 */

import type {
    IInspectableComponent,
    InspectableData,
    WithBusMetadata,
    IoAddressable,
    IVersionedStatefulComponent,
    StateValidationResult,
    StateOptions,
    StateBase
} from './types';
import { loggingService } from '../services/LoggingService';
import type { RAM as WasmRAM } from '../wasm/apple1_cpu_wasm';

/**
 * RAM state interface (compatible with TypeScript RAM)
 */
interface RAMState extends StateBase {
    /** Memory contents as byte array */
    data: number[];
    /** Size of the memory bank */
    size: number;
    /** Component identification */
    componentId: string;
}

/**
 * Proxy class that delegates to WASM RAM
 */
export class WasmRAMProxy implements IoAddressable, IInspectableComponent, IVersionedStatefulComponent<RAMState> {
    private static readonly STATE_VERSION = '2.0';

    id = 'ram';
    type = 'RAM';
    name?: string;

    private wasmRam: WasmRAM;
    private memoryBuffer: Uint8Array | null = null;

    get children() {
        return [];
    }

    constructor(wasmRam: WasmRAM) {
        this.wasmRam = wasmRam;
        this.updateMemoryBuffer();
    }

    /**
     * Update the direct memory buffer view
     * This provides zero-copy access to WASM linear memory
     */
    private updateMemoryBuffer(): void {
        try {
            const ptr = this.wasmRam.get_memory_ptr();
            const len = this.wasmRam.get_memory_len();

            if (ptr && len) {
                // Create Uint8Array view directly into WASM memory
                // @ts-expect-error - WASM memory is available on the module
                const wasmMemory = this.wasmRam.__wbg_get_memory?.() || null;
                if (wasmMemory) {
                    this.memoryBuffer = new Uint8Array(wasmMemory.buffer, ptr, len);
                }
            }
        } catch (error) {
            loggingService.warn('WasmRAMProxy', `Failed to create direct memory view: ${error}`);
        }
    }

    // ============ IoAddressable Implementation ============

    read(address: number): number {
        if (address < 0 || address >= this.wasmRam.get_size()) {
            loggingService.warn('WasmRAMProxy', `Invalid read address ${address}`);
            return 0;
        }
        return this.wasmRam.read(address);
    }

    write(address: number, value: number): void {
        if (address < 0 || address >= this.wasmRam.get_size()) {
            loggingService.warn('WasmRAMProxy', `Invalid write address ${address}`);
            return;
        }

        // Mask to 8-bit if needed
        if (value < 0 || value > 255) {
            value = value & 0xFF;
        }

        this.wasmRam.write(address, value);
    }

    flash(data: Array<number>): void {
        if (!Array.isArray(data) || data.length < 2) {
            loggingService.error('WasmRAMProxy', 'Flash data must be an array with at least 2 bytes');
            return;
        }

        const [highAddr, lowAddr, ...coreData] = data;
        const prgAddr: number = highAddr | (lowAddr << 8);

        if (prgAddr < 0 || prgAddr >= this.wasmRam.get_size()) {
            loggingService.error('WasmRAMProxy', `Flash address out of bounds: ${prgAddr}`);
            return;
        }

        if (prgAddr + coreData.length > this.wasmRam.get_size()) {
            loggingService.error('WasmRAMProxy',
                `Flash data would write outside bounds (addr: ${prgAddr}, len: ${coreData.length})`);
            return;
        }

        // Load data into WASM RAM
        const dataArray = new Uint8Array(coreData);
        this.wasmRam.load(prgAddr, dataArray);

        loggingService.info('WasmRAMProxy', `Flashed ${coreData.length} bytes to address ${prgAddr}`);
    }

    // ============ IInspectableComponent Implementation ============

    getInspectable(): InspectableData {
        const self = this as WithBusMetadata<typeof this>;
        return {
            id: this.id,
            type: this.type,
            name: this.name ?? '',
            ...(self.__address !== undefined && { address: self.__address }),
            ...(self.__addressName !== undefined && { addressName: self.__addressName }),
            size: this.wasmRam.get_size(),
            state: {
                size: this.wasmRam.get_size() + ' bytes',
                initialized: true,
                backend: 'WASM'
            }
        };
    }

    get details() {
        const self = this as WithBusMetadata<typeof this>;
        return {
            size: this.wasmRam.get_size(),
            address: self.__address,
            addressName: self.__addressName,
            backend: 'WASM'
        };
    }

    // ============ IVersionedStatefulComponent Implementation ============

    saveState(options?: StateOptions): RAMState {
        const opts = { includeDebugInfo: false, ...options };

        // Get data from WASM
        const data = Array.from(this.wasmRam.get_data());

        const state: RAMState = {
            version: WasmRAMProxy.STATE_VERSION,
            data,
            size: this.wasmRam.get_size(),
            componentId: this.id
        };

        if (opts.includeDebugInfo) {
            Object.assign(state, {
                metadata: {
                    timestamp: Date.now(),
                    componentId: this.id,
                    type: this.type,
                    name: this.name,
                    backend: 'WASM'
                }
            });
        }

        return state;
    }

    loadState(state: RAMState, options?: StateOptions): void {
        const opts = { validate: true, migrate: true, ...options };

        if (opts.validate) {
            const validation = this.validateState(state);
            if (!validation.valid) {
                throw new Error(`Invalid RAM state: ${validation.errors.join(', ')}`);
            }
        }

        // Handle version migration if needed
        let finalState = state;
        if (opts.migrate && state.version && state.version !== WasmRAMProxy.STATE_VERSION) {
            finalState = this.migrateState(state, state.version);
        }

        // Validate size compatibility
        if (finalState.data.length !== this.wasmRam.get_size()) {
            throw new Error(
                `RAM size mismatch: expected ${this.wasmRam.get_size()}, got ${finalState.data.length}`
            );
        }

        // Load into WASM RAM
        const dataArray = new Uint8Array(finalState.data);
        this.wasmRam.set_data(dataArray);

        // Update memory buffer view
        this.updateMemoryBuffer();
    }

    validateState(state: unknown): StateValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!state || typeof state !== 'object') {
            errors.push('State must be an object');
            return { valid: false, errors, warnings };
        }

        const s = state as Record<string, unknown>;

        // Required fields
        if (!Array.isArray(s.data)) {
            errors.push('data must be an array');
        } else {
            // Validate data array
            const invalidIndices = s.data
                .map((value, index) => ({ value, index }))
                .filter(({ value }) => typeof value !== 'number' || value < 0 || value > 255)
                .map(({ index }) => index);

            if (invalidIndices.length > 0) {
                errors.push(`Invalid byte values at indices: ${invalidIndices.slice(0, 5).join(', ')}`);
            }
        }

        if (typeof s.size !== 'number' || s.size <= 0) {
            errors.push('size must be a positive number');
        }

        if (typeof s.componentId !== 'string') {
            errors.push('componentId must be a string');
        }

        // Version checking
        if (s.version && typeof s.version !== 'string') {
            warnings.push('version should be a string');
        }

        return { valid: errors.length === 0, errors, warnings };
    }

    resetState(): void {
        this.wasmRam.clear();
        this.updateMemoryBuffer();
    }

    getStateVersion(): string {
        return WasmRAMProxy.STATE_VERSION;
    }

    migrateState(oldState: unknown, fromVersion: string): RAMState {
        const migratedState = { ...(oldState as Record<string, unknown>) };

        // Migration from version 1.0 to 2.0
        if (fromVersion === '1.0') {
            if (!migratedState.size && Array.isArray(migratedState.data)) {
                migratedState.size = migratedState.data.length;
            }
            if (!migratedState.componentId) {
                migratedState.componentId = 'ram';
            }
            migratedState.version = WasmRAMProxy.STATE_VERSION;
        }

        return migratedState as unknown as RAMState;
    }

    getSupportedVersions(): string[] {
        return ['1.0', '2.0'];
    }

    // ============ Direct Memory Access for Bulk Operations ============

    /**
     * Get direct access to memory buffer for bulk operations
     * This is zero-copy and very fast!
     */
    getDirectMemory(): Uint8Array | null {
        return this.memoryBuffer;
    }

    /**
     * Read a range of memory efficiently
     */
    readRange(start: number, length: number): Uint8Array {
        return this.wasmRam.get_memory_slice(start, length);
    }

    /**
     * Get the underlying WASM RAM instance
     */
    getWasmInstance(): WasmRAM {
        return this.wasmRam;
    }
}
