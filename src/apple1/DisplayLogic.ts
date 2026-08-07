import PIA6820 from '../core/PIA6820';
const RESET_CODE = -255;
import { IoWriter, WireOptions } from '../core/types';
import { DISPLAY_FIELD_CYCLES } from './constants/system';

// DSP b6..b0 are outputs, b7 is input
//     CB2 goes low when data is written, returns high when CB1 goes high
class DisplayLogic implements IoWriter {
    private pia: PIA6820;
    private wireReset: (() => void) | undefined;
    private wireWrite: ((value: number) => Promise<number | string | void>) | undefined;

    constructor(pia: PIA6820) {
        this.pia = pia;
    }

    /**
     * Handles a character write to the display.
     * Sets PB7 (display busy) before write, clears PB7 (display ready) after write.
     * This handshake is essential for correct emulation: if PB7 is left set after a state restore,
     * the emulated code may wait forever for the display to become ready. Always clear PB7 after restore.
     * 
     * Note: In the real Apple 1, the display takes ~500 microseconds to process a character.
     * The WOZ Monitor ECHO routine ($FFEF) polls PB7 in a tight loop waiting for it to clear.
     * This emulation clears PB7 immediately after the display write completes.
     */
    async write(char: number): Promise<void> {
        if (char == RESET_CODE) {
            this.wireReset?.();
            return;
        }
        
        // Hold the busy line for the emulated time one character takes to
        // reach the screen — a full video field. It expires on CPU cycles, so
        // the handshake does not drift with host speed or event-loop timing.
        this.pia.setPB7BusyForCycles(DISPLAY_FIELD_CYCLES);

        await this.wireWrite?.(char);
    }

    wire({ reset, write }: WireOptions): void {
        this.wireReset = reset ?? undefined;
        this.wireWrite = write ?? undefined;
    }

    reset(): void {
        this.wireReset?.();
    }
}

export default DisplayLogic;
