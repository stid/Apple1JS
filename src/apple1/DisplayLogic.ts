import PIA6820 from '../core/PIA6820';
const RESET_CODE = -255;
import { IoWriter, WireOptions } from '../core/types';

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
        
        // Set PB7 to indicate display is busy (hardware-controlled input pin)
        this.pia.setPB7DisplayStatus(true);

        try {
            await this.wireWrite?.(char);
        } finally {
            // Clear PB7 to indicate display is ready — even when the video sink
            // rejects. PIA6820.write does not await this call, so a rejection
            // that skipped the clear would leave PB7 busy and strand the
            // monitor's ECHO loop until the next reset.
            //
            // Known deviation (hardware-accuracy audit, finding 13): on real
            // hardware the busy line is held for one video field (~16.7ms) of
            // machine time. Here it is held for as long as the write takes on
            // the host. Pacing it from emulated cycles was tried and reverted:
            // the Clock only exposes the cycle count at chunk boundaries —
            // never mid-chunk, and on the WASM engine it cannot be read
            // mid-execution at all — so a cycle deadline quantises the display
            // to the chunk rate and makes echo stutter. Host pacing is the
            // lesser inaccuracy.
            this.pia.setPB7DisplayStatus(false);
        }
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
