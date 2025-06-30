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

    async read(): Promise<void> {
        // Not implemented
        return;
    }

    /**
     * Handles a character write to the display.
     * Sets PB7 (display busy) before write, clears PB7 (display ready) after write.
     * This handshake is essential for correct emulation: if PB7 is left set after a state restore,
     * the emulated code may wait forever for the display to become ready. Always clear PB7 after restore.
     */
    async write(char: number): Promise<void> {
        if (char == RESET_CODE) {
            this.wireReset?.();
            return;
        }
        // CB2 is wired to PB7 - set PB7 to indicate display is busy
        this.pia.setBitDataB(7);
        await this.wireWrite?.(char);
        // Clear PB7 to indicate display is ready
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
