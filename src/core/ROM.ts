const DEFAULT_ROM_SIZE = 256;
import { IInspectableComponent } from './@types/IInspectableComponent';
import { IoAddressable } from './@types/IoAddressable';

class ROM implements IoAddressable, IInspectableComponent {
    id = 'rom';
    type = 'ROM';
    get children() {
        return [];
    }
    private data: Uint8Array;

    constructor(byteSize: number = DEFAULT_ROM_SIZE) {
        this.data = new Uint8Array(byteSize).fill(0);
    }

    read(address: number): number {
        if (address < 0 || address >= this.data.length) {
            console.error(`ROM: Invalid read address ${address}`);
            return 0;
        }

        return this.data[address];
    }

    write(address: number, value: number): void {
        console.warn(`ROM: Attempt to write ${value} to read-only memory at address ${address}`);
    }

    flash(data: Array<number>): void {
        if (data.length - 2 > this.data.length) {
            console.error('ROM: Data size exceeds ROM capacity');
            return;
        }

        this.data.set(data.slice(2, this.data.length), 0);
    }

    burn(data: Array<number>): void {
        this.flash(data);
    }
}

export default ROM;
