import PIA6820 from '../core/PIA6820';
const RESET_CODE = -255;
import { IoLogic, WireOptions } from '../core/@types/IoLogic';

// DSP b6..b0 are outputs, b7 is input
//     CB2 goes low when data is written, returns high when CB1 goes high
class DisplayLogic implements IoLogic {
    private pia: PIA6820;
    private wireReset?: () => void;
    private wireWrite?: (value: number) => Promise<number | string | void>;

    constructor(pia: PIA6820) {
        this.pia = pia;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async read(_address: number): Promise<void> {
        // Not imFplemented
        return;
    }

    async write(char: number): Promise<void> {
        if (char == RESET_CODE) {
            this.wireReset?.();
            return;
        }
        // CB2 is wired to PB7 - arise on display busy
        this.pia.setBitDataB(7);
        await this.wireWrite?.(char);
        this.pia.clearBitDataB(7);
    }

    wire({ reset, write }: WireOptions): void {
        this.wireReset = reset;
        this.wireWrite = write;
    }

    reset(): void {
        this.wireReset?.();
    }
}

export default DisplayLogic;
