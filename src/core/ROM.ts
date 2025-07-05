import { IInspectableComponent } from './@types/IInspectableComponent';
import { InspectableData } from './@types/InspectableTypes';
import { WithBusMetadata } from './@types/BusComponent';
import { IoAddressable } from './@types/IoAddressable';
import { loggingService } from '../services/LoggingService';
import { DEFAULT_ROM_SIZE, MIN_BYTE_VALUE, BYTE_MASK } from './constants/memory';

class ROM implements IoAddressable, IInspectableComponent {
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
            name: this.name,
            address: self.__address,
            addressName: self.__addressName,
            size: this.data.length,
            state: {
                size: this.data.length + ' bytes',
                readOnly: true
            }
        };
    }
    private data: Uint8Array;
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

    read(address: number): number {
        if (address < 0 || address >= this.data.length) {
            loggingService.error('ROM', `Invalid read address ${address}`);
            return 0;
        }

        return this.data[address];
    }

    write(address: number, value: number): void {
        loggingService.warn('ROM', `Attempt to write ${value} to read-only memory at address ${address}`);
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
        loggingService.info('ROM', `Flashed ${coreData.length} bytes to ROM`);
    }

    burn(data: Array<number>): void {
        this.flash(data);
    }
}

export default ROM;
