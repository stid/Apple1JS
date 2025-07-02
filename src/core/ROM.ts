const DEFAULT_ROM_SIZE = 256;
import { IInspectableComponent } from './@types/IInspectableComponent';
import { IoAddressable } from './@types/IoAddressable';
import { loggingService } from '../services/LoggingService';

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
    getInspectable() {
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
        return {
            size: this.data.length,
            address: (this as unknown as { __address?: string }).__address,
            addressName: (this as unknown as { __addressName?: string }).__addressName,
        };
    }

    constructor(byteSize: number = DEFAULT_ROM_SIZE) {
        this.data = new Uint8Array(byteSize).fill(0);
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
        if (data.length - 2 > this.data.length) {
            loggingService.error('ROM', 'Data size exceeds ROM capacity');
            return;
        }

        this.data.set(data.slice(2, this.data.length), 0);
    }

    burn(data: Array<number>): void {
        this.flash(data);
    }
}

export default ROM;
