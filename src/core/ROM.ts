import { IInspectableComponent } from './@types/IInspectableComponent';
import { InspectableData } from './@types/InspectableTypes';
import { WithBusMetadata } from './@types/BusComponent';
import { IoAddressable } from './@types/IoAddressable';
import { loggingService } from '../services/LoggingService';
import { DEFAULT_ROM_SIZE, MIN_BYTE_VALUE, BYTE_MASK } from './constants/memory';
import { IVersionedStatefulComponent, StateValidationResult, StateOptions, StateError, StateBase } from './types';

/**
 * ROM state interface
 * Note: ROM is typically read-only after initialization, so state mainly tracks initialization data
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

class ROM implements IoAddressable, IInspectableComponent, IVersionedStatefulComponent<ROMState> {
    id = 'rom';
    type = 'ROM';
    name?: string;
    get children() {
        return [];
    }

    /**
     * Returns a serializable architecture view of the ROM, suitable for inspectors.
     */
    getInspectable(): InspectableData {
        const self = this as WithBusMetadata<typeof this>;
        return {
            id: this.id,
            type: this.type,
            name: this.name ?? '',
            ...(self.__address !== undefined && { address: self.__address }),
            ...(self.__addressName !== undefined && { addressName: self.__addressName }),
            size: this.data.length,
            state: {
                size: this.data.length + ' bytes',
                readOnly: true
            }
        };
    }
    private data: Uint8Array;
    private _initialized = false;

    /**
     * Current state version for ROM component
     */
    private static readonly STATE_VERSION = '2.0';

    get details() {
        return {
            size: this.data.length,
            address: (this as unknown as { __address?: string }).__address,
            addressName: (this as unknown as { __addressName?: string }).__addressName,
        };
    }

    constructor(byteSize: number = DEFAULT_ROM_SIZE) {
        this.data = new Uint8Array(byteSize).fill(MIN_BYTE_VALUE);
    }

    /**
     * Save ROM state - mainly for system snapshots
     */
    saveState(options?: StateOptions): ROMState {
        const opts = { includeDebugInfo: false, ...options };
        
        const state: ROMState = {
            version: ROM.STATE_VERSION,
            data: Array.from(this.data),
            size: this.data.length,
            componentId: this.id,
            initialized: this._initialized
        };

        if (opts.includeDebugInfo) {
            Object.assign(state, {
                metadata: {
                    timestamp: Date.now(),
                    componentId: this.id,
                    type: this.type,
                    name: this.name
                }
            });
        }

        return state;
    }

    /**
     * Load ROM state - recreates ROM contents
     */
    loadState(state: ROMState, options?: StateOptions): void {
        const opts = { validate: true, migrate: true, ...options };
        
        if (opts.validate) {
            const validation = this.validateState(state);
            if (!validation.valid) {
                throw new StateError(
                    `Invalid ROM state: ${validation.errors.join(', ')}`, 
                    'ROM', 
                    'load'
                );
            }
        }

        // Handle version migration if needed
        let finalState = state;
        if (opts.migrate && state.version && state.version !== ROM.STATE_VERSION) {
            finalState = this.migrateState(state, state.version);
        }

        // Validate size compatibility
        if (finalState.data.length !== this.data.length) {
            throw new StateError(
                `ROM size mismatch: expected ${this.data.length}, got ${finalState.data.length}`,
                'ROM',
                'load'
            );
        }

        this.data.set(finalState.data);
        this._initialized = finalState.initialized;
    }

    /**
     * Validate a ROM state object
     */
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
                errors.push(`Invalid byte values at indices: ${invalidIndices.slice(0, 5).join(', ')}${invalidIndices.length > 5 ? '...' : ''}`);
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

    /**
     * Reset ROM to initial state (all minimum values)
     */
    resetState(): void {
        this.data.fill(MIN_BYTE_VALUE);
        this._initialized = false;
    }

    /**
     * Get the current state version
     */
    getStateVersion(): string {
        return ROM.STATE_VERSION;
    }

    /**
     * Migrate state from older versions
     */
    migrateState(oldState: unknown, fromVersion: string): ROMState {
        const migratedState = { ...(oldState as Record<string, unknown>) };

        // Migration from version 1.0 to 2.0
        if (fromVersion === '1.0') {
            // Version 1.0 might not have had these fields
            if (!migratedState.size && Array.isArray(migratedState.data)) {
                migratedState.size = migratedState.data.length;
            }
            if (!migratedState.componentId) {
                migratedState.componentId = 'rom';
            }
            if (migratedState.initialized === undefined) {
                migratedState.initialized = Array.isArray(migratedState.data) && migratedState.data.length > 0;
            }
            migratedState.version = ROM.STATE_VERSION;
        }

        return migratedState as unknown as ROMState;
    }

    /**
     * Get supported state versions for migration
     */
    getSupportedVersions(): string[] {
        return ['1.0', '2.0'];
    }

    read(address: number): number {
        if (address < 0 || address >= this.data.length) {
            loggingService.error('ROM', `Invalid read address ${address}`);
            return 0;
        }

        return this.data[address];
    }

    write(address: number, value: number): void {
        const hexAddr = `0x${address.toString(16).toUpperCase()}`;
        const hexValue = `0x${value.toString(16).toUpperCase()}`;
        loggingService.warn('ROM', `Attempt to write ${hexValue} to read-only memory at address ${hexAddr}`);
    }

    flash(data: Array<number>): void {
        if (!Array.isArray(data) || data.length < 2) {
            loggingService.error('ROM', 'Flash data must be an array with at least 2 bytes (address header)');
            return;
        }

        const [highAddr, lowAddr, ...coreData] = data;

        if (typeof highAddr !== 'number' || typeof lowAddr !== 'number') {
            loggingService.error('ROM', 'Address bytes must be numbers');
            return;
        }

        if (coreData.length > this.data.length) {
            loggingService.error('ROM', `Flash data too large (${coreData.length} bytes > ${this.data.length} bytes)`);
            return;
        }

        // Validate and mask data values to 8-bit
        const validatedData = coreData.map((byte, index) => {
            if (typeof byte !== 'number') {
                loggingService.warn('ROM', `Non-numeric data at index ${index}, using 0`);
                return 0;
            }
            const masked = byte & BYTE_MASK;
            if (byte !== masked) {
                loggingService.info('ROM', `Data byte ${byte} masked to ${masked}`);
            }
            return masked;
        });

        this.data.set(validatedData, 0);
        this._initialized = true;
        loggingService.info('ROM', `Flashed ${coreData.length} bytes to ROM`);
    }

    burn(data: Array<number>): void {
        this.flash(data);
    }
}

export default ROM;
