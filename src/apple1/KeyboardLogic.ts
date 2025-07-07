import { IoWriter, WireOptions } from '@/core/@types/IoLogic';
import PIA6820 from '../core/PIA6820';
import * as utils from '../core/utils';

const RESET_CODE = -255;

class KeyboardLogic implements IoWriter {
    private pia: PIA6820;
    private wireResetCallback: (() => void) | undefined;

    constructor(pia: PIA6820) {
        this.pia = pia;
    }

    async write(char: number): Promise<void> {
        if (char === RESET_CODE) {
            this.reset();
        } else {
            // Ensure CRA bit 2 is set to access Output Register A
            const cra = this.pia.read(1); // Read current CRA
            if (!(cra & 0x04)) {
                this.pia.write(1, cra | 0x04); // Set bit 2 to access ORA
            }
            
            // PA7 is always ON (+5v), so set it regardless of the input
            this.pia.write(0, utils.bitSet(char, 7)); // Write to ORA

            // Keyboard Strobe - pulse CA1 on key pressed
            // When CA1 is raised, PIA will raise CTRL A bit 7
            // First ensure CA1 is low
            this.pia.setCA1(false);
            // Then raise it to trigger the edge
            this.pia.setCA1(true);
            // In real hardware, CA1 would go low when key is released
            // Return CA1 to low to complete the pulse
            this.pia.setCA1(false);
        }
    }

    wire({ reset }: WireOptions): void {
        this.wireResetCallback = reset ?? undefined;
    }

    reset(): void {
        this.wireResetCallback?.();
    }
}

export default KeyboardLogic;
