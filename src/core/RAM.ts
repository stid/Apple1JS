import { IInspectableComponent, InspectableData, WithBusMetadata, IoAddressable } from './types';
import { loggingService } from '../services/LoggingService';
import { DEFAULT_RAM_BANK_SIZE, MIN_BYTE_VALUE, MAX_BYTE_VALUE, BYTE_MASK } from './constants/memory';
import { IVersionedStatefulComponent, StateValidationResult, StateOptions, StateError, StateBase } from './types';

/**
 * RAM state interface
 */
interface RAMState extends StateBase {
    /** Memory contents as byte array */
    data: number[];
    /** Size of the memory bank */
    size: number;
    /** Component identification */
    componentId: string;
}

class RAM implements IoAddressable, IInspectableComponent, IVersionedStatefulComponent<RAMState> {
    /**
     * Current state version for RAM component
     */
    private static readonly STATE_VERSION = '2.0';

    /**
     * Returns a serializable copy of the RAM contents.
     */
    saveState(options?: StateOptions): RAMState {
        const opts = { includeDebugInfo: false, ...options };
        
        const state: RAMState = {
            version: RAM.STATE_VERSION,
            data: Array.from(this.data),
            size: this.data.length,
            componentId: this.id
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
     * Restores RAM contents from a previously saved state.
     */
    loadState(state: RAMState, options?: StateOptions): void {
        const opts = { validate: true, migrate: true, ...options };
        
        if (opts.validate) {
            const validation = this.validateState(state);
            if (!validation.valid) {
                throw new StateError(
                    `Invalid RAM state: ${validation.errors.join(', ')}`, 
                    'RAM', 
                    'load'
                );
            }
        }

        // Handle version migration if needed
        let finalState = state;
        if (opts.migrate && state.version && state.version !== RAM.STATE_VERSION) {
            finalState = this.migrateState(state, state.version);
        }

        // Validate size compatibility
        if (finalState.data.length !== this.data.length) {
            throw new StateError(
                `RAM size mismatch: expected ${this.data.length}, got ${finalState.data.length}`,
                'RAM',
                'load'
            );
        }

        this.data.set(finalState.data);
    }
    id = 'ram';
    type = 'RAM';
    name?: string;
    get children() {
        return [];
    }

    /**
     * Returns a serializable architecture view of the RAM, suitable for inspectors.
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
                initialized: true
            }
        };
    }
    private data: Uint8Array;
    get details() {
        // Use optional chaining and unknown type for safer, typed access
        const self = this as WithBusMetadata<typeof this>;
        return {
            size: this.data.length,
            address: self.__address,
            addressName: self.__addressName,
        };
    }
    constructor(byteSize: number = DEFAULT_RAM_BANK_SIZE) {
        this.data = new Uint8Array(byteSize);
    }

    /**
     * Validate a RAM state object
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

        // Version checking
        if (s.version && typeof s.version !== 'string') {
            warnings.push('version should be a string');
        }

        return { valid: errors.length === 0, errors, warnings };
    }

    /**
     * Reset RAM to initial state (all zeros)
     */
    resetState(): void {
        this.data.fill(0);
    }

    /**
     * Get the current state version
     */
    getStateVersion(): string {
        return RAM.STATE_VERSION;
    }

    /**
     * Migrate state from older versions
     */
    migrateState(oldState: unknown, fromVersion: string): RAMState {
        const migratedState = { ...(oldState as Record<string, unknown>) };

        // Migration from version 1.0 to 2.0
        if (fromVersion === '1.0') {
            // Version 1.0 only had { data: number[] }
            if (!migratedState.size && Array.isArray(migratedState.data)) {
                migratedState.size = migratedState.data.length;
            }
            if (!migratedState.componentId) {
                migratedState.componentId = 'ram';
            }
            migratedState.version = RAM.STATE_VERSION;
        }

        return migratedState as unknown as RAMState;
    }

    /**
     * Get supported state versions for migration
     */
    getSupportedVersions(): string[] {
        return ['1.0', '2.0'];
    }

    read(address: number): number {
        if (address < 0 || address >= this.data.length) {
            loggingService.warn('RAM', `Invalid read address ${address} (size: ${this.data.length})`);
            return 0;
        }
        return this.data[address];
    }

    write(address: number, value: number): void {
        if (address < 0 || address >= this.data.length) {
            loggingService.warn('RAM', `Invalid write address ${address} (size: ${this.data.length})`);
            return;
        }
        if (value < MIN_BYTE_VALUE || value > MAX_BYTE_VALUE) {
            loggingService.info('RAM', `Value ${value} masked to 8-bit: ${value & BYTE_MASK}`);
            value = value & BYTE_MASK;
        }
        this.data[address] = value;
    }

    flash(data: Array<number>): void {
        if (!Array.isArray(data) || data.length < 2) {
            loggingService.error('RAM', 'Flash data must be an array with at least 2 bytes (address header)');
            return;
        }

        const [highAddr, lowAddr, ...coreData] = data;

        if (typeof highAddr !== 'number' || typeof lowAddr !== 'number') {
            loggingService.error('RAM', 'Address bytes must be numbers');
            return;
        }

        if (coreData.length > this.data.length) {
            loggingService.error('RAM', `Flash data too large (${coreData.length} bytes > ${this.data.length} bytes)`);
            return;
        }

        const prgAddr: number = highAddr | (lowAddr << 8);

        if (prgAddr < 0 || prgAddr >= this.data.length) {
            loggingService.error('RAM', `Flash address out of bounds: ${prgAddr}`);
            return;
        }

        if (prgAddr + coreData.length > this.data.length) {
            loggingService.error('RAM', `Flash data would write outside bounds (addr: ${prgAddr}, len: ${coreData.length})`);
            return;
        }

        // Validate and mask data values to 8-bit
        const validatedData = coreData.map((byte, index) => {
            if (typeof byte !== 'number') {
                loggingService.warn('RAM', `Non-numeric data at index ${index}, using 0`);
                return 0;
            }
            const masked = byte & BYTE_MASK;
            if (byte !== masked) {
                loggingService.info('RAM', `Data byte ${byte} masked to ${masked}`);
            }
            return masked;
        });

        const coreDataTyped = new Uint8Array(validatedData);
        this.data.set(coreDataTyped, prgAddr);
        loggingService.info('RAM', `Flashed ${coreData.length} bytes to address ${prgAddr}`);
    }
}

export default RAM;
