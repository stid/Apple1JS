import PIA6820 from '../core/PIA6820';
const RESET_CODE = -255;
import { IoWriter, WireOptions } from '../core/@types/IoLogic';

// DSP b6..b0 are outputs, b7 is input
//     CB2 goes low when data is written, returns high when CB1 goes high
class DisplayLogic implements IoWriter {
    private pia: PIA6820;
    private wireReset?: () => void;
    private wireWrite?: (value: number) => Promise<number | string | void>;

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
        
        // Ensure CRB bit 2 is set to access Output Register B
        const crb = this.pia.read(3); // Read current CRB
        if (!(crb & 0x04)) {
            this.pia.write(3, crb | 0x04); // Set bit 2 to access ORB
        }
        
        // Set PB7 to indicate display is busy
        const currentOrb = this.pia.read(2);
        this.pia.write(2, currentOrb | 0x80); // Set bit 7
        
        await this.wireWrite?.(char);
        
        // Clear PB7 to indicate display is ready
        // In real hardware, this would take ~500 microseconds
        const updatedOrb = this.pia.read(2);
        this.pia.write(2, updatedOrb & 0x7F); // Clear bit 7
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
