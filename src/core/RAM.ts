import { IInspectableComponent } from './@types/IInspectableComponent';
import { IoAddressable } from './@types/IoAddressable';
import { loggingService } from '../services/LoggingService';

const DEFAULT_RAM_BANK_SIZE = 4096;
class RAM implements IoAddressable, IInspectableComponent {
    /**
     * Returns a serializable copy of the RAM contents.
     */
    saveState(): { data: number[] } {
        return {
            data: Array.from(this.data),
        };
    }

    /**
     * Restores RAM contents from a previously saved state.
     */
    loadState(state: { data: number[] }): void {
        if (!state || !Array.isArray(state.data) || state.data.length !== this.data.length) {
            throw new Error('Invalid RAM state or size mismatch');
        }
        this.data.set(state.data);
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
    getInspectable() {
        // Always include address info if present
        const self = this as unknown as { __address?: string; __addressName?: string };
        return {
            id: this.id,
            type: this.type,
            name: this.name,
            size: this.data.length,
            address: self.__address,
            addressName: self.__addressName,
        };
    }
    private data: Uint8Array;
    get details() {
        // Use optional chaining and unknown type for safer, typed access
        const self = this as unknown as { __address?: string; __addressName?: string };
        return {
            size: this.data.length,
            address: self.__address,
            addressName: self.__addressName,
        };
    }
    constructor(byteSize: number = DEFAULT_RAM_BANK_SIZE) {
        this.data = new Uint8Array(byteSize);
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
        if (value < 0 || value > 255) {
            loggingService.info('RAM', `Value ${value} masked to 8-bit: ${value & 0xFF}`);
            value = value & 0xFF;
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
            const masked = byte & 0xFF;
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
