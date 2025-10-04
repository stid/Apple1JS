/**
 * WASM ROM Proxy
 *
 * Wraps WASM ROM implementation while providing the same interface
 * as the TypeScript ROM class. This enables WASM linear memory to be
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
import { Formatters } from '../utils/formatters';
import type { ROM as WasmROM } from '../wasm/apple1_cpu_wasm';

/**
 * ROM state interface (compatible with TypeScript ROM)
 */
interface ROMState extends StateBase {
    /** Memory contents as byte array */
    data: number[];
    /** Size of the memory bank */
    size: number;
    /** Component identification */
    componentId: string;
    /** Whether ROM has been initialized */
    initialized: boolean;
}

/**
 * Proxy class that delegates to WASM ROM
 */
export class WasmROMProxy implements IoAddressable, IInspectableComponent, IVersionedStatefulComponent<ROMState> {
    private static readonly STATE_VERSION = '2.0';

    id = 'rom';
    type = 'ROM';
    name?: string;

    private wasmRom: WasmROM;
    private memoryBuffer: Uint8Array | null = null;

    get children() {
        return [];
    }

    constructor(wasmRom: WasmROM) {
        this.wasmRom = wasmRom;
        this.updateMemoryBuffer();
    }

    /**
     * Update the direct memory buffer view
     * This provides zero-copy access to WASM linear memory
     */
    private updateMemoryBuffer(): void {
        try {
            const ptr = this.wasmRom.get_memory_ptr();
            const len = this.wasmRom.get_memory_len();

            if (ptr && len) {
                // Create Uint8Array view directly into WASM memory
                // @ts-expect-error - WASM memory is available on the module
                const wasmMemory = this.wasmRom.__wbg_get_memory?.() || null;
                if (wasmMemory) {
                    this.memoryBuffer = new Uint8Array(wasmMemory.buffer, ptr, len);
                }
            }
        } catch (error) {
            loggingService.warn('WasmROMProxy', `Failed to create direct memory view: ${error}`);
        }
    }

    // ============ IoAddressable Implementation ============

    read(address: number): number {
        if (address < 0 || address >= this.wasmRom.get_size()) {
            loggingService.error('WasmROMProxy', `Invalid read address ${address}`);
            return 0;
        }
        return this.wasmRom.read(address);
    }

    write(address: number, value: number): void {
        const hexAddr = `0x${Formatters.hex(address, 0)}`;
        const hexValue = `0x${Formatters.hex(value, 0)}`;
        loggingService.warn('WasmROMProxy',
            `Attempt to write ${hexValue} to read-only memory at address ${hexAddr}`);
    }

    flash(data: Array<number>): void {
        if (!Array.isArray(data) || data.length < 2) {
            loggingService.error('WasmROMProxy', 'Flash data must be an array with at least 2 bytes');
            return;
        }

        // Convert to Uint8Array for WASM
        const dataArray = new Uint8Array(data);

        try {
            this.wasmRom.flash(dataArray);
            loggingService.info('WasmROMProxy', `Flashed ${data.length - 2} bytes to ROM`);

            // Update memory buffer view
            this.updateMemoryBuffer();
        } catch (error) {
            loggingService.error('WasmROMProxy', `Failed to flash ROM: ${error}`);
        }
    }

    burn(data: Array<number>): void {
        this.flash(data);
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
            size: this.wasmRom.get_size(),
            state: {
                size: this.wasmRom.get_size() + ' bytes',
                readOnly: true,
                initialized: this.wasmRom.is_initialized(),
                backend: 'WASM'
            }
        };
    }

    get details() {
        const self = this as WithBusMetadata<typeof this>;
        return {
            size: this.wasmRom.get_size(),
            address: self.__address,
            addressName: self.__addressName,
            backend: 'WASM'
        };
    }

    // ============ IVersionedStatefulComponent Implementation ============

    saveState(options?: StateOptions): ROMState {
        const opts = { includeDebugInfo: false, ...options };

        // Get data from WASM
        const data = Array.from(this.wasmRom.get_data());

        const state: ROMState = {
            version: WasmROMProxy.STATE_VERSION,
            data,
            size: this.wasmRom.get_size(),
            componentId: this.id,
            initialized: this.wasmRom.is_initialized()
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

    loadState(state: ROMState, options?: StateOptions): void {
        const opts = { validate: true, migrate: true, ...options };

        if (opts.validate) {
            const validation = this.validateState(state);
            if (!validation.valid) {
                throw new Error(`Invalid ROM state: ${validation.errors.join(', ')}`);
            }
        }

        // Handle version migration if needed
        let finalState = state;
        if (opts.migrate && state.version && state.version !== WasmROMProxy.STATE_VERSION) {
            finalState = this.migrateState(state, state.version);
        }

        // Validate size compatibility
        if (finalState.data.length !== this.wasmRom.get_size()) {
            throw new Error(
                `ROM size mismatch: expected ${this.wasmRom.get_size()}, got ${finalState.data.length}`
            );
        }

        // Reset ROM first
        this.wasmRom.reset();

        // Flash with data (needs address header)
        if (finalState.initialized && finalState.data.length > 0) {
            // Create flash data with address header (0xFF00 for WOZ Monitor)
            const flashData = new Uint8Array(finalState.data.length + 2);
            flashData[0] = 0x00; // Low address
            flashData[1] = 0xFF; // High address
            flashData.set(finalState.data, 2);

            try {
                this.wasmRom.flash(flashData);
            } catch (error) {
                loggingService.error('WasmROMProxy', `Failed to load ROM state: ${error}`);
            }
        }

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

        if (typeof s.initialized !== 'boolean') {
            errors.push('initialized must be a boolean');
        }

        // Version checking
        if (s.version && typeof s.version !== 'string') {
            warnings.push('version should be a string');
        }

        return { valid: errors.length === 0, errors, warnings };
    }

    resetState(): void {
        this.wasmRom.reset();
        this.updateMemoryBuffer();
    }

    getStateVersion(): string {
        return WasmROMProxy.STATE_VERSION;
    }

    migrateState(oldState: unknown, fromVersion: string): ROMState {
        const migratedState = { ...(oldState as Record<string, unknown>) };

        // Migration from version 1.0 to 2.0
        if (fromVersion === '1.0') {
            if (!migratedState.size && Array.isArray(migratedState.data)) {
                migratedState.size = migratedState.data.length;
            }
            if (!migratedState.componentId) {
                migratedState.componentId = 'rom';
            }
            if (migratedState.initialized === undefined) {
                migratedState.initialized = Array.isArray(migratedState.data) && migratedState.data.length > 0;
            }
            migratedState.version = WasmROMProxy.STATE_VERSION;
        }

        return migratedState as unknown as ROMState;
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
        return this.wasmRom.get_memory_slice(start, length);
    }

    /**
     * Get the underlying WASM ROM instance
     */
    getWasmInstance(): WasmROM {
        return this.wasmRom;
    }
}
